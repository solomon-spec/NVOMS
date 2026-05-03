import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class DeviceRegistration(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        DISABLED = 'disabled', 'Disabled'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='device_id'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='devices',
        db_column='user_id',
    )
    device_label = models.CharField(max_length=120)
    platform = models.CharField(max_length=40)
    app_version = models.CharField(max_length=40, null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )

    class Meta:
        db_table = 'device_registrations'

    def __str__(self):
        return f'{self.device_label} ({self.user})'


class SyncBatch(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Submitted'
        PROCESSED = 'processed', 'Processed'
        CONFLICT = 'conflict', 'Conflict'
        REJECTED = 'rejected', 'Rejected'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='sync_batch_id'
    )
    device = models.ForeignKey(
        DeviceRegistration,
        on_delete=models.CASCADE,
        related_name='sync_batches',
        db_column='device_id',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='sync_batches',
        db_column='user_id',
    )
    submitted_at = models.DateTimeField(default=timezone.now)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.SUBMITTED
    )
    record_count = models.IntegerField(default=0)
    conflict_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'sync_batches'

    def __str__(self):
        return f'SyncBatch {self.id} – {self.status}'


class SyncBatchItem(models.Model):
    class EntityType(models.TextChoices):
        PATIENT = 'patient', 'Patient'
        IMMUNIZATION = 'immunization', 'Immunization'
        IMMUNIZATION_EVENT = 'immunization_event', 'Immunization Event'
        SURVEILLANCE_REPORT = 'surveillance_report', 'Surveillance Report'
        CAREGIVER = 'caregiver', 'Caregiver'

    class OperationType(models.TextChoices):
        INSERT = 'insert', 'Insert'
        UPDATE = 'update', 'Update'

    class ItemStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPLIED = 'applied', 'Applied'
        CONFLICT = 'conflict', 'Conflict'
        REJECTED = 'rejected', 'Rejected'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='sync_batch_item_id'
    )
    batch = models.ForeignKey(
        SyncBatch,
        on_delete=models.CASCADE,
        related_name='items',
        db_column='sync_batch_id',
    )
    entity_type = models.CharField(max_length=40, choices=EntityType.choices)
    operation_type = models.CharField(max_length=10, choices=OperationType.choices)
    client_record_id = models.CharField(max_length=120)
    server_record_id = models.UUIDField(null=True, blank=True)
    item_status = models.CharField(
        max_length=10, choices=ItemStatus.choices, default=ItemStatus.PENDING
    )
    conflict_reason = models.TextField(null=True, blank=True)
    payload_checksum = models.CharField(max_length=128, null=True, blank=True)
    payload = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'sync_batch_items'

    def __str__(self):
        return f'{self.entity_type}/{self.client_record_id} – {self.item_status}'
