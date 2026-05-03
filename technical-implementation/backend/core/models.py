import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    class Action(models.TextChoices):
        USER_CREATE = 'user_create', 'User Create'
        USER_UPDATE = 'user_update', 'User Update'
        USER_DEACTIVATE = 'user_deactivate', 'User Deactivate'
        USER_STATUS_UPDATE = 'user_status_update', 'User Status Update'
        ROLE_ASSIGN = 'role_assign', 'Role Assign'
        ACCOUNT_UNLOCK = 'account_unlock', 'Account Unlock'
        PATIENT_CREATE = 'patient_create', 'Patient Create'
        PATIENT_DELETE = 'patient_delete', 'Patient Delete'
        OUTBREAK_ALERT_CONFIRM = 'outbreak_alert_confirm', 'Outbreak Alert Confirm'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=40, choices=Action.choices)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=120)
    detail = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f'{self.action} {self.entity_type}/{self.entity_id}'
