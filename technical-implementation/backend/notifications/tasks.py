"""
Celery periodic tasks for automated SMS notification dispatch.

send_vaccine_reminders()      – daily 08:00 UTC: SMS for slots due today
send_overdue_alerts()         – daily 09:00 UTC: SMS for overdue/defaulter slots
dispatch_queued_notifications() – every 5 min: send QUEUED notifications via gateway
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('nvoms.notifications')


@shared_task(bind=True, name='notifications.send_vaccine_reminders', max_retries=3)
def send_vaccine_reminders(self):
    """
    Finds all PatientVaccinationSchedule slots that are due today and sends
    reminder SMS to caregivers who have not yet been notified today.
    """
    from immunizations.models import PatientVaccinationSchedule
    from notifications.services import create_reminder_notification

    today = timezone.now().date()
    slots = (
        PatientVaccinationSchedule.objects
        .filter(due_date=today, status=PatientVaccinationSchedule.SlotStatus.DUE_TODAY)
        .select_related('patient__primary_caregiver', 'vaccine')
    )

    created = 0
    skipped = 0
    for slot in slots:
        patient = slot.patient
        notification = create_reminder_notification(patient, slot)
        if notification:
            created += 1
        else:
            skipped += 1

    logger.info(
        'send_vaccine_reminders: date=%s created=%d skipped=%d',
        today, created, skipped,
    )
    return {'date': str(today), 'created': created, 'skipped': skipped}


@shared_task(bind=True, name='notifications.send_overdue_alerts', max_retries=3)
def send_overdue_alerts(self):
    """
    Finds all PatientVaccinationSchedule slots that are overdue or defaulter
    and sends missed-appointment SMS to caregivers not yet notified today.
    """
    from immunizations.models import PatientVaccinationSchedule
    from notifications.services import create_missed_notification

    overdue_statuses = [
        PatientVaccinationSchedule.SlotStatus.OVERDUE,
        PatientVaccinationSchedule.SlotStatus.DEFAULTER,
    ]
    slots = (
        PatientVaccinationSchedule.objects
        .filter(status__in=overdue_statuses)
        .select_related('patient__primary_caregiver', 'vaccine')
    )

    created = 0
    skipped = 0
    for slot in slots:
        patient = slot.patient
        notification = create_missed_notification(patient, slot)
        if notification:
            created += 1
        else:
            skipped += 1

    logger.info(
        'send_overdue_alerts: created=%d skipped=%d',
        created, skipped,
    )
    return {'created': created, 'skipped': skipped}


@shared_task(bind=True, name='notifications.dispatch_queued_notifications', max_retries=1)
def dispatch_queued_notifications(self):
    """
    Picks up all SmsNotifications in QUEUED or PENDING_RETRY status whose
    scheduled_for time has passed and dispatches them via the SMS gateway.
    """
    from notifications.models import SmsNotification
    from notifications.services import send_via_gateway

    now = timezone.now()
    pending = SmsNotification.objects.filter(
        status__in=[
            SmsNotification.DeliveryStatus.QUEUED,
            SmsNotification.DeliveryStatus.PENDING_RETRY,
        ],
        scheduled_for__lte=now,
    ).order_by('priority', 'scheduled_for')

    sent = 0
    failed = 0
    for notification in pending:
        success = send_via_gateway(notification)
        if success:
            sent += 1
        else:
            failed += 1

    logger.info('dispatch_queued_notifications: sent=%d failed=%d', sent, failed)
    return {'sent': sent, 'failed': failed}
