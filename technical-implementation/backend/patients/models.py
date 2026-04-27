import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


def _generate_patient_uid():
    return 'PAT-' + uuid.uuid4().hex[:10].upper()


class Caregiver(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='caregiver_id'
    )
    full_name = models.CharField(max_length=160)
    phone_number = models.CharField(max_length=24)
    alternate_phone_number = models.CharField(max_length=24, null=True, blank=True)
    relationship_to_patient = models.CharField(max_length=60)
    preferred_language = models.CharField(max_length=12, default='am')
    residence_unit = models.ForeignKey(
        'geography.AdministrativeUnit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='caregivers',
        db_column='residence_unit_id',
    )
    address_line = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'caregivers'

    def __str__(self):
        return self.full_name


class Patient(models.Model):
    class Sex(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'
        OTHER = 'other', 'Other'
        UNKNOWN = 'unknown', 'Unknown'

    class DuplicateReviewStatus(models.TextChoices):
        CLEAR = 'clear', 'Clear'
        SUSPECTED = 'suspected', 'Suspected'
        CONFIRMED_DUPLICATE = 'confirmed_duplicate', 'Confirmed Duplicate'
        MERGED = 'merged', 'Merged'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        VERIFYING = 'verifying', 'Verifying'
        REGISTERED = 'registered', 'Registered'
        MERGED = 'merged', 'Merged'
        INACTIVE = 'inactive', 'Inactive'
        DECEASED = 'deceased', 'Deceased'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='patient_id'
    )
    uid = models.CharField(max_length=40, unique=True, editable=False)
    primary_caregiver = models.ForeignKey(
        Caregiver,
        on_delete=models.PROTECT,
        related_name='patients',
        db_column='primary_caregiver_id',
    )
    residence_unit = models.ForeignKey(
        'geography.AdministrativeUnit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patients',
        db_column='residence_unit_id',
    )
    registered_facility = models.ForeignKey(
        'users.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_patients',
        db_column='registered_facility_id',
    )
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_patients',
        db_column='registered_by_user_id',
    )
    first_name = models.CharField(max_length=80)
    middle_name = models.CharField(max_length=80, null=True, blank=True)
    last_name = models.CharField(max_length=80, null=True, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices)
    date_of_birth = models.DateField()
    medical_exception_flag = models.BooleanField(default=False)
    duplicate_review_status = models.CharField(
        max_length=20,
        choices=DuplicateReviewStatus.choices,
        default=DuplicateReviewStatus.CLEAR,
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.REGISTERED
    )
    qr_code_value = models.CharField(max_length=120, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patients'

    def save(self, *args, **kwargs):
        if not self.uid:
            self.uid = _generate_patient_uid()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.uid} – {self.first_name}'

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p)


class PatientImmunizationStatus(models.Model):
    class CurrentStatus(models.TextChoices):
        UP_TO_DATE = 'up_to_date', 'Up to Date'
        DUE_SOON = 'due_soon', 'Due Soon'
        OVERDUE = 'overdue', 'Overdue'
        DEFAULTER = 'defaulter', 'Defaulter'
        ZERO_DOSE = 'zero_dose', 'Zero Dose'
        UNKNOWN = 'unknown', 'Unknown'

    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='immunization_status',
        db_column='patient_id',
    )
    next_due_date = models.DateField(null=True, blank=True)
    current_status = models.CharField(
        max_length=16,
        choices=CurrentStatus.choices,
        default=CurrentStatus.UNKNOWN,
    )
    due_count = models.PositiveIntegerField(default=0)
    overdue_count = models.PositiveIntegerField(default=0)
    administered_count = models.PositiveIntegerField(default=0)
    is_zero_dose = models.BooleanField(default=True)
    last_evaluated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'patient_immunization_status'
