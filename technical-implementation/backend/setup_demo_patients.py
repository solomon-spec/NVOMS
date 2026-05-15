import os
from datetime import timedelta

import django
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nvoms.settings")
django.setup()

from geography.models import AdministrativeUnit
from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule
from patients.models import Caregiver, Patient, PatientImmunizationStatus
from prediction.models import OutbreakRiskScore
from surveillance.models import OutbreakAlert
from users.models import HealthFacility, User
from vaccines.models import Antigen, EpiScheduleRule, EpiScheduleVersion, VaccineDefinition


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
    seeded_patients = []

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
        seeded_patients.append((patient, index, kebele, facility))

    print(f"Demo patient seed complete. Created: {created}, updated: {updated}.")
    ensure_public_health_monitoring_data(
        patients=seeded_patients,
        kebeles=kebeles,
        registered_by=registered_by,
    )


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


def ensure_public_health_monitoring_data(patients, kebeles, registered_by):
    print("Seeding public health monitoring schedule, risk, and alert data...")

    antigen, _ = Antigen.objects.get_or_create(
        code="demo-monitoring",
        defaults={"name": "Demo Monitoring Antigens", "is_active": True},
    )

    vaccine_specs = [
        ("DEMO-MCV1", "Measles Containing Vaccine 1", 270),
        ("DEMO-OPV3", "Oral Polio Vaccine 3", 98),
        ("DEMO-PENTA3", "Pentavalent 3", 98),
    ]
    vaccines = []
    for code, name, _age_days in vaccine_specs:
        vaccine, _ = VaccineDefinition.objects.update_or_create(
            vaccine_code=code,
            defaults={
                "vaccine_name": name,
                "antigen": antigen,
                "dose_sequence": len(vaccines) + 1,
                "default_route": "IM",
                "default_site": "Left thigh",
                "is_active": True,
            },
        )
        vaccines.append(vaccine)

    version, _ = EpiScheduleVersion.objects.update_or_create(
        version_name="NVOMS Demo Monitoring Schedule",
        defaults={
            "effective_from": timezone.localdate() - timedelta(days=365),
            "status": EpiScheduleVersion.Status.ACTIVE,
            "notes": "Demo schedule used by frontend monitoring videos.",
            "created_by": registered_by,
        },
    )

    rules = []
    for vaccine, (_code, _name, age_days) in zip(vaccines, vaccine_specs):
        rule, _ = EpiScheduleRule.objects.update_or_create(
            schedule_version=version,
            vaccine=vaccine,
            dose_label=vaccine.vaccine_code,
            defaults={
                "recommended_age_days": age_days,
                "grace_period_days": 7,
                "defaulter_threshold_days": 14,
                "is_birth_dose": False,
                "is_active": True,
            },
        )
        rules.append(rule)

    status_pattern = [
        PatientVaccinationSchedule.SlotStatus.ADMINISTERED,
        PatientVaccinationSchedule.SlotStatus.ADMINISTERED,
        PatientVaccinationSchedule.SlotStatus.OVERDUE,
        PatientVaccinationSchedule.SlotStatus.DEFAULTER,
        PatientVaccinationSchedule.SlotStatus.SCHEDULED,
        PatientVaccinationSchedule.SlotStatus.DUE_SOON,
    ]

    schedule_count = 0
    event_count = 0
    now = timezone.now()
    for patient, patient_index, _kebele, facility in patients:
        for rule_index, rule in enumerate(rules):
            status_index = (patient_index + rule_index) % len(status_pattern)
            slot_status = status_pattern[status_index]
            due_date = timezone.localdate() - timedelta(days=(patient_index % 35) + rule_index * 7)
            if slot_status in {
                PatientVaccinationSchedule.SlotStatus.SCHEDULED,
                PatientVaccinationSchedule.SlotStatus.DUE_SOON,
            }:
                due_date = timezone.localdate() + timedelta(days=(patient_index % 21) + rule_index)

            slot, _ = PatientVaccinationSchedule.objects.update_or_create(
                patient=patient,
                schedule_rule=rule,
                defaults={
                    "vaccine": rule.vaccine,
                    "due_date": due_date,
                    "status": slot_status,
                    "status_reason": "Demo monitoring seed",
                    "status_changed_at": now,
                },
            )
            schedule_count += 1

            if slot_status == PatientVaccinationSchedule.SlotStatus.ADMINISTERED and patient_index % 4 != 3:
                ImmunizationEvent.objects.update_or_create(
                    local_client_record_id=f"demo-monitoring-dose-{patient.local_client_record_id}-{rule.vaccine.vaccine_code}",
                    defaults={
                        "patient": patient,
                        "schedule_slot": slot,
                        "vaccine": rule.vaccine,
                        "administered_by": registered_by,
                        "facility": facility,
                        "administered_at": now - timedelta(days=patient_index % 10),
                        "administration_route": rule.vaccine.default_route,
                        "administration_site": rule.vaccine.default_site,
                        "event_status": ImmunizationEvent.EventStatus.ADMINISTERED,
                        "source_channel": ImmunizationEvent.SourceChannel.ONLINE,
                        "notes": "Demo monitoring dose",
                    },
                )
                event_count += 1

    risk_specs = [
        ("measles", 0.86, OutbreakAlert.Status.CONFIRMED),
        ("cholera", 0.72, OutbreakAlert.Status.UNDER_REVIEW),
        ("polio", 0.54, OutbreakAlert.Status.POTENTIAL),
        ("measles", 0.31, OutbreakAlert.Status.DISMISSED),
    ]
    for index, kebele in enumerate(kebeles):
        disease, score, alert_status = risk_specs[index % len(risk_specs)]
        OutbreakRiskScore.objects.update_or_create(
            unit=kebele,
            disease=disease,
            defaults={
                "risk_score": score,
                "computed_at": now - timedelta(hours=index * 3),
                "model_version": "demo-monitoring-v1",
                "factors": {
                    "defaulter_pressure": round(score * 0.8, 2),
                    "reporting_gap_days": 10 + index * 5,
                },
            },
        )

        alert = OutbreakAlert.objects.filter(
            unit=kebele,
            disease_code=disease,
            alert_source=OutbreakAlert.AlertSource.PREDICTION,
            notes__startswith="Demo monitoring alert",
        ).first()
        if alert is None:
            alert = OutbreakAlert(
                unit=kebele,
                disease_code=disease,
                alert_source=OutbreakAlert.AlertSource.PREDICTION,
            )
        alert.risk_probability = score
        alert.status = alert_status
        alert.triggered_at = now - timedelta(hours=index * 4)
        alert.notes = f"Demo monitoring alert for {kebele.name}"
        alert.save()

    print(
        "Public health monitoring seed complete. "
        f"Schedule slots: {schedule_count}, immunization events: {event_count}, "
        f"risk areas: {len(kebeles)}."
    )


if __name__ == "__main__":
    run_seed()
