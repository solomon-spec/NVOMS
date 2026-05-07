from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from immunizations.models import ImmunizationEvent
from integrations.dhis2 import sync_immunization_events_to_dhis2
from integrations.fhir import immunization_to_fhir, observation_to_fhir, patient_to_fhir
from integrations.serializers import SyncLogSerializer
from patients.models import Patient
from surveillance.models import SurveillanceReport
from users.permissions import IsAdmin, IsPublicHealthOfficial


class Dhis2SyncView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        log = sync_immunization_events_to_dhis2(triggered_by=request.user)
        return Response(SyncLogSerializer(log).data, status=status.HTTP_202_ACCEPTED)


class FHIRPatientView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request, pk):
        patient = get_object_or_404(Patient, pk=pk)
        return Response(patient_to_fhir(patient), content_type='application/fhir+json')


class FHIRImmunizationView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request, pk):
        event = get_object_or_404(
            ImmunizationEvent.objects.select_related('patient', 'vaccine', 'vaccine_batch'),
            pk=pk,
        )
        return Response(immunization_to_fhir(event), content_type='application/fhir+json')


class FHIRObservationView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request, pk):
        report = get_object_or_404(SurveillanceReport.objects.select_related('patient'), pk=pk)
        return Response(observation_to_fhir(report), content_type='application/fhir+json')
