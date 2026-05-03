import logging
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail

from notifications.models import Notification, SmsLog

logger = logging.getLogger(__name__)


def create_notification(*, recipient_user, type, title, body, linked_object_id=None):
    if recipient_user is None:
        return None
    return Notification.objects.create(
        recipient_user=recipient_user,
        type=type,
        title=title,
        body=body,
        linked_object_id=str(linked_object_id) if linked_object_id else None,
    )


def create_notifications_for_roles(*, role_codes, type, title, body, linked_object_id=None):
    from users.models import User

    users = User.objects.filter(role__role_code__in=role_codes, status=User.Status.ACTIVE)
    return [
        create_notification(
            recipient_user=user,
            type=type,
            title=title,
            body=body,
            linked_object_id=linked_object_id,
        )
        for user in users
    ]


def send_sms(recipient_phone, message):
    if not recipient_phone:
        return None

    gateway = settings.SMS_GATEWAY
    status = SmsLog.Status.SENT
    error_message = None

    try:
        if gateway in ('console', 'mock', 'test'):
            logger.info('SMS to %s: %s', recipient_phone, message)
        elif gateway == 'twilio':
            _send_twilio_sms(recipient_phone, message)
        elif gateway in ('africas_talking', 'africastalking'):
            _send_africas_talking_sms(recipient_phone, message)
        else:
            raise ValueError(f'Unsupported SMS_GATEWAY: {gateway}')
    except Exception as exc:
        status = SmsLog.Status.FAILED
        error_message = str(exc)
        logger.warning('SMS delivery failed for %s: %s', recipient_phone, exc)

    return SmsLog.objects.create(
        recipient_phone=recipient_phone,
        message=message,
        status=status,
        error_message=error_message,
    )


def _send_twilio_sms(recipient_phone, message):
    import requests

    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER]):
        raise ValueError('Twilio credentials are not configured.')

    url = (
        f'https://api.twilio.com/2010-04-01/Accounts/'
        f'{settings.TWILIO_ACCOUNT_SID}/Messages.json'
    )
    response = requests.post(
        url,
        data={
            'To': recipient_phone,
            'From': settings.TWILIO_FROM_NUMBER,
            'Body': message,
        },
        auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
        timeout=10,
    )
    response.raise_for_status()


def _send_africas_talking_sms(recipient_phone, message):
    import requests

    if not all([settings.AFRICASTALKING_USERNAME, settings.AFRICASTALKING_API_KEY]):
        raise ValueError("Africa's Talking credentials are not configured.")

    payload = {
        'username': settings.AFRICASTALKING_USERNAME,
        'to': recipient_phone,
        'message': message,
    }
    if settings.AFRICASTALKING_SENDER_ID:
        payload['from'] = settings.AFRICASTALKING_SENDER_ID

    response = requests.post(
        'https://api.africastalking.com/version1/messaging',
        data=payload,
        headers={'apiKey': settings.AFRICASTALKING_API_KEY},
        timeout=10,
    )
    response.raise_for_status()


def send_password_reset_email(user, token):
    if not user.email:
        return
    params = urlencode({'token': token})
    reset_url = f'{settings.PASSWORD_RESET_URL}?{params}'
    send_mail(
        subject='Reset your NVOMS password',
        message=(
            f'Hello {user.full_name},\n\n'
            f'Use this link to reset your NVOMS password: {reset_url}\n'
            'This token expires in 30 minutes.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_welcome_message(user, temporary_password=None):
    create_notification(
        recipient_user=user,
        type=Notification.Type.WELCOME,
        title='Welcome to NVOMS',
        body='Your NVOMS account has been created.',
        linked_object_id=user.id,
    )
    if user.email:
        from authentication.serializers import create_password_reset_token

        token, _ = create_password_reset_token(user, user.email)
        reset_url = f'{settings.PASSWORD_RESET_URL}?{urlencode({"token": token})}'
        send_mail(
            subject='Welcome to NVOMS',
            message=(
                f'Hello {user.full_name},\n\n'
                f'Your NVOMS account is ready. Username: {user.email}.\n'
                f'Use this temporary password link to set a new password: {reset_url}'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    if user.phone_number:
        credential_text = f' Temporary password: {temporary_password}.' if temporary_password else ''
        send_sms(
            user.phone_number,
            f'Welcome to NVOMS. Username: {user.email or user.phone_number}.{credential_text}',
        )


def send_outbreak_confirmed_alert(alert):
    from users.models import User

    message = f'Confirmed outbreak alert: {alert.disease_code} in {alert.unit.name}.'
    users = User.objects.filter(
        role__role_code__in=['ADMIN', 'PUBLIC_HEALTH_OFFICIAL'],
        status=User.Status.ACTIVE,
    )
    for user in users:
        create_notification(
            recipient_user=user,
            type=Notification.Type.OUTBREAK_ALERT,
            title='Outbreak alert confirmed',
            body=message,
            linked_object_id=alert.id,
        )
        if user.phone_number:
            send_sms(user.phone_number, message)


def send_overdue_vaccination_alert(slot):
    patient = slot.patient
    vaccine_name = slot.vaccine.vaccine_name
    message = f'{patient.full_name} is overdue for {vaccine_name}.'

    if patient.user_account:
        create_notification(
            recipient_user=patient.user_account,
            type=Notification.Type.VACCINATION_REMINDER,
            title='Vaccination overdue',
            body=message,
            linked_object_id=slot.id,
        )
        if patient.user_account.phone_number:
            send_sms(patient.user_account.phone_number, message)

    caregiver = patient.primary_caregiver
    if caregiver and caregiver.phone_number:
        send_sms(caregiver.phone_number, message)


def send_vaccination_reminder(slot):
    patient = slot.patient
    vaccine_name = slot.vaccine.vaccine_name
    message = f'{patient.full_name} is scheduled for {vaccine_name} on {slot.due_date}.'

    if patient.user_account:
        exists = patient.user_account.notifications.filter(
            type=Notification.Type.VACCINATION_REMINDER,
            linked_object_id=str(slot.id),
        ).exists()
        if not exists:
            create_notification(
                recipient_user=patient.user_account,
                type=Notification.Type.VACCINATION_REMINDER,
                title='Vaccination reminder',
                body=message,
                linked_object_id=slot.id,
            )
        if patient.user_account.phone_number:
            send_sms(patient.user_account.phone_number, message)

    caregiver = patient.primary_caregiver
    if caregiver and caregiver.phone_number:
        send_sms(caregiver.phone_number, message)
