import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def send_welcome_notification_task(user_id, temporary_password=None):
    from notifications.services import send_welcome_message
    from users.models import User

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning('Welcome notification skipped; user %s does not exist.', user_id)
        return
    send_welcome_message(user, temporary_password=temporary_password)


@shared_task
def send_vaccination_reminders_task():
    from django.utils import timezone
    from immunizations.models import PatientVaccinationSchedule
    from notifications.services import send_vaccination_reminder

    today = timezone.localdate()
    slots = (
        PatientVaccinationSchedule.objects
        .filter(
            due_date__lte=today,
            status__in=[
                PatientVaccinationSchedule.SlotStatus.SCHEDULED,
                PatientVaccinationSchedule.SlotStatus.PENDING,
                PatientVaccinationSchedule.SlotStatus.DUE_SOON,
                PatientVaccinationSchedule.SlotStatus.DUE_TODAY,
            ],
        )
        .select_related('patient__primary_caregiver', 'patient__user_account', 'vaccine')
    )
    count = 0
    for slot in slots:
        send_vaccination_reminder(slot)
        count += 1
    return count
