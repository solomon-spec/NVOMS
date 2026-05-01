from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule, ScheduleStatusEvent
from immunizations.serializers import (
    ImmunizationEventCreateSerializer,
    ImmunizationEventSerializer,
    ScheduleSlotSerializer,
    ScheduleSlotStatusUpdateSerializer,
)
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
        return Response(
            ImmunizationEventSerializer(event).data,
            status=status.HTTP_201_CREATED,
        )
