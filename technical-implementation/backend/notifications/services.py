"""
Notification services for NVOMS.

send_via_gateway()          – dispatches a single SmsNotification via the Android SMS Gateway
build_reminder_context()    – builds the template substitution dict for a due-today slot
build_missed_context()      – builds the template substitution dict for an overdue slot
create_reminder_notification()    – creates a queued SmsNotification for a due vaccine
create_missed_notification()      – creates a queued SmsNotification for a missed vaccine
"""

import logging
import smtplib

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from notifications.models import NotificationAttempt, SmsNotification

logger = logging.getLogger('nvoms.notifications')


def send_sms(phone_number: str, message: str) -> bool:
    """
    Fire-and-forget SMS via the Android SMS Gateway without creating a DB record.
    Used for transactional messages (e.g. password reset) where no caregiver FK exists.
    """
    gateway_url = getattr(settings, 'SMS_GATEWAY_URL', None)
    login = getattr(settings, 'SMS_GATEWAY_LOGIN', None)
    password = getattr(settings, 'SMS_GATEWAY_PASSWORD', None)

    if not all([gateway_url, login, password]):
        logger.warning('send_sms: gateway not configured, skipping SMS to %s', phone_number)
        return False

    try:
        response = requests.post(
            gateway_url,
            json={'message': message, 'phoneNumbers': [phone_number]},
            auth=(login, password),
            timeout=15,
        )
        response.raise_for_status()
        logger.info('send_sms: sent to %s', phone_number)
        return True
    except requests.RequestException as exc:
        logger.error('send_sms: failed for %s – %s', phone_number, exc)
        return False


def send_password_reset_email(user, token: str) -> None:
    """Send a password-reset link to the user's email via Django's email backend."""
    reset_url = getattr(settings, 'PASSWORD_RESET_URL', 'http://localhost:3000/auth/reset-password')
    link = f'{reset_url}?token={token}'
    try:
        send_mail(
            subject='NVOMS – Password Reset Request',
            message=(
                f'Dear {user.full_name},\n\n'
                f'Use the link below to reset your NVOMS password (valid 30 minutes):\n{link}\n\n'
                'If you did not request this, please ignore this email.\n\n– NVOMS'
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@nvoms.local'),
            recipient_list=[user.email],
            fail_silently=False,
        )
    except smtplib.SMTPException as exc:
        logger.error('send_password_reset_email: failed for %s – %s', user.email, exc)

# Default fallback template texts (used when no matching MessageTemplate row exists)
_DEFAULT_REMINDER_EN = (
    "Dear {caregiver_name}, this is a reminder that {patient_name} is due for "
    "{vaccine_name} vaccination TODAY ({due_date}). Please visit your nearest health "
    "facility. - NVOMS"
)
_DEFAULT_MISSED_EN = (
    "Dear {caregiver_name}, {patient_name} has MISSED their {vaccine_name} vaccination "
    "that was due on {due_date}. Please visit your nearest health facility immediately. "
    "- NVOMS"
)


# ── Gateway dispatch ──────────────────────────────────────────────────────────

def send_via_gateway(notification: SmsNotification) -> bool:
    """
    Sends a queued SmsNotification via the Android SMS Gateway REST API.
    Updates notification status to 'sent' or 'failed' and records an attempt.

    Gateway: Android SMS Gateway by capcom6 (https://sms-gate.app)
    API docs: https://sms-gate.app/api/

    Requires settings:
        SMS_GATEWAY_URL      e.g. "https://api.sms-gate.app/3rdparty/v1/message"
        SMS_GATEWAY_LOGIN    your gateway account login
        SMS_GATEWAY_PASSWORD your gateway account password
    """
    gateway_url = getattr(settings, 'SMS_GATEWAY_URL', None)
    login = getattr(settings, 'SMS_GATEWAY_LOGIN', None)
    password = getattr(settings, 'SMS_GATEWAY_PASSWORD', None)

    if not all([gateway_url, login, password]):
        logger.warning(
            'SMS gateway not configured (SMS_GATEWAY_URL/LOGIN/PASSWORD missing). '
            'Notification %s not sent.', notification.id
        )
        notification.status = SmsNotification.DeliveryStatus.FAILED
        notification.last_error = 'SMS gateway not configured'
        notification.save(update_fields=['status', 'last_error'])
        return False

    attempt_number = notification.attempts.count() + 1

    try:
        response = requests.post(
            gateway_url,
            json={
                'message': notification.message_body,
                'phoneNumbers': [notification.phone_number],
            },
            auth=(login, password),
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        # The gateway returns a list of message states; grab the first id
        gateway_id = None
        messages = data if isinstance(data, list) else [data]
        if messages:
            gateway_id = messages[0].get('id') or messages[0].get('messageId')

        notification.status = SmsNotification.DeliveryStatus.SENT
        notification.gateway_message_id = gateway_id
        notification.sent_at = timezone.now()
        notification.last_error = None
        notification.save(update_fields=['status', 'gateway_message_id', 'sent_at', 'last_error'])

        NotificationAttempt.objects.create(
            notification=notification,
            attempt_number=attempt_number,
            gateway_status_code=str(response.status_code),
            gateway_response=response.text[:500],
            attempt_status=NotificationAttempt.AttemptStatus.SENT,
        )
        logger.info('SMS sent: notification=%s phone=%s', notification.id, notification.phone_number)
        return True

    except requests.RequestException as exc:
        error_msg = str(exc)[:500]
        MAX_RETRIES = getattr(settings, 'SMS_MAX_RETRIES', 3)

        notification.retry_count += 1
        notification.last_error = error_msg
        if notification.retry_count >= MAX_RETRIES:
            notification.status = SmsNotification.DeliveryStatus.FAILED
            attempt_status = NotificationAttempt.AttemptStatus.FAILED
        else:
            notification.status = SmsNotification.DeliveryStatus.PENDING_RETRY
            attempt_status = NotificationAttempt.AttemptStatus.RETRYING

        notification.save(update_fields=['status', 'retry_count', 'last_error'])

        NotificationAttempt.objects.create(
            notification=notification,
            attempt_number=attempt_number,
            gateway_response=error_msg,
            attempt_status=attempt_status,
        )
        logger.error(
            'SMS dispatch failed: notification=%s error=%s retry=%d',
            notification.id, error_msg, notification.retry_count,
        )
        return False


# ── Template context builders ─────────────────────────────────────────────────

def build_reminder_context(patient, slot, caregiver) -> dict:
    return {
        'caregiver_name': caregiver.full_name,
        'patient_name': patient.full_name,
        'vaccine_name': slot.vaccine.vaccine_name if slot.vaccine else 'vaccine',
        'due_date': str(slot.due_date),
        'facility_name': (
            patient.registered_facility.facility_name
            if patient.registered_facility else 'your nearest health facility'
        ),
    }


def build_missed_context(patient, slot, caregiver) -> dict:
    return {
        'caregiver_name': caregiver.full_name,
        'patient_name': patient.full_name,
        'vaccine_name': slot.vaccine.vaccine_name if slot.vaccine else 'vaccine',
        'due_date': str(slot.due_date),
        'facility_name': (
            patient.registered_facility.facility_name
            if patient.registered_facility else 'your nearest health facility'
        ),
    }


# ── Notification creators ─────────────────────────────────────────────────────

def _get_template(message_type: str, language_code: str = 'en'):
    """Returns the best matching active MessageTemplate, or None."""
    from notifications.models import MessageTemplate
    return (
        MessageTemplate.objects
        .filter(message_type=message_type, language_code=language_code, is_active=True)
        .first()
        or MessageTemplate.objects
        .filter(message_type=message_type, is_active=True)
        .first()
    )


def create_reminder_notification(patient, slot) -> SmsNotification | None:
    """
    Creates a queued SmsNotification reminding the caregiver that the patient's
    vaccine dose is due today. Returns None if the caregiver has no phone number.
    Skips creation if a reminder for this slot was already sent today.
    """
    caregiver = patient.primary_caregiver
    if not caregiver or not caregiver.phone_number:
        return None

    already_sent = SmsNotification.objects.filter(
        schedule_slot=slot,
        notification_type=SmsNotification.NotificationType.REMINDER,
        created_at__date=timezone.now().date(),
    ).exists()
    if already_sent:
        return None

    lang = caregiver.preferred_language or 'en'
    template = _get_template(SmsNotification.NotificationType.REMINDER, lang)
    context = build_reminder_context(patient, slot, caregiver)

    if template:
        body = template.render(context)
    else:
        body = _DEFAULT_REMINDER_EN.format_map(context)

    return SmsNotification.objects.create(
        caregiver=caregiver,
        patient=patient,
        schedule_slot=slot,
        template=template,
        notification_type=SmsNotification.NotificationType.REMINDER,
        phone_number=caregiver.phone_number,
        language_code=lang,
        message_body=body,
        priority=1,
    )


def create_missed_notification(patient, slot) -> SmsNotification | None:
    """
    Creates a queued SmsNotification alerting the caregiver that the patient has
    missed a scheduled vaccine dose. Returns None if the caregiver has no phone number.
    Skips creation if a missed-appointment alert for this slot was already sent today.
    """
    caregiver = patient.primary_caregiver
    if not caregiver or not caregiver.phone_number:
        return None

    already_sent = SmsNotification.objects.filter(
        schedule_slot=slot,
        notification_type=SmsNotification.NotificationType.MISSED_APPOINTMENT,
        created_at__date=timezone.now().date(),
    ).exists()
    if already_sent:
        return None

    lang = caregiver.preferred_language or 'en'
    template = _get_template(SmsNotification.NotificationType.MISSED_APPOINTMENT, lang)
    context = build_missed_context(patient, slot, caregiver)

    if template:
        body = template.render(context)
    else:
        body = _DEFAULT_MISSED_EN.format_map(context)

    return SmsNotification.objects.create(
        caregiver=caregiver,
        patient=patient,
        schedule_slot=slot,
        template=template,
        notification_type=SmsNotification.NotificationType.MISSED_APPOINTMENT,
        phone_number=caregiver.phone_number,
        language_code=lang,
        message_body=body,
        priority=2,
    )
