import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class PatientVaccinationSchedule(models.Model):
    class SlotStatus(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        PENDING = 'pending', 'Pending'
        DUE_SOON = 'due_soon', 'Due Soon'
        DUE_TODAY = 'due_today', 'Due Today'
        OVERDUE = 'overdue', 'Overdue'
        DEFAULTER = 'defaulter', 'Defaulter'
        ADMINISTERED = 'administered', 'Administered'
        EXEMPT = 'exempt', 'Exempt'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='patient_schedule_id'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='schedule_slots',
        db_column='patient_id',
    )
    schedule_rule = models.ForeignKey(
        'vaccines.EpiScheduleRule',
        on_delete=models.PROTECT,
        related_name='schedule_slots',
        db_column='schedule_rule_id',
    )
    vaccine = models.ForeignKey(
        'vaccines.VaccineDefinition',
        on_delete=models.PROTECT,
        related_name='schedule_slots',
        db_column='vaccine_id',
    )
    due_date = models.DateField()
    status = models.CharField(
        max_length=16, choices=SlotStatus.choices, default=SlotStatus.SCHEDULED
    )
    status_reason = models.TextField(null=True, blank=True)
    generated_at = models.DateTimeField(default=timezone.now)
    status_changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'patient_vaccination_schedules'
        unique_together = [('patient', 'schedule_rule')]

    def __str__(self):
        return f'{self.patient_id} – {self.vaccine} – {self.due_date}'


class ScheduleStatusEvent(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='status_event_id'
    )
    schedule_slot = models.ForeignKey(
        PatientVaccinationSchedule,
        on_delete=models.CASCADE,
        related_name='status_events',
        db_column='patient_schedule_id',
    )
    from_status = models.CharField(max_length=16, null=True, blank=True)
    to_status = models.CharField(max_length=16, choices=PatientVaccinationSchedule.SlotStatus.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='schedule_status_changes',
        db_column='changed_by_user_id',
    )
    changed_by_process = models.CharField(max_length=80, null=True, blank=True)
    changed_at = models.DateTimeField(default=timezone.now)
    reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'schedule_status_events'

    def __str__(self):
        return f'{self.schedule_slot_id} {self.from_status}→{self.to_status}'


class ImmunizationEvent(models.Model):
    class EventStatus(models.TextChoices):
        ADMINISTERED = 'administered', 'Administered'
        WASTED = 'wasted', 'Wasted'
        REFUSED = 'refused', 'Refused'
        CONTRAINDICATED = 'contraindicated', 'Contraindicated'

    class SourceChannel(models.TextChoices):
        ONLINE = 'online', 'Online'
        OFFLINE = 'offline', 'Offline'
        SYNCED = 'synced', 'Synced'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='immunization_event_id'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='immunization_events',
        db_column='patient_id',
    )
    schedule_slot = models.ForeignKey(
        PatientVaccinationSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
        db_column='patient_schedule_id',
    )
    vaccine = models.ForeignKey(
        'vaccines.VaccineDefinition',
        on_delete=models.PROTECT,
        related_name='immunization_events',
        db_column='vaccine_id',
    )
    vaccine_batch = models.ForeignKey(
        'vaccines.VaccineBatch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='immunization_events',
        db_column='vaccine_batch_id',
    )
    administered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='administered_events',
        db_column='administered_by_user_id',
    )
    facility = models.ForeignKey(
        'users.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='immunization_events',
        db_column='facility_id',
    )
    administered_at = models.DateTimeField()
    administration_route = models.CharField(max_length=40, null=True, blank=True)
    administration_site = models.CharField(max_length=40, null=True, blank=True)
    event_status = models.CharField(
        max_length=20, choices=EventStatus.choices, default=EventStatus.ADMINISTERED
    )
    source_channel = models.CharField(
        max_length=10, choices=SourceChannel.choices, default=SourceChannel.ONLINE
    )
    local_client_record_id = models.CharField(max_length=120, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'immunization_events'

    def __str__(self):
        return f'{self.patient_id} – {self.vaccine} – {self.administered_at}'
