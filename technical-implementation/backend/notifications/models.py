import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    class Type(models.TextChoices):
        WELCOME = 'welcome', 'Welcome'
        VACCINATION_REMINDER = 'vaccination_reminder', 'Vaccination Reminder'
        DEFAULTER_ALERT = 'defaulter_alert', 'Defaulter Alert'
        OUTBREAK_ALERT = 'outbreak_alert', 'Outbreak Alert'
        SURVEILLANCE_REPORT = 'surveillance_report', 'Surveillance Report'
        PASSWORD_RESET = 'password_reset', 'Password Reset'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=40, choices=Type.choices)
    title = models.CharField(max_length=160)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    linked_object_id = models.CharField(max_length=120, null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.recipient_user_id} {self.type} {self.title}'


class SmsLog(models.Model):
    class Status(models.TextChoices):
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_phone = models.CharField(max_length=32)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices)
    sent_at = models.DateTimeField(default=timezone.now)
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'sms_logs'
        ordering = ['-sent_at']

    def __str__(self):
        return f'{self.recipient_phone} {self.status}'
