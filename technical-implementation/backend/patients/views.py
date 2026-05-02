from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import write_audit_log
from core.models import AuditLog
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
        return Response({
            'patient': PatientSerializer(patient).data,
            'immunization_summary': (
                PatientImmunizationStatusSerializer(immunization).data
                if immunization else None
            ),
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

    def patch(self, request, pk):
        caregiver = self._get_caregiver(pk)
        serializer = CaregiverSerializer(caregiver, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
