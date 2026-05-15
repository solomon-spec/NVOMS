"""
Notification services for NVOMS.

send_via_gateway()          – dispatches a single SmsNotification via the Android SMS Gateway
build_reminder_context()    – builds the template substitution dict for a due-today slot
build_missed_context()      – builds the template substitution dict for an overdue slot
create_reminder_notification()    – creates a queued SmsNotification for a due vaccine
create_missed_notification()      – creates a queued SmsNotification for a missed vaccine
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.utils import timezone

from notifications.models import NotificationAttempt, SmsNotification

try:
    import requests
except ImportError:  # pragma: no cover - optional SMS gateway dependency in local demos
    requests = None

logger = logging.getLogger('nvoms.notifications')


def create_notification(**kwargs):
    """Compatibility shim for legacy in-app notification call sites."""
    logger.info('Legacy notification event recorded: %s', kwargs.get('type'))
    return None


def create_notifications_for_roles(role_codes, **kwargs):
    """Compatibility shim until role-targeted in-app notifications are restored."""
    logger.info(
        'Legacy role notification event recorded: roles=%s type=%s',
        role_codes,
        kwargs.get('type'),
    )
    return []


def send_outbreak_confirmed_alert(alert):
    """Compatibility shim for outbreak alert notification hooks."""
    logger.info('Outbreak confirmed alert hook skipped for alert=%s', getattr(alert, 'id', None))
    return None


def send_overdue_vaccination_alert(slot):
    """Compatibility shim for overdue vaccination notification hooks."""
    logger.info('Overdue vaccination alert hook skipped for slot=%s', getattr(slot, 'id', None))
    return None


def send_password_reset_email(user, token):
    """Development placeholder for password reset delivery."""
    logger.info('Password reset token generated for user=%s', getattr(user, 'id', None))
    return None


def send_sms(phone_number, message):
    """Development placeholder for direct SMS delivery."""
    logger.info('SMS delivery placeholder: phone=%s message_length=%d', phone_number, len(message))
    return None

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
    if requests is None:
        logger.warning('SMS gateway dependency requests is not installed.')
        notification.status = SmsNotification.DeliveryStatus.FAILED
        notification.last_error = 'SMS gateway dependency not installed'
        notification.save(update_fields=['status', 'last_error'])
        return False

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
