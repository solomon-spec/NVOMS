from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from offline.models import DeviceRegistration, SyncBatch, SyncBatchItem
from offline.serializers import (
    ConflictResolveSerializer,
    DeviceRegistrationCreateSerializer,
    DeviceRegistrationSerializer,
    SyncBatchItemSerializer,
    SyncBatchSerializer,
    SyncBatchSubmitSerializer,
)
from users.permissions import ADMIN, IsHealthWorker, _role_code


def _is_admin(user):
    return _role_code(user) == ADMIN


def _sync_batches_visible_to(request):
    qs = SyncBatch.objects.select_related('device', 'user').order_by('-submitted_at')
    if _is_admin(request.user):
        user_id = request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs
    return qs.filter(device__user=request.user)


# ── Device Registration ────────────────────────────────────────────────────────

class DeviceListView(APIView):
    """
    GET  /api/v1/offline/devices   – list the current user's registered devices
    POST /api/v1/offline/devices   – register a new device for offline use

    A device must be registered before it can submit sync batches. Device registration
    binds a physical device (mobile phone or tablet) to a health worker's account so
    that offline records can be attributed correctly during synchronisation.
    """
    permission_classes = [IsHealthWorker]

    def get(self, request):
        devices = DeviceRegistration.objects.filter(user=request.user)
        return Response(DeviceRegistrationSerializer(devices, many=True).data)

    def post(self, request):
        serializer = DeviceRegistrationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        device = serializer.save(user=request.user)
        return Response(DeviceRegistrationSerializer(device).data, status=status.HTTP_201_CREATED)


class DeviceDetailView(APIView):
    """
    GET    /api/v1/offline/devices/{id} – get device info and refresh last_seen_at
    DELETE /api/v1/offline/devices/{id} – disable a device (soft-delete)

    Disabling a device prevents it from submitting new sync batches.
    Used when a device is lost or decommissioned.
    """
    permission_classes = [IsHealthWorker]

    def _get_device(self, request, pk):
        return get_object_or_404(DeviceRegistration, pk=pk, user=request.user)

    def get(self, request, pk):
        device = self._get_device(request, pk)
        device.last_seen_at = timezone.now()
        device.save(update_fields=['last_seen_at'])
        return Response(DeviceRegistrationSerializer(device).data)

    def delete(self, request, pk):
        device = self._get_device(request, pk)
        device.status = DeviceRegistration.Status.DISABLED
        device.save(update_fields=['status'])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Sync Batches ───────────────────────────────────────────────────────────────

class SyncBatchSubmitView(APIView):
    """
    POST /api/v1/offline/sync/batches

    Submits a batch of records collected while the device was offline and writes
    them directly to the database. Health workers record immunization events on their
    mobile device when offline, then upload the entire batch when they reconnect.

    Each item is processed individually:
    - immunization inserts → creates an ImmunizationEvent and updates the schedule slot
    - Duplicate detection via local_client_record_id prevents double-recording
    - Items with conflicts (duplicate ID, missing patient/vaccine) require resolution
    - Rejected items have invalid payloads and are skipped

    Returns the full batch summary with per-item status so the client knows which
    records were saved and which need attention.
    """
    permission_classes = [IsHealthWorker]

    def get(self, request):
        batches = _sync_batches_visible_to(request)
        return Response(SyncBatchSerializer(batches, many=True).data)

    def post(self, request):
        serializer = SyncBatchSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        device = get_object_or_404(
            DeviceRegistration,
            pk=data['device_id'],
            user=request.user,
            status=DeviceRegistration.Status.ACTIVE,
        )

        items_data = data['items']
        batch = SyncBatch.objects.create(
            device=device,
            user=request.user,
            record_count=len(items_data),
        )

        conflict_count = 0
        created_items = []

        for raw in items_data:
            result = _process_sync_item(raw, submitted_by=request.user)
            if result['status'] == SyncBatchItem.ItemStatus.CONFLICT:
                conflict_count += 1
            created_items.append(
                SyncBatchItem.objects.create(
                    batch=batch,
                    entity_type=raw['entity_type'],
                    operation_type=raw['operation_type'],
                    client_record_id=raw['client_record_id'],
                    payload_checksum=raw.get('payload_checksum'),
                    payload=raw.get('payload'),
                    item_status=result['status'],
                    server_record_id=result.get('server_record_id'),
                    conflict_reason=result.get('conflict_reason'),
                )
            )

        batch.conflict_count = conflict_count
        batch.status = SyncBatch.Status.CONFLICT if conflict_count > 0 else SyncBatch.Status.PROCESSED
        batch.acknowledged_at = timezone.now()
        batch.save(update_fields=['conflict_count', 'status', 'acknowledged_at'])

        device.last_seen_at = timezone.now()
        device.save(update_fields=['last_seen_at'])

        return Response(
            {
                'batch': SyncBatchSerializer(batch).data,
                'items': SyncBatchItemSerializer(created_items, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


def _process_sync_item(item, submitted_by):
    """
    Dispatches a sync item to the appropriate handler based on entity_type.
    Returns a dict with: status, server_record_id (optional), conflict_reason (optional).
    """
    entity_type = item['entity_type']
    operation_type = item['operation_type']
    payload = item.get('payload') or {}

    if not payload and operation_type == SyncBatchItem.OperationType.UPDATE:
        return {'status': SyncBatchItem.ItemStatus.REJECTED, 'conflict_reason': 'Empty payload for update'}

    if entity_type == SyncBatchItem.EntityType.PATIENT:
        return _apply_patient_upsert(payload, submitted_by, item['client_record_id'])

    if entity_type == SyncBatchItem.EntityType.CAREGIVER:
        return _apply_caregiver_upsert(payload, item['client_record_id'])

    if entity_type == SyncBatchItem.EntityType.SURVEILLANCE_REPORT:
        return _apply_surveillance_report_upsert(payload, submitted_by, item['client_record_id'])

    immunization_types = [
        SyncBatchItem.EntityType.IMMUNIZATION,
        SyncBatchItem.EntityType.IMMUNIZATION_EVENT,
    ]
    if entity_type in immunization_types:
        return _apply_immunization_upsert(payload, submitted_by, item['client_record_id'])

    return {
        'status': SyncBatchItem.ItemStatus.REJECTED,
        'conflict_reason': f'Unsupported entity_type: {entity_type}',
    }


def _serializer_rejected(serializer):
    return {
        'status': SyncBatchItem.ItemStatus.REJECTED,
        'conflict_reason': str(serializer.errors),
    }


def _strip_sync_metadata(payload):
    cleaned = dict(payload)
    for key in ('server_updated_at', 'last_known_updated_at', 'last_synced_at', 'local_client_record_id'):
        cleaned.pop(key, None)
    return cleaned


def _server_snapshot_conflict(instance, payload):
    snapshot_raw = (
        payload.get('server_updated_at')
        or payload.get('last_known_updated_at')
        or payload.get('last_synced_at')
    )
    if not snapshot_raw:
        return False
    snapshot = parse_datetime(str(snapshot_raw))
    if snapshot is None:
        return False
    if timezone.is_naive(snapshot):
        snapshot = timezone.make_aware(snapshot)

    current = getattr(instance, 'updated_at', None) or getattr(instance, 'created_at', None)
    return bool(current and current > snapshot)


def _apply_patient_upsert(payload, submitted_by, client_record_id):
    from patients.models import Caregiver, Patient
    from patients.serializers import PatientCreateSerializer, PatientUpdateSerializer

    payload = dict(payload)
    if 'primary_caregiver_client_record_id' in payload and 'primary_caregiver_id' not in payload:
        caregiver = Caregiver.objects.filter(
            local_client_record_id=payload.pop('primary_caregiver_client_record_id')
        ).first()
        if not caregiver:
            return {
                'status': SyncBatchItem.ItemStatus.REJECTED,
                'conflict_reason': 'Primary caregiver client record was not found',
            }
        payload['primary_caregiver_id'] = caregiver.id

    patient = Patient.objects.filter(local_client_record_id=client_record_id).first()
    if patient:
        if _server_snapshot_conflict(patient, payload):
            return {
                'status': SyncBatchItem.ItemStatus.CONFLICT,
                'conflict_reason': 'Patient changed on the server after the offline snapshot',
            }
        serializer = PatientUpdateSerializer(patient, data=_strip_sync_metadata(payload), partial=True)
        if not serializer.is_valid():
            return _serializer_rejected(serializer)
        patient = serializer.save()
        if not patient.local_client_record_id:
            patient.local_client_record_id = client_record_id
            patient.save(update_fields=['local_client_record_id'])
        return {'status': SyncBatchItem.ItemStatus.APPLIED, 'server_record_id': patient.id}

    serializer = PatientCreateSerializer(data=_strip_sync_metadata(payload))
    if not serializer.is_valid():
        return _serializer_rejected(serializer)
    patient = serializer.save(registered_by=submitted_by)
    patient.local_client_record_id = client_record_id
    patient.save(update_fields=['local_client_record_id'])
    return {'status': SyncBatchItem.ItemStatus.APPLIED, 'server_record_id': patient.id}


def _apply_caregiver_upsert(payload, client_record_id):
    from patients.models import Caregiver
    from patients.serializers import CaregiverSerializer

    payload = dict(payload)
    caregiver = Caregiver.objects.filter(local_client_record_id=client_record_id).first()
    if caregiver:
        if _server_snapshot_conflict(caregiver, payload):
            return {
                'status': SyncBatchItem.ItemStatus.CONFLICT,
                'conflict_reason': 'Caregiver changed on the server after the offline snapshot',
            }
        serializer = CaregiverSerializer(caregiver, data=_strip_sync_metadata(payload), partial=True)
    else:
        create_payload = _strip_sync_metadata(payload)
        create_payload['local_client_record_id'] = client_record_id
        serializer = CaregiverSerializer(data=create_payload)

    if not serializer.is_valid():
        return _serializer_rejected(serializer)
    caregiver = serializer.save()
    return {'status': SyncBatchItem.ItemStatus.APPLIED, 'server_record_id': caregiver.id}


def _apply_surveillance_report_upsert(payload, submitted_by, client_record_id):
    from patients.models import Patient
    from surveillance.models import SurveillanceReport
    from surveillance.serializers import (
        SurveillanceReportCreateSerializer,
        SurveillanceReportUpdateSerializer,
    )

    payload = dict(payload)
    if 'patient_id' in payload and 'patient' not in payload:
        payload['patient'] = payload.pop('patient_id')
    if 'facility_id' in payload and 'facility' not in payload:
        payload['facility'] = payload.pop('facility_id')
    if 'patient_client_record_id' in payload and 'patient' not in payload:
        patient = Patient.objects.filter(
            local_client_record_id=payload.pop('patient_client_record_id')
        ).first()
        if not patient:
            return {
                'status': SyncBatchItem.ItemStatus.REJECTED,
                'conflict_reason': 'Patient client record was not found',
            }
        payload['patient'] = patient.id

    report = SurveillanceReport.objects.filter(local_client_record_id=client_record_id).first()
    if report:
        if _server_snapshot_conflict(report, payload):
            return {
                'status': SyncBatchItem.ItemStatus.CONFLICT,
                'conflict_reason': 'Surveillance report changed on the server after the offline snapshot',
            }
        serializer = SurveillanceReportUpdateSerializer(report, data=_strip_sync_metadata(payload), partial=True)
        if not serializer.is_valid():
            return _serializer_rejected(serializer)
        report = serializer.save()
        return {'status': SyncBatchItem.ItemStatus.APPLIED, 'server_record_id': report.id}

    serializer = SurveillanceReportCreateSerializer(data=_strip_sync_metadata(payload))
    if not serializer.is_valid():
        return _serializer_rejected(serializer)
    report = serializer.save(reported_by=submitted_by, local_client_record_id=client_record_id)
    return {'status': SyncBatchItem.ItemStatus.APPLIED, 'server_record_id': report.id}


def _apply_immunization_upsert(payload, submitted_by, client_record_id):
    """
    Creates a real ImmunizationEvent from a synced offline payload.

    If an ImmunizationEvent with the same local_client_record_id already exists,
    the server row is updated instead of creating a duplicate.
    On success, the linked schedule slot (if provided) is transitioned to 'administered'
    and a ScheduleStatusEvent audit record is written.
    """
    from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule, ScheduleStatusEvent
    from patients.models import Patient
    from users.models import HealthFacility
    from vaccines.models import VaccineBatch, VaccineDefinition

    local_id = payload.get('local_client_record_id') or client_record_id

    # ── Required field validation ──────────────────────────────────────────────
    patient_id = payload.get('patient_id')
    if not patient_id and payload.get('patient_client_record_id'):
        patient = Patient.objects.filter(
            local_client_record_id=payload['patient_client_record_id']
        ).first()
        patient_id = patient.id if patient else None
    vaccine_id = payload.get('vaccine_id')
    administered_at_raw = payload.get('administered_at')

    if not all([patient_id, vaccine_id, administered_at_raw]):
        return {
            'status': SyncBatchItem.ItemStatus.REJECTED,
            'conflict_reason': 'Missing required fields: patient_id, vaccine_id, administered_at',
        }

    administered_at = parse_datetime(str(administered_at_raw))
    if administered_at is None:
        return {
            'status': SyncBatchItem.ItemStatus.REJECTED,
            'conflict_reason': f'Invalid administered_at value: {administered_at_raw}',
        }
    if timezone.is_naive(administered_at):
        administered_at = timezone.make_aware(administered_at)

    # ── Resolve FK lookups ─────────────────────────────────────────────────────
    try:
        patient = Patient.objects.get(pk=patient_id)
    except Patient.DoesNotExist:
        return {'status': SyncBatchItem.ItemStatus.REJECTED, 'conflict_reason': f'Patient {patient_id} not found'}

    try:
        vaccine = VaccineDefinition.objects.get(pk=vaccine_id)
    except VaccineDefinition.DoesNotExist:
        return {'status': SyncBatchItem.ItemStatus.REJECTED, 'conflict_reason': f'Vaccine {vaccine_id} not found'}

    vaccine_batch = None
    if payload.get('vaccine_batch_id'):
        vaccine_batch = VaccineBatch.objects.filter(pk=payload['vaccine_batch_id']).first()

    schedule_slot = None
    if payload.get('schedule_slot_id'):
        schedule_slot = PatientVaccinationSchedule.objects.filter(
            pk=payload['schedule_slot_id'], patient=patient
        ).first()

    facility = None
    if payload.get('facility_id'):
        facility = HealthFacility.objects.filter(pk=payload['facility_id']).first()

    event = ImmunizationEvent.objects.filter(local_client_record_id=local_id).first()
    if event:
        if _server_snapshot_conflict(event, payload):
            return {
                'status': SyncBatchItem.ItemStatus.CONFLICT,
                'conflict_reason': 'Immunization event changed on the server after the offline snapshot',
            }
        event.patient = patient
        event.vaccine = vaccine
        event.vaccine_batch = vaccine_batch
        event.schedule_slot = schedule_slot
        event.administered_by = submitted_by
        event.facility = facility
        event.administered_at = administered_at
        event.administration_route = payload.get('administration_route')
        event.administration_site = payload.get('administration_site')
        event.event_status = payload.get('event_status', ImmunizationEvent.EventStatus.ADMINISTERED)
        event.source_channel = ImmunizationEvent.SourceChannel.SYNCED
        event.notes = payload.get('notes')
        event.save()
    else:
        event = ImmunizationEvent.objects.create(
            patient=patient,
            vaccine=vaccine,
            vaccine_batch=vaccine_batch,
            schedule_slot=schedule_slot,
            administered_by=submitted_by,
            facility=facility,
            administered_at=administered_at,
            administration_route=payload.get('administration_route'),
            administration_site=payload.get('administration_site'),
            event_status=payload.get('event_status', ImmunizationEvent.EventStatus.ADMINISTERED),
            source_channel=ImmunizationEvent.SourceChannel.SYNCED,
            local_client_record_id=local_id,
            notes=payload.get('notes'),
        )

    # ── Transition schedule slot to administered ───────────────────────────────
    if schedule_slot and schedule_slot.status != PatientVaccinationSchedule.SlotStatus.ADMINISTERED:
        old_status = schedule_slot.status
        schedule_slot.status = PatientVaccinationSchedule.SlotStatus.ADMINISTERED
        schedule_slot.status_changed_at = timezone.now()
        schedule_slot.save(update_fields=['status', 'status_changed_at'])
        ScheduleStatusEvent.objects.create(
            schedule_slot=schedule_slot,
            from_status=old_status,
            to_status=PatientVaccinationSchedule.SlotStatus.ADMINISTERED,
            changed_by=submitted_by,
            changed_by_process='offline_sync',
        )

    return {
        'status': SyncBatchItem.ItemStatus.APPLIED,
        'server_record_id': event.id,
    }


class SyncBatchDetailView(APIView):
    """
    GET /api/v1/offline/sync/batches/{id}/

    Returns the current status and summary of a sync batch.
    Clients poll this after submission to check whether all items were applied
    or if conflicts remain that need resolution.
    """
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        batch = get_object_or_404(_sync_batches_visible_to(request), pk=pk)
        return Response(SyncBatchSerializer(batch).data)


class SyncBatchItemListView(APIView):
    """
    GET /api/v1/offline/sync/batches/{id}/items

    Lists all items in a sync batch with their individual status.
    Filter by ?item_status=conflict to quickly locate items needing resolution.
    """
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        batch = get_object_or_404(_sync_batches_visible_to(request), pk=pk)
        qs = batch.items.all()
        item_status = request.query_params.get('item_status')
        if item_status:
            qs = qs.filter(item_status=item_status)
        return Response(SyncBatchItemSerializer(qs, many=True).data)


class SyncBatchItemResolveView(APIView):
    """
    POST /api/v1/offline/sync/batches/{id}/items/{item_id}/resolve

    Resolves a conflicting sync item by choosing either the server version
    (keep_server) or an overriding payload (keep_client).
    When all conflicts in the batch are resolved, the batch status moves to 'processed'.
    """
    permission_classes = [IsHealthWorker]

    def post(self, request, pk, item_id):
        batch = get_object_or_404(_sync_batches_visible_to(request), pk=pk)
        item = get_object_or_404(
            SyncBatchItem,
            pk=item_id,
            batch=batch,
            item_status=SyncBatchItem.ItemStatus.CONFLICT,
        )

        serializer = ConflictResolveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        resolution = serializer.validated_data['resolution']

        if resolution == 'keep_client':
            override = serializer.validated_data.get('override_payload')
            if override:
                # Re-attempt the sync item with the corrected payload.
                result = _process_sync_item(
                    {
                        'entity_type': item.entity_type,
                        'operation_type': item.operation_type,
                        'client_record_id': item.client_record_id,
                        'payload': override,
                    },
                    submitted_by=request.user,
                )
                if result['status'] == SyncBatchItem.ItemStatus.APPLIED:
                    item.server_record_id = result.get('server_record_id')
                    item.payload = override
                else:
                    return Response(
                        {'error': result.get('conflict_reason', 'Could not apply override payload')},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        item.item_status = SyncBatchItem.ItemStatus.APPLIED
        item.conflict_reason = None
        item.save(update_fields=['item_status', 'conflict_reason', 'payload', 'server_record_id'])

        remaining = batch.items.filter(item_status=SyncBatchItem.ItemStatus.CONFLICT).count()
        batch.conflict_count = remaining
        if remaining == 0:
            batch.status = SyncBatch.Status.PROCESSED
        batch.save(update_fields=['conflict_count', 'status'])

        return Response(SyncBatchItemSerializer(item).data)


# ── Sync Config & Reference Data ───────────────────────────────────────────────

class SyncConfigView(APIView):
    """
    GET /api/v1/offline/sync/config

    Returns sync configuration for the mobile client: max batch size, supported
    entity types, recommended sync interval, and server timestamp for clock alignment.
    """
    permission_classes = [IsHealthWorker]

    def get(self, request):
        return Response({
            'max_batch_size': 500,
            'supported_entity_types': SyncBatchItem.EntityType.values,
            'supported_operation_types': SyncBatchItem.OperationType.values,
            'recommended_sync_interval_minutes': 30,
            'server_time': timezone.now().isoformat(),
            'api_version': '1.0',
        })


class SyncReferenceDataView(APIView):
    """
    GET /api/v1/offline/sync/reference-data

    Returns a full snapshot of reference data needed for offline operation:
    active vaccines, antigens, EPI schedule rules, administrative units, and facilities.
    Clients refresh this on each successful sync to stay current.
    Pass ?updated_since=<ISO datetime> to narrow the response (advisory; not yet enforced server-side).
    """
    permission_classes = [IsHealthWorker]

    def get(self, request):
        from geography.models import AdministrativeUnit
        from geography.serializers import AdministrativeUnitSerializer
        from rest_framework import serializers as drf_serializers
        from users.models import HealthFacility
        from vaccines.models import Antigen, EpiScheduleVersion, VaccineDefinition
        from vaccines.serializers import (
            AntigenSerializer,
            EpiScheduleVersionDetailSerializer,
            VaccineSerializer,
        )

        vaccines_qs = VaccineDefinition.objects.filter(is_active=True).select_related('antigen')
        antigens_qs = Antigen.objects.filter(is_active=True)
        units_qs = AdministrativeUnit.objects.filter(is_active=True).select_related('parent')
        facilities_qs = HealthFacility.objects.all()

        active_schedule = (
            EpiScheduleVersion.objects
            .filter(status=EpiScheduleVersion.Status.ACTIVE)
            .prefetch_related('rules__vaccine')
            .order_by('-effective_from')
            .first()
        )

        class _FacilitySerializer(drf_serializers.ModelSerializer):
            class Meta:
                model = HealthFacility
                fields = ['id', 'facility_code', 'facility_name']

        return Response({
            'generated_at': timezone.now().isoformat(),
            'antigens': AntigenSerializer(antigens_qs, many=True).data,
            'vaccines': VaccineSerializer(vaccines_qs, many=True).data,
            'active_epi_schedule': (
                EpiScheduleVersionDetailSerializer(active_schedule).data
                if active_schedule else None
            ),
            'administrative_units': AdministrativeUnitSerializer(units_qs, many=True).data,
            'facilities': _FacilitySerializer(facilities_qs, many=True).data,
        })
