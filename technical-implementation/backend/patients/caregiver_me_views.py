from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule
from immunizations.serializers import ImmunizationEventSerializer, ScheduleSlotSerializer
from patients.models import Caregiver, Patient
from patients.serializers import PatientSerializer
from users.permissions import IsCaregiverUser


def _caregiver_for_user(user):
    return get_object_or_404(Caregiver, user_account=user)


class CaregiverMePatientsView(APIView):
    """
    GET /api/v1/caregivers/me/patients

    Returns all patients whose primary_caregiver is the authenticated caregiver.
    Allows a registered caregiver to see the immunization records of all children
    linked to them without requiring a health worker to act as intermediary.
    """
    permission_classes = [IsCaregiverUser]

    def get(self, request):
        caregiver = _caregiver_for_user(request.user)
        patients = (
            Patient.objects
            .filter(primary_caregiver=caregiver)
            .select_related('residence_unit', 'registered_facility', 'immunization_status')
            .exclude(status=Patient.Status.MERGED)
        )
        return Response(PatientSerializer(patients, many=True).data)


class CaregiverMePatientScheduleView(APIView):
    """
    GET /api/v1/caregivers/me/patients/{patient_id}/schedule

    Returns the vaccination schedule for one of the caregiver's patients.
    Enforces that the patient belongs to the authenticated caregiver so that
    caregivers cannot query schedules of unrelated patients.
    """
    permission_classes = [IsCaregiverUser]

    def get(self, request, patient_id):
        caregiver = _caregiver_for_user(request.user)
        patient = get_object_or_404(Patient, pk=patient_id, primary_caregiver=caregiver)
        slots = (
            PatientVaccinationSchedule.objects
            .filter(patient=patient)
            .select_related('vaccine', 'schedule_rule')
            .order_by('due_date')
        )
        return Response(ScheduleSlotSerializer(slots, many=True).data)


class CaregiverMePatientDosesView(APIView):
    """
    GET /api/v1/caregivers/me/patients/{patient_id}/doses

    Returns the full immunization history for one of the caregiver's patients.
    Used to verify which vaccines have already been administered and which are still pending.
    """
    permission_classes = [IsCaregiverUser]

    def get(self, request, patient_id):
        caregiver = _caregiver_for_user(request.user)
        patient = get_object_or_404(Patient, pk=patient_id, primary_caregiver=caregiver)
        events = (
            ImmunizationEvent.objects
            .filter(patient=patient)
            .select_related('vaccine', 'vaccine_batch', 'facility')
            .order_by('-administered_at')
        )
        return Response(ImmunizationEventSerializer(events, many=True).data)
