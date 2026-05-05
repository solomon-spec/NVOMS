import uuid

from django.db import models
from django.utils import timezone


class MessageTemplate(models.Model):
    class Channel(models.TextChoices):
        SMS = 'sms', 'SMS'

    class MessageType(models.TextChoices):
        REMINDER = 'reminder', 'Reminder'
        MISSED_APPOINTMENT = 'missed_appointment', 'Missed Appointment'
        OUTBREAK_WARNING = 'outbreak_warning', 'Outbreak Warning'
        WELCOME = 'welcome', 'Welcome'
        MANUAL = 'manual', 'Manual'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='template_id'
    )
    template_code = models.CharField(max_length=60, unique=True)
    channel = models.CharField(max_length=10, choices=Channel.choices, default=Channel.SMS)
    message_type = models.CharField(max_length=30, choices=MessageType.choices)
    language_code = models.CharField(max_length=12, default='en')
    template_body = models.TextField(
        help_text='Use {placeholders} e.g. {caregiver_name}, {patient_name}, {vaccine_name}, {due_date}, {facility_name}'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'message_templates'

    def __str__(self):
        return self.template_code

    def render(self, context: dict) -> str:
        """Substitute {placeholders} with context values; unknown keys are left as-is."""
        try:
            return self.template_body.format_map(context)
        except (KeyError, ValueError):
            return self.template_body


class SmsNotification(models.Model):
    class NotificationType(models.TextChoices):
        REMINDER = 'reminder', 'Reminder'
        MISSED_APPOINTMENT = 'missed_appointment', 'Missed Appointment'
        OUTBREAK_WARNING = 'outbreak_warning', 'Outbreak Warning'
        WELCOME = 'welcome', 'Welcome'
        MANUAL = 'manual', 'Manual'

    class DeliveryStatus(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        PENDING_RETRY = 'pending_retry', 'Pending Retry'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='sms_notification_id'
    )
    template = models.ForeignKey(
        MessageTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        db_column='template_id',
    )
    caregiver = models.ForeignKey(
        'patients.Caregiver',
        on_delete=models.CASCADE,
        related_name='sms_notifications',
        db_column='caregiver_id',
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sms_notifications',
        db_column='patient_id',
    )
    schedule_slot = models.ForeignKey(
        'immunizations.PatientVaccinationSchedule',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sms_notifications',
        db_column='patient_schedule_id',
    )
    outbreak_alert = models.ForeignKey(
        'surveillance.OutbreakAlert',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sms_notifications',
        db_column='outbreak_alert_id',
    )
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    phone_number = models.CharField(max_length=24)
    language_code = models.CharField(max_length=12, default='en')
    message_body = models.TextField()
    priority = models.SmallIntegerField(default=1)
    status = models.CharField(
        max_length=16,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.QUEUED,
    )
    retry_count = models.IntegerField(default=0)
    last_error = models.TextField(null=True, blank=True)
    gateway_message_id = models.CharField(max_length=120, null=True, blank=True)
    scheduled_for = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'sms_notifications'
        indexes = [
            models.Index(fields=['status', 'scheduled_for']),
            models.Index(fields=['patient', 'created_at']),
        ]

    def __str__(self):
        return f'{self.notification_type} → {self.phone_number} [{self.status}]'


class NotificationAttempt(models.Model):
    class AttemptStatus(models.TextChoices):
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        FAILED = 'failed', 'Failed'
        RETRYING = 'retrying', 'Retrying'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='notification_attempt_id'
    )
    notification = models.ForeignKey(
        SmsNotification,
        on_delete=models.CASCADE,
        related_name='attempts',
        db_column='sms_notification_id',
    )
    attempt_number = models.IntegerField()
    attempted_at = models.DateTimeField(default=timezone.now)
    gateway_status_code = models.CharField(max_length=40, null=True, blank=True)
    gateway_response = models.TextField(null=True, blank=True)
    attempt_status = models.CharField(max_length=12, choices=AttemptStatus.choices)

    class Meta:
        db_table = 'notification_attempts'

    def __str__(self):
        return f'Attempt {self.attempt_number} for {self.notification_id} [{self.attempt_status}]'
