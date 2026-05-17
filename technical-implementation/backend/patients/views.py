from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import write_audit_log
from core.models import AuditLog
from immunizations.serializers import PatientDiseaseScheduleSerializer
from immunizations.services import ensure_patient_disease_schedules
from notifications.models import MessageTemplate, SmsNotification
from patients.models import Caregiver, Patient, PatientImmunizationStatus
from patients.serializers import (
    CaregiverSerializer,
    PatientCreateSerializer,
    PatientImmunizationStatusSerializer,
    PatientSerializer,
    PatientUpdateSerializer,
)
from users.permissions import IsHealthWorker  # grants access to ADMIN and HEALTH_WORKER roles


class PatientListView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request):
        qs = Patient.objects.select_related(
            'primary_caregiver', 'residence_unit', 'registered_facility'
        ).exclude(status=Patient.Status.MERGED)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(uid__icontains=search)
                | Q(first_name__icontains=search)
                | Q(middle_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(primary_caregiver__phone_number__icontains=search)
            )

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        facility = request.query_params.get('facility')
        if facility:
            qs = qs.filter(registered_facility_id=facility)

        serializer = PatientSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PatientCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        patient = serializer.save(registered_by=request.user)
        PatientImmunizationStatus.objects.get_or_create(patient=patient)
        ensure_patient_disease_schedules(patient)
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.PATIENT_CREATE,
            entity_type='patient',
            entity_id=patient.id,
            detail={'uid': patient.uid},
            request=request,
        )

        return Response(PatientSerializer(patient).data, status=status.HTTP_201_CREATED)


class PatientDetailView(APIView):
    permission_classes = [IsHealthWorker]

    def _get_patient(self, pk):
        return get_object_or_404(
            Patient.objects.select_related(
                'primary_caregiver', 'residence_unit', 'registered_facility', 'registered_by'
            ),
            pk=pk,
        )

    def get(self, request, pk):
        patient = self._get_patient(pk)
        return Response(PatientSerializer(patient).data)

    def put(self, request, pk):
        patient = self._get_patient(pk)
        serializer = PatientUpdateSerializer(patient, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(PatientSerializer(patient).data)

    def patch(self, request, pk):
        patient = self._get_patient(pk)
        serializer = PatientUpdateSerializer(patient, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(PatientSerializer(patient).data)

    def delete(self, request, pk):
        patient = self._get_patient(pk)
        patient.status = Patient.Status.INACTIVE
        patient.save(update_fields=['status', 'updated_at'])
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.PATIENT_DELETE,
            entity_type='patient',
            entity_id=patient.id,
            detail={'status': Patient.Status.INACTIVE},
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PatientSummaryView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        patient = get_object_or_404(
            Patient.objects.select_related(
                'primary_caregiver', 'residence_unit', 'registered_facility',
                'registered_by', 'immunization_status',
            ),
            pk=pk,
        )
        immunization = getattr(patient, 'immunization_status', None)
        ensure_patient_disease_schedules(patient)
        return Response({
            'patient': PatientSerializer(patient).data,
            'immunization_summary': (
                PatientImmunizationStatusSerializer(immunization).data
                if immunization else None
            ),
            'disease_schedules': PatientDiseaseScheduleSerializer(
                patient.disease_schedules.order_by('disease'),
                many=True,
            ).data,
        })


class CaregiverListView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request):
        qs = Caregiver.objects.select_related('residence_unit').filter(
            status=Caregiver.Status.ACTIVE
        )

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(phone_number__icontains=search)
            )

        serializer = CaregiverSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CaregiverSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        caregiver = serializer.save()
        return Response(CaregiverSerializer(caregiver).data, status=status.HTTP_201_CREATED)


class CaregiverDetailView(APIView):
    permission_classes = [IsHealthWorker]

    def _get_caregiver(self, pk):
        return get_object_or_404(Caregiver.objects.select_related('residence_unit'), pk=pk)

    def get(self, request, pk):
        return Response(CaregiverSerializer(self._get_caregiver(pk)).data)

    def put(self, request, pk):
        caregiver = self._get_caregiver(pk)
        serializer = CaregiverSerializer(caregiver, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class DefaulterListView(APIView):
    """List patients with overdue or defaulter immunization status."""

    permission_classes = [IsHealthWorker]

    def get(self, request):
        qs = (
            Patient.objects.select_related(
                'primary_caregiver',
                'residence_unit',
                'registered_facility',
                'immunization_status',
            )
            .filter(
                immunization_status__current_status__in=[
                    PatientImmunizationStatus.CurrentStatus.DEFAULTER,
                    PatientImmunizationStatus.CurrentStatus.OVERDUE,
                ]
            )
            .exclude(status__in=[Patient.Status.MERGED, Patient.Status.INACTIVE])
        )

        facility_param = request.query_params.get('facility')
        if facility_param:
            qs = qs.filter(registered_facility_id=facility_param)
        elif request.user.assigned_facility and request.query_params.get('all') != 'true':
            qs = qs.filter(registered_facility=request.user.assigned_facility)

        return Response([
            _defaulter_patient_payload(patient)
            for patient in qs.order_by('first_name')
        ])


class PatientSendReminderView(APIView):
    """Queue a manual SMS reminder to the patient's primary caregiver."""

    permission_classes = [IsHealthWorker]

    def post(self, request, pk):
        patient = get_object_or_404(
            Patient.objects.select_related(
                'primary_caregiver',
                'immunization_status',
                'registered_facility',
            ),
            pk=pk,
        )
        caregiver = patient.primary_caregiver
        facility_name = (
            patient.registered_facility.facility_name
            if patient.registered_facility
            else 'your nearest health facility'
        )
        immunization = getattr(patient, 'immunization_status', None)
        custom_message = request.data.get('message')

        if custom_message:
            message_body = custom_message
        else:
            language = caregiver.preferred_language or 'en'
            template = (
                MessageTemplate.objects.filter(template_code=f'missed_{language}_v1', is_active=True).first()
                or MessageTemplate.objects.filter(template_code='missed_en_v1', is_active=True).first()
            )
            if template:
                next_due = (
                    immunization.next_due_date.isoformat()
                    if immunization and immunization.next_due_date
                    else 'N/A'
                )
                message_body = template.render({
                    'caregiver_name': caregiver.full_name,
                    'patient_name': patient.full_name,
                    'vaccine_name': 'scheduled vaccines',
                    'due_date': next_due,
                    'facility_name': facility_name,
                })
            else:
                message_body = (
                    f'Dear {caregiver.full_name}, {patient.full_name} has missed '
                    f'scheduled vaccinations. Please visit {facility_name}. - NVOMS'
                )

        notification = SmsNotification.objects.create(
            caregiver=caregiver,
            patient=patient,
            notification_type=SmsNotification.NotificationType.MANUAL,
            phone_number=caregiver.phone_number,
            language_code=caregiver.preferred_language or 'en',
            message_body=message_body,
            priority=2,
            status=SmsNotification.DeliveryStatus.QUEUED,
        )

        return Response({
            'notification_id': str(notification.id),
            'phone_number': notification.phone_number,
            'message_body': notification.message_body,
            'status': notification.status,
        }, status=status.HTTP_201_CREATED)


def _defaulter_patient_payload(patient):
    immunization = getattr(patient, 'immunization_status', None)
    caregiver = patient.primary_caregiver
    return {
        'patient_id': str(patient.id),
        'uid': patient.uid,
        'full_name': patient.full_name,
        'date_of_birth': patient.date_of_birth.isoformat(),
        'sex': patient.sex,
        'caregiver_name': caregiver.full_name if caregiver else None,
        'caregiver_phone': caregiver.phone_number if caregiver else None,
        'residence_unit': patient.residence_unit.name if patient.residence_unit else None,
        'facility': patient.registered_facility.facility_name if patient.registered_facility else None,
        'current_status': immunization.current_status if immunization else None,
        'overdue_count': immunization.overdue_count if immunization else 0,
        'next_due_date': (
            immunization.next_due_date.isoformat()
            if immunization and immunization.next_due_date
            else None
        ),
    }

    def patch(self, request, pk):
        caregiver = self._get_caregiver(pk)
        serializer = CaregiverSerializer(caregiver, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
