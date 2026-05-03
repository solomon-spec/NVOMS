import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class SyncLog(models.Model):
    class IntegrationType(models.TextChoices):
        DHIS2 = 'dhis2', 'DHIS2'
        FHIR = 'fhir', 'FHIR'

    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        PARTIAL = 'partial', 'Partial'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='sync_log_id'
    )
    integration_type = models.CharField(max_length=20, choices=IntegrationType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    records_attempted = models.PositiveIntegerField(default=0)
    records_synced = models.PositiveIntegerField(default=0)
    errors = models.JSONField(default=list, blank=True)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='integration_sync_logs',
        db_column='triggered_by_user_id',
    )
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'integration_sync_logs'
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.integration_type} {self.status} {self.records_synced}/{self.records_attempted}'
