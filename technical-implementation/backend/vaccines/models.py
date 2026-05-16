import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Antigen(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='antigen_id'
    )
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'antigens'

    def __str__(self):
        return self.name


class VaccineDefinition(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='vaccine_id'
    )
    vaccine_code = models.CharField(max_length=40, unique=True)
    vaccine_name = models.CharField(max_length=120)
    antigen = models.ForeignKey(
        Antigen,
        on_delete=models.PROTECT,
        related_name='vaccines',
        null=True,
        blank=True,
        db_column='antigen_id',
    )
    dose_sequence = models.PositiveIntegerField(null=True, blank=True)
    default_route = models.CharField(max_length=40, null=True, blank=True)
    default_site = models.CharField(max_length=40, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'vaccine_definitions'

    def __str__(self):
        return self.vaccine_name


class EpiScheduleVersion(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        RETIRED = 'retired', 'Retired'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='schedule_version_id'
    )
    version_name = models.CharField(max_length=80, unique=True)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='created_by_user_id',
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'epi_schedule_versions'

    def __str__(self):
        return self.version_name


class EpiScheduleRule(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='schedule_rule_id'
    )
    schedule_version = models.ForeignKey(
        EpiScheduleVersion,
        on_delete=models.CASCADE,
        related_name='rules',
        db_column='schedule_version_id',
    )
    vaccine = models.ForeignKey(
        VaccineDefinition,
        on_delete=models.PROTECT,
        related_name='schedule_rules',
        db_column='vaccine_id',
    )
    dose_label = models.CharField(max_length=60)
    recommended_age_days = models.PositiveIntegerField()
    grace_period_days = models.PositiveIntegerField(default=0)
    defaulter_threshold_days = models.PositiveIntegerField(default=7)
    medical_exception_rule = models.JSONField(null=True, blank=True)
    is_birth_dose = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'epi_schedule_rules'
        unique_together = [('schedule_version', 'vaccine', 'dose_label')]

    def __str__(self):
        return f'{self.vaccine.vaccine_code} – {self.dose_label}'


class VaccineBatch(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='vaccine_batch_id'
    )
    vaccine = models.ForeignKey(
        VaccineDefinition,
        on_delete=models.PROTECT,
        related_name='batches',
        db_column='vaccine_id',
    )
    batch_number = models.CharField(max_length=80, unique=True)
    manufacturer_name = models.CharField(max_length=120, null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    source_system = models.CharField(max_length=80, null=True, blank=True)
    qty_on_hand = models.PositiveIntegerField(default=0)
    is_valid = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'vaccine_batches'

    def __str__(self):
        return self.batch_number


class ScheduleRegenerationJob(models.Model):
    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column='schedule_regeneration_job_id',
    )
    schedule_version = models.ForeignKey(
        EpiScheduleVersion,
        on_delete=models.CASCADE,
        related_name='regeneration_jobs',
        db_column='schedule_version_id',
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='schedule_regeneration_jobs',
        db_column='requested_by_user_id',
    )
    celery_task_id = models.CharField(max_length=160, null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.QUEUED)
    total = models.PositiveIntegerField(default=0)
    processed = models.PositiveIntegerField(default=0)
    failed = models.PositiveIntegerField(default=0)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'schedule_regeneration_jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.schedule_version_id} {self.status} {self.processed}/{self.total}'
