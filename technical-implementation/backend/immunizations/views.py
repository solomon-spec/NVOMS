from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from immunizations.models import (
    ImmunizationEvent,
    PatientDiseaseSchedule,
    PatientVaccinationSchedule,
    ScheduleStatusEvent,
)
from immunizations.serializers import (
    DiseaseDueDateInputSerializer,
    ImmunizationHistorySummarySerializer,
    ImmunizationEventCreateSerializer,
    ImmunizationEventSerializer,
    PatientDiseaseScheduleSerializer,
    ScheduleSlotSerializer,
    ScheduleSlotStatusUpdateSerializer,
)
from immunizations.services import apply_outcome_to_disease_schedule, ensure_patient_disease_schedules
from notifications.services import send_overdue_vaccination_alert
from patients.models import Patient
from users.permissions import IsHealthWorker
from vaccines.models import EpiScheduleVersion


class PatientScheduleListView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)
        slots = (
            PatientVaccinationSchedule.objects
            .filter(patient=patient)
            .select_related('vaccine', 'schedule_rule')
            .order_by('due_date')
        )
        return Response(ScheduleSlotSerializer(slots, many=True).data)


class PatientDiseaseScheduleListView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)
        ensure_patient_disease_schedules(patient)
        schedules = patient.disease_schedules.order_by('disease')
        return Response(PatientDiseaseScheduleSerializer(schedules, many=True).data)

    def put(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)
        payload = request.data
        if isinstance(payload, list):
            payload = {'disease_due_dates': payload}
        serializer = DiseaseDueDateInputSerializer(data=payload.get('disease_due_dates', []), many=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ensure_patient_disease_schedules(patient)
        for item in serializer.validated_data:
            schedule = patient.disease_schedules.get(disease=item['disease'])
            is_complete = item.get('is_complete', False)
            schedule.current_due_date = None if is_complete else item.get('due_date')
            schedule.is_complete = is_complete
            schedule.completed_at = timezone.now() if is_complete else None
            schedule.status = (
                PatientDiseaseSchedule.DiseaseStatus.COMPLETED
                if is_complete
                else item.get('status', PatientDiseaseSchedule.DiseaseStatus.SCHEDULED)
            )
            schedule.status_reason = item.get('status_reason')
            schedule.save()

        schedules = patient.disease_schedules.order_by('disease')
        return Response(PatientDiseaseScheduleSerializer(schedules, many=True).data)


class PatientScheduleRegenerateView(APIView):
    permission_classes = [IsHealthWorker]

    def post(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)

        active_version = (
            EpiScheduleVersion.objects
            .filter(status=EpiScheduleVersion.Status.ACTIVE)
            .order_by('-effective_from')
            .first()
        )
        if not active_version:
            return Response(
                {'error': 'No active EPI schedule version found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rules = (
            active_version.rules
            .filter(is_active=True)
            .select_related('vaccine')
        )

        dob = patient.date_of_birth
        created_count = 0
        for rule in rules:
            due_date = dob + timedelta(days=rule.recommended_age_days)
            _, created = PatientVaccinationSchedule.objects.get_or_create(
                patient=patient,
                schedule_rule=rule,
                defaults={'vaccine': rule.vaccine, 'due_date': due_date},
            )
            if created:
                created_count += 1

        slots = (
            PatientVaccinationSchedule.objects
            .filter(patient=patient)
            .select_related('vaccine', 'schedule_rule')
            .order_by('due_date')
        )
        return Response({
            'created': created_count,
            'schedule': ScheduleSlotSerializer(slots, many=True).data,
        })


class PatientScheduleSlotDetailView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request, pk, slot_id):
        patient = get_object_or_404(Patient, pk=pk)
        slot = get_object_or_404(PatientVaccinationSchedule, pk=slot_id, patient=patient)
        return Response(ScheduleSlotSerializer(slot).data)

    def put(self, request, pk, slot_id):
        patient = get_object_or_404(Patient, pk=pk)
        slot = get_object_or_404(PatientVaccinationSchedule, pk=slot_id, patient=patient)
        old_status = slot.status
        serializer = ScheduleSlotStatusUpdateSerializer(slot, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(status_changed_at=timezone.now())
        if slot.status != old_status:
            ScheduleStatusEvent.objects.create(
                schedule_slot=slot,
                from_status=old_status,
                to_status=slot.status,
                changed_by=request.user,
                reason=request.data.get('status_reason'),
            )
            if slot.status == PatientVaccinationSchedule.SlotStatus.OVERDUE:
                send_overdue_vaccination_alert(slot)
        return Response(ScheduleSlotSerializer(slot).data)


class PatientDoseListView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)
        events = (
            ImmunizationEvent.objects
            .filter(patient=patient)
            .select_related('vaccine', 'vaccine_batch', 'facility')
            .order_by('-administered_at')
        )
        return Response(ImmunizationEventSerializer(events, many=True).data)

    def post(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)
        serializer = ImmunizationEventCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        event = serializer.save(patient=patient, administered_by=request.user)
        self._apply_outcome(event)
        return Response(
            ImmunizationEventSerializer(event).data,
            status=status.HTTP_201_CREATED,
        )

    def _apply_outcome(self, event):
        if event.schedule_slot and event.event_status == ImmunizationEvent.EventStatus.ADMINISTERED:
            event.schedule_slot.status = PatientVaccinationSchedule.SlotStatus.ADMINISTERED
            event.schedule_slot.status_changed_at = timezone.now()
            event.schedule_slot.save(update_fields=['status', 'status_changed_at'])
        apply_outcome_to_disease_schedule(event)


class PatientOutcomeListView(PatientDoseListView):
    """Disease-focused alias for recording vaccination outcomes."""


class PatientVaccinationHistoryView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)
        detail = request.query_params.get('detail') in {'1', 'true', 'yes'}
        events = (
            ImmunizationEvent.objects
            .filter(patient=patient)
            .select_related('vaccine', 'vaccine_batch', 'facility', 'administered_by')
            .order_by('-administered_at')
        )
        serializer_class = ImmunizationEventSerializer if detail else ImmunizationHistorySummarySerializer
        return Response(serializer_class(events, many=True).data)
