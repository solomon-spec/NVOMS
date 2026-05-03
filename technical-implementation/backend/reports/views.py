from pathlib import Path
from urllib.parse import unquote, urlparse

from django.conf import settings
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination
from reports.models import GeneratedReport, ReportDefinition
from reports.serializers import GeneratedReportSerializer, ReportQueueSerializer
from users.permissions import IsPublicHealthOfficial

# Canonical report codes — match report_definitions.report_code
REPORT_DEFAULTERS = 'DEFAULTER_LIST'
REPORT_COVERAGE = 'COVERAGE'
REPORT_AEFI = 'AEFI_SURVEILLANCE'

REPORT_DEFINITIONS = {
    REPORT_DEFAULTERS: {
        'report_name': 'Defaulter List Report',
        'report_scope': 'facility',
        'description': 'Lists patients who have missed scheduled vaccinations.',
    },
    REPORT_COVERAGE: {
        'report_name': 'Vaccination Coverage Report',
        'report_scope': 'woreda',
        'description': 'Shows vaccination coverage rates by antigen and area.',
    },
    REPORT_AEFI: {
        'report_name': 'AEFI Surveillance Report',
        'report_scope': 'facility',
        'description': 'Summarises adverse events following immunization.',
    },
}

REPORT_STATUS_ALIASES = {
    'pending': GeneratedReport.GenerationStatus.PROCESSING,
    'processing': GeneratedReport.GenerationStatus.PROCESSING,
    'completed': GeneratedReport.GenerationStatus.COMPLETED,
    'failed': GeneratedReport.GenerationStatus.FAILED,
}


def _get_or_create_definition(report_code):
    meta = REPORT_DEFINITIONS[report_code]
    definition, _ = ReportDefinition.objects.get_or_create(
        report_code=report_code,
        defaults=meta,
    )
    return definition


def _queue_report(request, report_code):
    serializer = ReportQueueSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    definition = _get_or_create_definition(report_code)

    facility = None
    facility_id = data.get('facility_id')
    if facility_id:
        from users.models import HealthFacility
        try:
            facility = HealthFacility.objects.get(pk=facility_id)
        except HealthFacility.DoesNotExist:
            return Response({'facility_id': 'Facility not found.'}, status=status.HTTP_400_BAD_REQUEST)

    unit = None
    unit_id = data.get('unit_id')
    if unit_id:
        from geography.models import AdministrativeUnit
        try:
            unit = AdministrativeUnit.objects.get(pk=unit_id)
        except AdministrativeUnit.DoesNotExist:
            return Response({'unit_id': 'Administrative unit not found.'}, status=status.HTTP_400_BAD_REQUEST)

    parameter_payload = {}
    if data.get('date_from'):
        parameter_payload['date_from'] = str(data['date_from'])
    if data.get('date_to'):
        parameter_payload['date_to'] = str(data['date_to'])

    job = GeneratedReport.objects.create(
        report_definition=definition,
        requested_by=request.user,
        facility=facility,
        unit=unit,
        output_format=data.get('output_format', GeneratedReport.OutputFormat.PDF),
        parameter_payload=parameter_payload or None,
    )
    return Response(
        GeneratedReportSerializer(job, context={'request': request}).data,
        status=status.HTTP_202_ACCEPTED,
    )


def _report_file_path(file_uri):
    parsed = urlparse(file_uri)
    if parsed.scheme == 'file':
        return Path(unquote(parsed.path))
    candidate = Path(file_uri)
    if candidate.is_absolute():
        return candidate
    base_dir = Path(getattr(settings, 'MEDIA_ROOT', settings.BASE_DIR))
    return base_dir / candidate


def _report_content_type(job):
    if job.output_format == GeneratedReport.OutputFormat.CSV:
        return 'text/csv'
    return 'application/pdf'


class ReportListView(APIView):
    """
    GET /api/v1/reports/

    Returns the authenticated user's generated report history, newest first.
    Supports ?status=pending|processing|completed|failed.
    """
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request):
        qs = (
            GeneratedReport.objects
            .filter(requested_by=request.user)
            .select_related('report_definition')
            .order_by('-requested_at')
        )

        status_filter = request.query_params.get('status')
        if status_filter:
            mapped_status = REPORT_STATUS_ALIASES.get(status_filter)
            if mapped_status is None:
                return Response(
                    {
                        'status': (
                            'Unsupported status. Use pending, processing, '
                            'completed, or failed.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(generation_status=mapped_status)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = GeneratedReportSerializer(
            page,
            many=True,
            context={'request': request},
        )
        return paginator.get_paginated_response(serializer.data)


class DefaulterReportView(APIView):
    """
    Queue a defaulter list report.

    Returns patients who have missed one or more scheduled vaccinations within
    the requested facility or administrative unit. Used by health officials to
    target outreach and reduce drop-out rates.
    """
    permission_classes = [IsPublicHealthOfficial]

    def post(self, request):
        return _queue_report(request, REPORT_DEFAULTERS)


class CoverageReportView(APIView):
    """
    Queue a vaccination coverage report.

    Calculates the percentage of the target population that has received each
    antigen dose within the selected period and scope. Used for EPI performance
    monitoring and national reporting to WHO/UNICEF.
    """
    permission_classes = [IsPublicHealthOfficial]

    def post(self, request):
        return _queue_report(request, REPORT_COVERAGE)


class AefiReportView(APIView):
    """
    Queue an AEFI surveillance report.

    Aggregates adverse events following immunization submitted by health workers.
    Used by pharmacovigilance officers to detect safety signals and report to
    national drug regulatory authorities.
    """
    permission_classes = [IsPublicHealthOfficial]

    def post(self, request):
        return _queue_report(request, REPORT_AEFI)


class ReportDownloadView(APIView):
    """
    Download a completed report by job ID.

    Checks generation status and returns the file if completed. Returns 202 if
    still processing or 410 if generation failed. Allows asynchronous report
    polling without keeping an HTTP connection open during generation.
    """
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request, job_id):
        job = get_object_or_404(GeneratedReport, pk=job_id, requested_by=request.user)

        if job.generation_status != GeneratedReport.GenerationStatus.COMPLETED or not job.file_uri:
            raise Http404

        file_path = _report_file_path(job.file_uri)
        if not file_path.exists() or not file_path.is_file():
            raise Http404

        filename = f'{job.report_definition.report_name}.{job.output_format}'
        return FileResponse(
            file_path.open('rb'),
            as_attachment=True,
            filename=filename,
            content_type=_report_content_type(job),
        )
