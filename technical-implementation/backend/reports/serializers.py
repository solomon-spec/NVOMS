from django.urls import reverse
from rest_framework import serializers

from reports.models import GeneratedReport, ReportDefinition


class ReportQueueSerializer(serializers.Serializer):
    output_format = serializers.ChoiceField(
        choices=GeneratedReport.OutputFormat.choices,
        default=GeneratedReport.OutputFormat.PDF,
        required=False,
    )
    facility_id = serializers.UUIDField(required=False, allow_null=True)
    unit_id = serializers.UUIDField(required=False, allow_null=True)
    date_from = serializers.DateField(required=False, allow_null=True)
    date_to = serializers.DateField(required=False, allow_null=True)


class GeneratedReportSerializer(serializers.ModelSerializer):
    report_code = serializers.CharField(source='report_definition.report_code', read_only=True)
    report_name = serializers.CharField(source='report_definition.report_name', read_only=True)
    status = serializers.CharField(source='generation_status', read_only=True)
    download_url = serializers.SerializerMethodField()

    def get_download_url(self, obj):
        if obj.generation_status != GeneratedReport.GenerationStatus.COMPLETED or not obj.file_uri:
            return None
        request = self.context.get('request')
        path = reverse('report-download', kwargs={'job_id': obj.id})
        return request.build_absolute_uri(path) if request else path

    class Meta:
        model = GeneratedReport
        fields = [
            'id', 'report_code', 'report_name',
            'output_format', 'generation_status', 'status',
            'parameter_payload', 'file_uri',
            'download_url', 'requested_at', 'completed_at',
        ]
        read_only_fields = fields
