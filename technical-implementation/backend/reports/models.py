import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class ReportDefinition(models.Model):
    class Scope(models.TextChoices):
        FACILITY = 'facility', 'Facility'
        WOREDA = 'woreda', 'Woreda'
        REGION = 'region', 'Region'
        NATIONAL = 'national', 'National'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='report_definition_id'
    )
    report_code = models.CharField(max_length=60, unique=True)
    report_name = models.CharField(max_length=160)
    report_scope = models.CharField(max_length=10, choices=Scope.choices)
    definition_spec = models.JSONField(null=True, blank=True)
    default_parameters = models.JSONField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'report_definitions'

    def __str__(self):
        return self.report_name


class GeneratedReport(models.Model):
    class OutputFormat(models.TextChoices):
        PDF = 'pdf', 'PDF'
        CSV = 'csv', 'CSV'

    class GenerationStatus(models.TextChoices):
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='generated_report_id'
    )
    report_definition = models.ForeignKey(
        ReportDefinition,
        on_delete=models.PROTECT,
        related_name='generated_reports',
        db_column='report_definition_id',
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_reports',
        db_column='requested_by_user_id',
    )
    facility = models.ForeignKey(
        'users.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports',
        db_column='facility_id',
    )
    unit = models.ForeignKey(
        'geography.AdministrativeUnit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports',
        db_column='unit_id',
    )
    output_format = models.CharField(
        max_length=4, choices=OutputFormat.choices, default=OutputFormat.PDF
    )
    generation_status = models.CharField(
        max_length=12,
        choices=GenerationStatus.choices,
        default=GenerationStatus.PROCESSING,
    )
    parameter_payload = models.JSONField(null=True, blank=True)
    file_uri = models.TextField(null=True, blank=True)
    requested_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'generated_reports'

    def __str__(self):
        return f'{self.report_definition.report_code} – {self.generation_status}'
