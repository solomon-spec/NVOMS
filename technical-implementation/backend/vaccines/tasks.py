from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from immunizations.models import PatientVaccinationSchedule
from patients.models import Patient
from vaccines.models import EpiScheduleRule, EpiScheduleVersion, ScheduleRegenerationJob


@shared_task
def regenerate_schedules_for_version_task(job_id):
    job = ScheduleRegenerationJob.objects.select_related('schedule_version').get(pk=job_id)
    version = job.schedule_version
    patient_ids = list(
        PatientVaccinationSchedule.objects
        .filter(schedule_rule__schedule_version=version)
        .values_list('patient_id', flat=True)
        .distinct()
    )
    job.status = ScheduleRegenerationJob.Status.RUNNING
    job.started_at = timezone.now()
    job.total = len(patient_ids)
    job.processed = 0
    job.failed = 0
    job.error_message = None
    job.save(update_fields=[
        'status',
        'started_at',
        'total',
        'processed',
        'failed',
        'error_message',
    ])

    active_rules = list(
        version.rules
        .filter(is_active=True)
        .select_related('vaccine')
        .order_by('recommended_age_days')
    )
    active_rule_ids = {rule.id for rule in active_rules}

    for patient_id in patient_ids:
        try:
            patient = Patient.objects.get(pk=patient_id)
            _regenerate_patient_schedule(patient, version, active_rules, active_rule_ids)
            job.processed += 1
        except Exception as exc:
            job.failed += 1
            job.error_message = str(exc)
        job.save(update_fields=['processed', 'failed', 'error_message'])

    job.status = (
        ScheduleRegenerationJob.Status.FAILED
        if job.failed and job.processed == 0
        else ScheduleRegenerationJob.Status.COMPLETED
    )
    job.completed_at = timezone.now()
    job.save(update_fields=['status', 'completed_at'])
    return {'total': job.total, 'processed': job.processed, 'failed': job.failed}


def _regenerate_patient_schedule(patient, version, active_rules, active_rule_ids):
    with transaction.atomic():
        for rule in active_rules:
            due_date = patient.date_of_birth + timedelta(days=rule.recommended_age_days)
            slot, created = PatientVaccinationSchedule.objects.get_or_create(
                patient=patient,
                schedule_rule=rule,
                defaults={'vaccine': rule.vaccine, 'due_date': due_date},
            )
            if not created and slot.status != PatientVaccinationSchedule.SlotStatus.ADMINISTERED:
                slot.vaccine = rule.vaccine
                slot.due_date = due_date
                slot.save(update_fields=['vaccine', 'due_date'])

        stale_slots = PatientVaccinationSchedule.objects.filter(
            patient=patient,
            schedule_rule__schedule_version=version,
        ).exclude(schedule_rule_id__in=active_rule_ids)
        stale_slots.update(
            status=PatientVaccinationSchedule.SlotStatus.CANCELLED,
            status_reason='Schedule rule is no longer active in this version.',
            status_changed_at=timezone.now(),
        )
