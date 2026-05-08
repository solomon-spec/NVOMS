import os
from datetime import timedelta

import django
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nvoms.settings")
django.setup()

from geography.models import AdministrativeUnit
from patients.models import Caregiver, Patient, PatientImmunizationStatus
from users.models import HealthFacility, User


FIRST_NAMES = [
    "Amanuel",
    "Hana",
    "Dawit",
    "Mekdes",
    "Nahom",
    "Saron",
    "Bereket",
    "Eden",
    "Yonas",
    "Liya",
    "Samuel",
    "Mahi",
]

LAST_NAMES = [
    "Tesfaye",
    "Bekele",
    "Alemu",
    "Tadesse",
    "Kebede",
    "Gebre",
    "Hailu",
    "Worku",
    "Abebe",
    "Demissie",
]

FACILITIES = [
    ("FAC-001", "Addis Ababa General Hospital"),
    ("FAC-002", "Kolfe Health Center"),
    ("FAC-003", "Yeka Subcity Clinic"),
    ("FAC-004", "Akaki Primary Health Unit"),
]

STATUS_CYCLE = [
    Patient.Status.REGISTERED,
    Patient.Status.REGISTERED,
    Patient.Status.REGISTERED,
    Patient.Status.VERIFYING,
    Patient.Status.DRAFT,
    Patient.Status.INACTIVE,
]

IMMUNIZATION_STATUS_CYCLE = [
    PatientImmunizationStatus.CurrentStatus.UP_TO_DATE,
    PatientImmunizationStatus.CurrentStatus.DUE_SOON,
    PatientImmunizationStatus.CurrentStatus.OVERDUE,
    PatientImmunizationStatus.CurrentStatus.DEFAULTER,
    PatientImmunizationStatus.CurrentStatus.ZERO_DOSE,
]


def run_seed(total_patients=120):
    print(f"Seeding {total_patients} demo patient records...")

    registered_by = User.objects.filter(email="hw@nvoms.local").first()
    facilities = ensure_facilities()
    kebeles = ensure_geography()

    created = 0
    updated = 0
    today = timezone.localdate()

    for index in range(total_patients):
        first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
        last_name = LAST_NAMES[(index * 3) % len(LAST_NAMES)]
        caregiver_name = f"{LAST_NAMES[(index * 5) % len(LAST_NAMES)]} Family"
        phone_number = f"+251911{index:06d}"
        facility = facilities[index % len(facilities)]
        kebele = kebeles[index % len(kebeles)]
        patient_status = STATUS_CYCLE[index % len(STATUS_CYCLE)]
        immunization_status = IMMUNIZATION_STATUS_CYCLE[
            index % len(IMMUNIZATION_STATUS_CYCLE)
        ]
        dob = today - timedelta(days=45 + (index * 23) % 2190)
        local_id = f"demo-patient-{index + 1:03d}"

        caregiver, _ = Caregiver.objects.update_or_create(
            local_client_record_id=f"demo-caregiver-{index + 1:03d}",
            defaults={
                "full_name": caregiver_name,
                "phone_number": phone_number,
                "relationship_to_patient": "mother" if index % 2 == 0 else "father",
                "preferred_language": "am" if index % 3 else "en",
                "residence_unit": kebele,
                "address_line": f"Household cluster {index % 18 + 1}",
                "status": Caregiver.Status.ACTIVE,
            },
        )

        patient, was_created = Patient.objects.update_or_create(
            local_client_record_id=local_id,
            defaults={
                "primary_caregiver": caregiver,
                "residence_unit": kebele,
                "registered_facility": facility,
                "registered_by": registered_by,
                "first_name": first_name,
                "middle_name": FIRST_NAMES[(index + 4) % len(FIRST_NAMES)],
                "last_name": last_name,
                "sex": Patient.Sex.FEMALE if index % 2 else Patient.Sex.MALE,
                "date_of_birth": dob,
                "medical_exception_flag": index % 17 == 0,
                "duplicate_review_status": Patient.DuplicateReviewStatus.CLEAR,
                "status": patient_status,
                "qr_code_value": f"NVOMS-DEMO-{index + 1:03d}",
            },
        )

        due_count = 0 if immunization_status == "up_to_date" else (index % 3) + 1
        overdue_count = 0
        if immunization_status in {"overdue", "defaulter"}:
            overdue_count = (index % 2) + 1

        PatientImmunizationStatus.objects.update_or_create(
            patient=patient,
            defaults={
                "current_status": immunization_status,
                "next_due_date": today + timedelta(days=(index % 28) - 7),
                "due_count": due_count,
                "overdue_count": overdue_count,
                "administered_count": index % 6,
                "is_zero_dose": immunization_status == "zero_dose",
                "last_evaluated_at": timezone.now(),
            },
        )

        if was_created:
            created += 1
        else:
            updated += 1

    print(f"Demo patient seed complete. Created: {created}, updated: {updated}.")


def ensure_facilities():
    facilities = []
    for code, name in FACILITIES:
        facility, _ = HealthFacility.objects.get_or_create(
            facility_code=code,
            defaults={"facility_name": name},
        )
        facilities.append(facility)
    return facilities


def ensure_geography():
    country, _ = AdministrativeUnit.objects.get_or_create(
        code="ETH",
        defaults={"name": "Ethiopia", "level": AdministrativeUnit.Level.COUNTRY},
    )
    region, _ = AdministrativeUnit.objects.get_or_create(
        code="AA",
        defaults={
            "name": "Addis Ababa",
            "level": AdministrativeUnit.Level.REGION,
            "parent": country,
        },
    )
    zone, _ = AdministrativeUnit.objects.get_or_create(
        code="AA-CENTRAL",
        defaults={
            "name": "Central Addis",
            "level": AdministrativeUnit.Level.ZONE,
            "parent": region,
        },
    )

    kebeles = []
    for index, name in enumerate(["Kolfe 01", "Yeka 04", "Bole 06", "Akaki 02"]):
        woreda, _ = AdministrativeUnit.objects.get_or_create(
            code=f"AA-W{index + 1:02d}",
            defaults={
                "name": f"Woreda {index + 1}",
                "level": AdministrativeUnit.Level.WOREDA,
                "parent": zone,
            },
        )
        kebele, _ = AdministrativeUnit.objects.get_or_create(
            code=f"AA-K{index + 1:02d}",
            defaults={
                "name": name,
                "level": AdministrativeUnit.Level.KEBELE,
                "parent": woreda,
            },
        )
        kebeles.append(kebele)

    return kebeles


if __name__ == "__main__":
    run_seed()
