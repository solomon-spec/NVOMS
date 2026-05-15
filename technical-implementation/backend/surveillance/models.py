import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class SurveillanceReport(models.Model):
    class Category(models.TextChoices):
        AEFI = 'aefi', 'AEFI'
        SYMPTOM = 'symptom', 'Symptom'
        LAB_FOLLOW_UP = 'lab_follow_up', 'Lab Follow-Up'

    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MODERATE = 'moderate', 'Moderate'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Submitted'
        QUEUED = 'queued', 'Queued'
        UNDER_FOLLOW_UP = 'under_follow_up', 'Under Follow-Up'
        CLOSED = 'closed', 'Closed'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='surveillance_report_id'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='surveillance_reports',
        db_column='patient_id',
    )
    facility = models.ForeignKey(
        'users.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_reports',
        db_column='facility_id',
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_reports',
        db_column='reported_by_user_id',
    )
    surveillance_category = models.CharField(max_length=20, choices=Category.choices)
    condition_type = models.CharField(max_length=80)
    disease_suspected = models.CharField(max_length=80, null=True, blank=True)
    onset_date = models.DateField()
    body_temperature_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    severity = models.CharField(
        max_length=10, choices=Severity.choices, null=True, blank=True
    )
    follow_up_required = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUBMITTED
    )
    fhir_observation_id = models.CharField(max_length=120, null=True, blank=True)
    fhir_resource_id = models.CharField(max_length=120, null=True, blank=True)
    local_client_record_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'surveillance_reports'

    def __str__(self):
        return f'{self.surveillance_category} – {self.condition_type} – {self.status}'


class SurveillanceSymptom(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='surveillance_symptom_id'
    )
    report = models.ForeignKey(
        SurveillanceReport,
        on_delete=models.CASCADE,
        related_name='symptoms',
        db_column='surveillance_report_id',
    )
    symptom_code = models.CharField(max_length=40)
    symptom_label = models.CharField(max_length=120)
    is_present = models.BooleanField(default=True)
    observation_value = models.CharField(max_length=120, null=True, blank=True)

    class Meta:
        db_table = 'surveillance_symptoms'

    def __str__(self):
        return f'{self.symptom_label} ({"present" if self.is_present else "absent"})'


class FollowUpAction(models.Model):
    """Tracks follow-up actions taken against a surveillance report."""

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        COMPLETED = 'completed', 'Completed'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='follow_up_action_id'
    )
    report = models.ForeignKey(
        SurveillanceReport,
        on_delete=models.CASCADE,
        related_name='follow_ups',
        db_column='surveillance_report_id',
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_follow_ups',
        db_column='assigned_to_user_id',
    )
    action_taken = models.TextField()
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.OPEN
    )
    due_date = models.DateField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_follow_ups',
        db_column='created_by_user_id',
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'follow_up_actions'

    def __str__(self):
        return f'Follow-up for {self.report_id} – {self.status}'


class OutbreakAlert(models.Model):
    class AlertSource(models.TextChoices):
        PREDICTION = 'prediction', 'Prediction'
        SURVEILLANCE = 'surveillance', 'Surveillance'
        MANUAL = 'manual', 'Manual'

    class Status(models.TextChoices):
        POTENTIAL = 'potential', 'Potential'
        UNDER_REVIEW = 'under_review', 'Under Review'
        CONFIRMED = 'confirmed', 'Confirmed'
        DISMISSED = 'dismissed', 'Dismissed'
        FALSE_ALARM = 'false_alarm', 'False Alarm'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='outbreak_alert_id'
    )
    unit = models.ForeignKey(
        'geography.AdministrativeUnit',
        on_delete=models.PROTECT,
        related_name='outbreak_alerts',
        db_column='unit_id',
    )
    disease_code = models.CharField(max_length=40)
    surveillance_report = models.ForeignKey(
        SurveillanceReport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbreak_alerts',
        db_column='surveillance_report_id',
    )
    alert_source = models.CharField(max_length=20, choices=AlertSource.choices)
    risk_probability = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.POTENTIAL
    )
    triggered_at = models.DateTimeField(default=timezone.now)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_alerts',
        db_column='verified_by_user_id',
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'outbreak_alerts'

    def __str__(self):
        return f'{self.disease_code} – {self.unit_id} – {self.status}'
