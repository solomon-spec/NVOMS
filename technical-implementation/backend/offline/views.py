from django.shortcuts import get_object_or_404
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

    if entity_type == SyncBatchItem.EntityType.IMMUNIZATION:
        if operation_type == SyncBatchItem.OperationType.INSERT:
            return _apply_immunization_insert(payload, submitted_by, item['client_record_id'])
        return {'status': SyncBatchItem.ItemStatus.REJECTED, 'conflict_reason': 'Only insert is supported for immunization'}

    # caregiver, patient, surveillance_report — stub: accepted for future processing
    return {'status': SyncBatchItem.ItemStatus.APPLIED}


def _apply_immunization_insert(payload, submitted_by, client_record_id):
    """
    Creates a real ImmunizationEvent from a synced offline payload.

    Duplicate prevention: if an ImmunizationEvent with the same local_client_record_id
    already exists, the item is marked CONFLICT rather than creating a double record.
    On success, the linked schedule slot (if provided) is transitioned to 'administered'
    and a ScheduleStatusEvent audit record is written.
    """
    from django.utils.dateparse import parse_datetime

    from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule, ScheduleStatusEvent
    from patients.models import Patient
    from users.models import HealthFacility
    from vaccines.models import VaccineBatch, VaccineDefinition

    local_id = payload.get('local_client_record_id') or client_record_id

    # ── Duplicate check ────────────────────────────────────────────────────────
    if local_id and ImmunizationEvent.objects.filter(local_client_record_id=local_id).exists():
        return {
            'status': SyncBatchItem.ItemStatus.CONFLICT,
            'conflict_reason': f'Duplicate local_client_record_id: {local_id}',
        }

    # ── Required field validation ──────────────────────────────────────────────
    patient_id = payload.get('patient_id')
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

    # ── Create the immunization event ──────────────────────────────────────────
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
                # Re-attempt the immunization insert with the corrected payload
                result = _apply_immunization_insert(override, request.user, item.client_record_id)
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
