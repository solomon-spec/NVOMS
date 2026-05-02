from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import write_audit_log
from core.models import AuditLog
from surveillance.models import FollowUpAction, OutbreakAlert, SurveillanceReport
from surveillance.serializers import (
    AlertStatusUpdateSerializer,
    FollowUpActionCreateSerializer,
    FollowUpActionSerializer,
    OutbreakAlertSerializer,
    SurveillanceReportCreateSerializer,
    SurveillanceReportSerializer,
    SurveillanceReportUpdateSerializer,
)
from surveillance.services.followup import assign_follow_up
from surveillance.services.outbreak import transition_alert_status
from users.permissions import IsHealthWorker, IsPublicHealthOfficial


class SurveillanceReportListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsHealthWorker()]

    def get(self, request):
        qs = SurveillanceReport.objects.select_related(
            'patient', 'facility', 'reported_by'
        ).prefetch_related('symptoms').order_by('-created_at')

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(condition_type__icontains=search)
                | Q(disease_suspected__icontains=search)
                | Q(patient__first_name__icontains=search)
            )

        category = request.query_params.get('category')
        if category:
            qs = qs.filter(surveillance_category=category)

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        facility = request.query_params.get('facility')
        if facility:
            qs = qs.filter(facility_id=facility)

        return Response(SurveillanceReportSerializer(qs, many=True).data)

    def post(self, request):
        serializer = SurveillanceReportCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        report = serializer.save(reported_by=request.user)
        return Response(
            SurveillanceReportSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )


class SurveillanceReportDetailView(APIView):
    permission_classes = [IsHealthWorker]

    def _get_report(self, pk):
        return get_object_or_404(
            SurveillanceReport.objects.select_related(
                'patient', 'facility', 'reported_by'
            ).prefetch_related('symptoms'),
            pk=pk,
        )

    def get(self, request, pk):
        return Response(SurveillanceReportSerializer(self._get_report(pk)).data)

    def put(self, request, pk):
        report = self._get_report(pk)
        serializer = SurveillanceReportUpdateSerializer(report, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(SurveillanceReportSerializer(self._get_report(pk)).data)


class FollowUpListView(APIView):
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        report = get_object_or_404(SurveillanceReport, pk=pk)
        follow_ups = report.follow_ups.select_related(
            'assigned_to', 'created_by'
        ).order_by('-created_at')
        return Response(FollowUpActionSerializer(follow_ups, many=True).data)

    def post(self, request, pk):
        report = get_object_or_404(SurveillanceReport, pk=pk)
        serializer = FollowUpActionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        follow_up = assign_follow_up(
            report=report,
            action_taken=serializer.validated_data['action_taken'],
            created_by=request.user,
            assigned_to=serializer.validated_data.get('assigned_to'),
            due_date=serializer.validated_data.get('due_date'),
        )
        return Response(FollowUpActionSerializer(follow_up).data, status=status.HTTP_201_CREATED)


class OutbreakAlertListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = OutbreakAlert.objects.select_related(
            'unit', 'surveillance_report', 'verified_by'
        ).order_by('-triggered_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        unit = request.query_params.get('unit')
        if unit:
            qs = qs.filter(unit_id=unit)

        disease = request.query_params.get('disease')
        if disease:
            qs = qs.filter(disease_code__icontains=disease)

        return Response(OutbreakAlertSerializer(qs, many=True).data)


class OutbreakAlertStatusView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def post(self, request, pk):
        alert = get_object_or_404(OutbreakAlert, pk=pk)
        serializer = AlertStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            updated = transition_alert_status(
                alert=alert,
                new_status=serializer.validated_data['status'],
                verified_by=request.user,
                notes=serializer.validated_data.get('notes'),
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if updated.status == OutbreakAlert.Status.CONFIRMED:
            write_audit_log(
                actor_user=request.user,
                action=AuditLog.Action.OUTBREAK_ALERT_CONFIRM,
                entity_type='outbreak_alert',
                entity_id=updated.id,
                detail={'disease_code': updated.disease_code, 'unit_id': str(updated.unit_id)},
                request=request,
            )
        return Response(OutbreakAlertSerializer(updated).data)
