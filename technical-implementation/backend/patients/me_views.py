from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule
from immunizations.serializers import ImmunizationEventSerializer, ScheduleSlotSerializer
from patients.models import Patient, PatientImmunizationStatus
from patients.serializers import PatientImmunizationStatusSerializer, PatientSerializer
from users.permissions import IsPatientUser


class PatientMeView(APIView):
    """
    GET /api/v1/patients/me/

    Returns the authenticated patient's own registration record and immunization summary.
    Patients log in with a PATIENT-role account linked to their record via user_account.
    """
    permission_classes = [IsPatientUser]

    def get(self, request):
        patient = get_object_or_404(
            Patient.objects.select_related(
                'primary_caregiver', 'residence_unit', 'registered_facility',
                'immunization_status',
            ),
            user_account=request.user,
        )
        immunization = getattr(patient, 'immunization_status', None)
        return Response({
            'patient': PatientSerializer(patient).data,
            'immunization_summary': (
                PatientImmunizationStatusSerializer(immunization).data
                if immunization else None
            ),
        })


class PatientMeScheduleView(APIView):
    """
    GET /api/v1/patients/me/schedule

    Returns the authenticated patient's full vaccination schedule ordered by due date.
    Allows a patient (or their guardian) to check upcoming and past vaccine appointments
    without requiring a health worker login.
    """
    permission_classes = [IsPatientUser]

    def get(self, request):
        patient = get_object_or_404(Patient, user_account=request.user)
        slots = (
            PatientVaccinationSchedule.objects
            .filter(patient=patient)
            .select_related('vaccine', 'schedule_rule')
            .order_by('due_date')
        )
        return Response(ScheduleSlotSerializer(slots, many=True).data)


class PatientMeDosesView(APIView):
    """
    GET /api/v1/patients/me/doses

    Returns the authenticated patient's complete immunization history (all recorded doses),
    newest first. Used to generate a digital immunization card viewable by the patient.
    """
    permission_classes = [IsPatientUser]

    def get(self, request):
        patient = get_object_or_404(Patient, user_account=request.user)
        events = (
            ImmunizationEvent.objects
            .filter(patient=patient)
            .select_related('vaccine', 'vaccine_batch', 'facility')
            .order_by('-administered_at')
        )
        return Response(ImmunizationEventSerializer(events, many=True).data)
