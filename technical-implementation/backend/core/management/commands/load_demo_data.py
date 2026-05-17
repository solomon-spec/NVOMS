import json
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from environmental.models import MeteorologicalObservation
from geography.models import AdministrativeUnit
from immunizations.models import (
    ImmunizationEvent,
    PatientDiseaseSchedule,
    PatientVaccinationSchedule,
)
from patients.models import Caregiver, Patient, PatientImmunizationStatus
from prediction.models import OutbreakRiskScore
from reports.models import GeneratedReport, ReportDefinition
from surveillance.models import FollowUpAction, OutbreakAlert, SurveillanceReport, SurveillanceSymptom
from users.models import HealthFacility, Role, User
from vaccines.models import Antigen, EpiScheduleRule, EpiScheduleVersion, VaccineBatch, VaccineDefinition


SUPPORTED_DISEASES = {"measles", "polio", "cholera"}


class DemoDataError(ValueError):
    pass


class Command(BaseCommand):
    help = (
        "Load high-quality demo data from JSON. Geography is resolved from existing "
        "AdministrativeUnit records by code or name; the command does not invent map data."
    )

    def add_arguments(self, parser):
        parser.add_argument("json_file", type=str, help="Path to the demo JSON file.")
        parser.add_argument(
            "--namespace",
            default="quality-demo",
            help="Namespace used for stable demo keys and cleanup.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete prior data loaded with this namespace before importing.",
        )
        parser.add_argument(
            "--auto-geography",
            action="store_true",
            help=(
                "Map missing or generated geography codes to existing active HDX woredas. "
                "Use this for generated JSON that intentionally omits exact AdministrativeUnit codes."
            ),
        )

    def handle(self, *args, **options):
        path = Path(options["json_file"])
        if not path.exists():
            raise CommandError(f"JSON file not found: {path}")

        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)

        if not isinstance(payload, dict):
            raise CommandError("Top-level demo data must be a JSON object.")

        namespace = options["namespace"] or payload.get("metadata", {}).get("namespace") or "quality-demo"
        importer = DemoDataImporter(
            namespace=namespace,
            stdout=self.stdout,
            style=self.style,
            auto_geography=options["auto_geography"],
        )

        try:
            if options["reset"]:
                importer.reset()
            summary = importer.load(payload)
        except DemoDataError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                "Loaded demo data: "
                + ", ".join(f"{key}={value}" for key, value in summary.items())
            )
        )


class DemoDataImporter:
    REGION_HINTS = {
        "ADD": "ET14",
        "ORO": "ET04",
        "AMH": "ET03",
        "TIG": "ET01",
        "SOM": "ET05",
        "SNN": "ET07",
    }
    AREA_HINTS = {
        "AK": ["akaki"],
        "AR": ["arada"],
        "BL": ["bole"],
        "YK": ["yeka"],
        "BDR": ["bahir dar"],
        "DES": ["dessie"],
        "GON": ["gondar"],
        "ADAM": ["adama"],
        "JIM": ["jimma"],
        "SWSH": ["shashemene"],
        "GUR": ["gurage", "butajira"],
        "HOS": ["hosaena"],
        "WOL": ["wolaita", "wolayita"],
        "DEG": ["degehabur"],
        "JIG": ["jigjiga"],
        "ADG": ["adigrat"],
        "MEK": ["mekelle", "mekele"],
    }

    def __init__(self, namespace, stdout, style, auto_geography=False):
        self.namespace = namespace
        self.stdout = stdout
        self.style = style
        self.auto_geography = auto_geography
        self.geo_aliases = {}
        self.geo_auto_counter = 0
        self.geo_pool = None
        self.geo_pools_by_region = defaultdict(list)
        self.refs = {
            "facilities": {},
            "users": {},
            "vaccines": {},
            "batches": {},
            "schedule_rules": {},
            "caregivers": {},
            "patients": {},
            "immunization_events": {},
            "case_reports": {},
        }

    def load(self, payload):
        summary = {}
        summary["facilities"] = self.load_facilities(payload.get("facilities", []))
        summary["users"] = self.load_users(payload.get("users", []))
        summary["vaccines"] = self.load_vaccines(payload.get("vaccines", []))
        summary["caregivers"] = self.load_caregivers(payload.get("caregivers", []))
        summary["patients"] = self.load_patients(payload.get("patients", []))
        summary["immunizations"] = self.load_immunizations(payload.get("immunizations", []))
        summary["case_reports"] = self.load_case_reports(payload.get("case_reports", []))
        summary["follow_ups"] = self.load_follow_ups(payload.get("follow_ups", []))
        summary["risk_scores"] = self.load_risk_scores(payload.get("risk_scores", []))
        summary["alerts"] = self.load_alerts(payload.get("public_health_alerts", []))
        summary["weather"] = self.load_environmental(payload.get("environmental_observations", []))
        summary["reports"] = self.load_reports(payload.get("generated_reports", []))
        return summary

    def reset(self):
        prefix = f"{self.namespace}:"
        self.stdout.write(f"Removing prior demo data for namespace '{self.namespace}'...")

        FollowUpAction.objects.filter(report__local_client_record_id__startswith=prefix).delete()
        SurveillanceSymptom.objects.filter(report__local_client_record_id__startswith=prefix).delete()
        OutbreakAlert.objects.filter(notes__startswith=prefix).delete()
        SurveillanceReport.objects.filter(local_client_record_id__startswith=prefix).delete()
        ImmunizationEvent.objects.filter(local_client_record_id__startswith=prefix).delete()
        PatientVaccinationSchedule.objects.filter(status_reason__startswith=prefix).delete()
        PatientDiseaseSchedule.objects.filter(status_reason__startswith=prefix).delete()
        PatientImmunizationStatus.objects.filter(patient__local_client_record_id__startswith=prefix).delete()
        Patient.objects.filter(local_client_record_id__startswith=prefix).delete()
        Caregiver.objects.filter(local_client_record_id__startswith=prefix).delete()
        OutbreakRiskScore.objects.filter(model_version__startswith=prefix).delete()
        MeteorologicalObservation.objects.filter(source=prefix.rstrip(":")).delete()
        GeneratedReport.objects.filter(parameter_payload__namespace=self.namespace).delete()
        VaccineBatch.objects.filter(source_system=prefix.rstrip(":")).delete()

    def load_facilities(self, rows):
        for row in rows:
            code = required(row, "code", "facility")
            facility, _ = HealthFacility.objects.update_or_create(
                facility_code=code,
                defaults={"facility_name": required(row, "name", f"facility {code}")},
            )
            self.refs["facilities"][code] = facility
        return len(rows)

    def load_users(self, rows):
        for row in rows:
            email = required(row, "email", "user")
            role_code = row.get("role", "HEALTH_WORKER")
            role, _ = Role.objects.get_or_create(
                role_code=role_code,
                defaults={"role_name": title_from_code(role_code)},
            )
            facility = self.resolve_facility(row.get("facility_code"), required_value=False)
            user, created = User.objects.update_or_create(
                email=email,
                defaults={
                    "full_name": row.get("full_name") or email.split("@")[0].replace(".", " ").title(),
                    "phone_number": row.get("phone_number"),
                    "role": role,
                    "assigned_facility": facility,
                    "preferred_language": row.get("preferred_language", "en"),
                    "status": row.get("status", User.Status.ACTIVE),
                    "is_active": True,
                    "must_change_password": row.get("must_change_password", False),
                },
            )
            if created and row.get("password"):
                user.set_password(row["password"])
                user.save(update_fields=["password"])
            self.refs["users"][email] = user
        return len(rows)

    def load_vaccines(self, rows):
        default_version = None
        for row in rows:
            antigen_code = required(row, "antigen_code", "vaccine")
            antigen, _ = Antigen.objects.update_or_create(
                code=antigen_code,
                defaults={
                    "name": row.get("antigen_name") or title_from_code(antigen_code),
                    "description": row.get("antigen_description"),
                    "is_active": row.get("is_active", True),
                },
            )
            vaccine_code = required(row, "code", "vaccine")
            vaccine, _ = VaccineDefinition.objects.update_or_create(
                vaccine_code=vaccine_code,
                defaults={
                    "vaccine_name": required(row, "name", f"vaccine {vaccine_code}"),
                    "antigen": antigen,
                    "dose_sequence": row.get("dose_sequence"),
                    "default_route": row.get("route"),
                    "default_site": row.get("site"),
                    "is_active": row.get("is_active", True),
                },
            )
            self.refs["vaccines"][vaccine_code] = vaccine

            for batch_row in row.get("batches", []):
                batch_number = required(batch_row, "batch_number", f"batch for {vaccine_code}")
                batch, _ = VaccineBatch.objects.update_or_create(
                    batch_number=batch_number,
                    defaults={
                        "vaccine": vaccine,
                        "manufacturer_name": batch_row.get("manufacturer"),
                        "expiry_date": parse_date(batch_row.get("expiry_date")),
                        "source_system": self.namespace,
                        "is_valid": batch_row.get("is_valid", True),
                    },
                )
                self.refs["batches"][batch_number] = batch

            for rule_row in row.get("schedule_rules", []):
                if default_version is None:
                    default_version = self.ensure_schedule_version()
                dose_label = rule_row.get("dose_label") or vaccine_code
                rule, _ = EpiScheduleRule.objects.update_or_create(
                    schedule_version=default_version,
                    vaccine=vaccine,
                    dose_label=dose_label,
                    defaults={
                        "recommended_age_days": required(
                            rule_row,
                            "recommended_age_days",
                            f"schedule rule {vaccine_code}",
                        ),
                        "grace_period_days": rule_row.get("grace_period_days", 7),
                        "defaulter_threshold_days": rule_row.get("defaulter_threshold_days", 14),
                        "medical_exception_rule": rule_row.get("medical_exception_rule"),
                        "is_birth_dose": rule_row.get("is_birth_dose", False),
                        "is_active": rule_row.get("is_active", True),
                    },
                )
                self.refs["schedule_rules"][f"{vaccine_code}:{dose_label}"] = rule
        return len(rows)

    def load_caregivers(self, rows):
        for row in rows:
            key = required(row, "key", "caregiver")
            unit = self.resolve_unit(
                row.get("residence_unit_code"),
                row.get("residence_unit_name"),
                context=f"caregiver {key}",
            )
            caregiver, _ = Caregiver.objects.update_or_create(
                local_client_record_id=self.key(key),
                defaults={
                    "full_name": required(row, "full_name", f"caregiver {key}"),
                    "phone_number": required(row, "phone_number", f"caregiver {key}"),
                    "alternate_phone_number": row.get("alternate_phone_number"),
                    "relationship_to_patient": row.get("relationship_to_patient", "mother"),
                    "preferred_language": row.get("preferred_language", "am"),
                    "residence_unit": unit,
                    "address_line": row.get("address_line"),
                    "status": row.get("status", Caregiver.Status.ACTIVE),
                },
            )
            self.refs["caregivers"][key] = caregiver
        return len(rows)

    def load_patients(self, rows):
        registered_by = self.default_user()
        for row in rows:
            key = required(row, "key", "patient")
            caregiver = self.resolve_caregiver(required(row, "caregiver_key", f"patient {key}"))
            unit = self.resolve_unit(
                row.get("residence_unit_code"),
                row.get("residence_unit_name"),
                context=f"patient {key}",
            )
            facility = self.resolve_facility(row.get("facility_code"), required_value=False)
            patient, _ = Patient.objects.update_or_create(
                local_client_record_id=self.key(key),
                defaults={
                    "primary_caregiver": caregiver,
                    "residence_unit": unit,
                    "registered_facility": facility,
                    "registered_by": registered_by,
                    "first_name": required(row, "first_name", f"patient {key}"),
                    "middle_name": row.get("middle_name"),
                    "last_name": row.get("last_name"),
                    "sex": row.get("sex", Patient.Sex.UNKNOWN),
                    "date_of_birth": required_date(row, "date_of_birth", f"patient {key}"),
                    "medical_exception_flag": row.get("medical_exception_flag", False),
                    "duplicate_review_status": row.get(
                        "duplicate_review_status",
                        Patient.DuplicateReviewStatus.CLEAR,
                    ),
                    "status": row.get("status", Patient.Status.REGISTERED),
                    "qr_code_value": row.get("qr_code_value") or f"NVOMS-{self.namespace}-{key}",
                },
            )
            self.refs["patients"][key] = patient

            summary = row.get("immunization_summary", {})
            PatientImmunizationStatus.objects.update_or_create(
                patient=patient,
                defaults={
                    "current_status": summary.get("current_status", PatientImmunizationStatus.CurrentStatus.UNKNOWN),
                    "next_due_date": parse_date(summary.get("next_due_date")),
                    "due_count": summary.get("due_count", 0),
                    "overdue_count": summary.get("overdue_count", 0),
                    "administered_count": summary.get("administered_count", 0),
                    "is_zero_dose": summary.get("is_zero_dose", False),
                    "last_evaluated_at": timezone.now(),
                },
            )
            disease_schedules = row.get("disease_schedules", [])
            self.validate_patient_disease_schedules(disease_schedules, key)
            self.load_patient_disease_schedules(patient, disease_schedules)
            self.load_patient_schedule_slots(patient, row.get("schedule_slots", []), disease_schedules)
        return len(rows)

    def validate_patient_disease_schedules(self, rows, patient_key):
        diseases = {row.get("disease") for row in rows}
        missing = SUPPORTED_DISEASES - diseases
        extra = diseases - SUPPORTED_DISEASES
        if missing or extra:
            detail = []
            if missing:
                detail.append(f"missing {', '.join(sorted(missing))}")
            if extra:
                detail.append(f"unsupported {', '.join(sorted(str(value) for value in extra))}")
            raise DemoDataError(
                f"Patient {patient_key} must include disease schedules for measles, polio, and cholera "
                f"({'; '.join(detail)})."
            )

    def load_patient_disease_schedules(self, patient, rows):
        for row in rows:
            disease = required_disease(row.get("disease"), "patient disease schedule")
            is_complete = row.get("is_complete", False)
            PatientDiseaseSchedule.objects.update_or_create(
                patient=patient,
                disease=disease,
                defaults={
                    "current_due_date": None if is_complete else parse_date(row.get("current_due_date")),
                    "status": row.get("status", PatientDiseaseSchedule.DiseaseStatus.SCHEDULED),
                    "is_complete": is_complete,
                    "completed_at": parse_datetime(row.get("completed_at")),
                    "status_reason": f"{self.namespace}: {row.get('status_reason', 'demo disease schedule')}",
                },
            )

    def load_patient_schedule_slots(self, patient, rows, disease_schedule_rows):
        slot_rows = list(rows)
        if not slot_rows:
            slot_rows = self.derive_schedule_slots(disease_schedule_rows)

        for row in slot_rows:
            vaccine_code = required(row, "vaccine_code", "patient schedule slot")
            vaccine = self.resolve_vaccine(vaccine_code)
            rule = self.resolve_schedule_rule(vaccine, row.get("dose_label") or vaccine_code)
            PatientVaccinationSchedule.objects.update_or_create(
                patient=patient,
                schedule_rule=rule,
                defaults={
                    "vaccine": vaccine,
                    "due_date": required_date(row, "due_date", "patient schedule slot"),
                    "status": row.get("status", PatientVaccinationSchedule.SlotStatus.SCHEDULED),
                    "status_reason": f"{self.namespace}: {row.get('status_reason', 'demo schedule slot')}",
                    "status_changed_at": parse_datetime(row.get("status_changed_at")) or timezone.now(),
                },
            )

    def derive_schedule_slots(self, disease_schedule_rows):
        rows = []
        for disease_row in disease_schedule_rows:
            if disease_row.get("is_complete") or not disease_row.get("current_due_date"):
                continue
            disease = required_disease(disease_row.get("disease"), "derived schedule slot")
            vaccine = self.default_vaccine_for_disease(disease)
            if not vaccine:
                continue
            rows.append(
                {
                    "vaccine_code": vaccine.vaccine_code,
                    "dose_label": vaccine.vaccine_code,
                    "due_date": disease_row.get("current_due_date"),
                    "status": disease_row.get("status", PatientVaccinationSchedule.SlotStatus.SCHEDULED),
                    "status_reason": disease_row.get("status_reason"),
                }
            )
        return rows

    def load_immunizations(self, rows):
        administered_by = self.default_user()
        for row in rows:
            key = required(row, "key", "immunization")
            patient = self.resolve_patient(required(row, "patient_key", f"immunization {key}"))
            vaccine = self.resolve_vaccine(required(row, "vaccine_code", f"immunization {key}"))
            batch = self.resolve_batch(row.get("batch_number"), required_value=False)
            facility = self.resolve_facility(row.get("facility_code"), required_value=False)
            disease = row.get("disease")
            if disease:
                disease = required_disease(disease, f"immunization {key}")

            event, _ = ImmunizationEvent.objects.update_or_create(
                local_client_record_id=self.key(key),
                defaults={
                    "patient": patient,
                    "schedule_slot": None,
                    "vaccine": vaccine,
                    "disease": disease,
                    "vaccine_batch": batch,
                    "administered_by": self.resolve_user(row.get("administered_by"), administered_by),
                    "facility": facility,
                    "administered_at": required_datetime(row, "administered_at", f"immunization {key}"),
                    "administration_route": row.get("route") or vaccine.default_route,
                    "administration_site": row.get("site") or vaccine.default_site,
                    "event_status": row.get("event_status", ImmunizationEvent.EventStatus.ADMINISTERED),
                    "next_due_date": parse_date(row.get("next_due_date")),
                    "disease_completed": row.get("disease_completed", False),
                    "source_channel": row.get("source_channel", ImmunizationEvent.SourceChannel.ONLINE),
                    "notes": row.get("notes"),
                },
            )
            self.refs["immunization_events"][key] = event
        return len(rows)

    def load_case_reports(self, rows):
        reported_by = self.default_user()
        for row in rows:
            key = required(row, "key", "case report")
            patient = self.resolve_patient(required(row, "patient_key", f"case report {key}"))
            facility = self.resolve_facility(row.get("facility_code"), required_value=False)
            event = self.resolve_immunization(row.get("aefi_immunization_key"), required_value=False)
            category = row.get("category", SurveillanceReport.Category.SYMPTOM)
            if category == SurveillanceReport.Category.AEFI and not event and not row.get("aefi_vaccine_code"):
                raise DemoDataError(
                    f"AEFI case report {key} must include aefi_immunization_key or aefi_vaccine_code."
                )
            if category != SurveillanceReport.Category.AEFI:
                required_disease(row.get("disease_suspected"), f"case report {key}")
            vaccine = self.resolve_vaccine(row.get("aefi_vaccine_code"), required_value=False) or (
                event.vaccine if event else None
            )
            batch = self.resolve_batch(row.get("aefi_batch_number"), required_value=False) or (
                event.vaccine_batch if event else None
            )
            report, _ = SurveillanceReport.objects.update_or_create(
                local_client_record_id=self.key(key),
                defaults={
                    "patient": patient,
                    "facility": facility,
                    "reported_by": self.resolve_user(row.get("reported_by"), reported_by),
                    "surveillance_category": category,
                    "condition_type": required(row, "condition_type", f"case report {key}"),
                    "disease_suspected": row.get("disease_suspected"),
                    "onset_date": required_date(row, "onset_date", f"case report {key}"),
                    "body_temperature_c": row.get("body_temperature_c"),
                    "severity": row.get("severity"),
                    "follow_up_required": row.get("follow_up_required", True),
                    "status": row.get("status", SurveillanceReport.Status.SUBMITTED),
                    "aefi_immunization_event": event,
                    "aefi_vaccine": vaccine,
                    "aefi_vaccine_batch": batch,
                    "vaccine_dose_label": row.get("vaccine_dose_label") or (vaccine.vaccine_code if vaccine else None),
                    "vaccination_date": parse_date(row.get("vaccination_date"))
                    or (event.administered_at.date() if event else None),
                    "lab_sample_taken": row.get("lab_sample_taken", False),
                    "specimen_status": row.get("specimen_status", SurveillanceReport.SpecimenStatus.NOT_COLLECTED),
                    "specimen_type": row.get("specimen_type"),
                    "specimen_collection_date": parse_date(row.get("specimen_collection_date")),
                    "lab_test_type": row.get("lab_test_type"),
                    "lab_result_status": row.get("lab_result_status"),
                    "lab_result_date": parse_date(row.get("lab_result_date")),
                    "lab_result_notes": row.get("lab_result_notes"),
                    "clinical_outcome": row.get("clinical_outcome"),
                    "clinical_outcome_date": parse_date(row.get("clinical_outcome_date")),
                    "outcome_notes": row.get("outcome_notes"),
                    "next_follow_up_date": parse_date(row.get("next_follow_up_date")),
                    "notes": row.get("notes"),
                },
            )
            report.symptoms.all().delete()
            for symptom in row.get("symptoms", []):
                SurveillanceSymptom.objects.create(
                    report=report,
                    symptom_code=symptom.get("code") or code_from_label(required(symptom, "label", f"symptom {key}")),
                    symptom_label=required(symptom, "label", f"symptom {key}"),
                    is_present=symptom.get("is_present", True),
                    observation_value=symptom.get("observation_value"),
                )
            self.refs["case_reports"][key] = report
        return len(rows)

    def load_follow_ups(self, rows):
        created_by = self.default_user()
        for row in rows:
            report = self.resolve_case_report(required(row, "case_key", "follow-up"))
            FollowUpAction.objects.update_or_create(
                report=report,
                action_taken=required(row, "action_taken", "follow-up"),
                defaults={
                    "assigned_to": self.resolve_user(row.get("assigned_to"), None),
                    "status": row.get("status", FollowUpAction.Status.OPEN),
                    "due_date": parse_date(row.get("due_date")),
                    "closed_at": parse_datetime(row.get("closed_at")),
                    "created_by": self.resolve_user(row.get("created_by"), created_by),
                },
            )
        return len(rows)

    def load_risk_scores(self, rows):
        for row in rows:
            unit = self.resolve_unit(row.get("unit_code"), row.get("unit_name"), context="risk score")
            disease = required_disease(row.get("disease"), "risk score")
            OutbreakRiskScore.objects.update_or_create(
                unit=unit,
                disease=disease,
                defaults={
                    "risk_score": required(row, "risk_score", "risk score"),
                    "computed_at": parse_datetime(row.get("computed_at")) or timezone.now(),
                    "model_version": f"{self.namespace}:{row.get('model_version', 'json-demo-v1')}",
                    "factors": row.get("factors", {}),
                },
            )
        return len(rows)

    def load_alerts(self, rows):
        for row in rows:
            unit = self.resolve_unit(row.get("unit_code"), row.get("unit_name"), context="public health alert")
            disease = required_disease(row.get("disease"), "public health alert")
            report = self.resolve_case_report(row.get("case_key"), required_value=False)
            alert = OutbreakAlert.objects.filter(
                unit=unit,
                disease_code=disease,
                notes__startswith=f"{self.namespace}:",
            ).first() or OutbreakAlert(unit=unit, disease_code=disease)
            alert.surveillance_report = report
            alert.alert_source = row.get("source", OutbreakAlert.AlertSource.PREDICTION)
            alert.risk_probability = row.get("risk_probability")
            alert.status = row.get("status", OutbreakAlert.Status.POTENTIAL)
            alert.triggered_at = parse_datetime(row.get("triggered_at")) or timezone.now()
            alert.verified_by = self.resolve_user(row.get("verified_by"), None)
            alert.verified_at = parse_datetime(row.get("verified_at"))
            alert.notes = f"{self.namespace}: {row.get('notes', 'demo public health alert')}"
            alert.save()
        return len(rows)

    def load_environmental(self, rows):
        for row in rows:
            unit = self.resolve_unit(row.get("unit_code"), row.get("unit_name"), context="environmental observation")
            MeteorologicalObservation.objects.update_or_create(
                unit=unit,
                observation_date=required_date(row, "observation_date", "environmental observation"),
                source=self.namespace,
                defaults={
                    "rainfall_mm": row.get("rainfall_mm"),
                    "temperature_c": row.get("temperature_c"),
                    "raw_payload": row.get("raw_payload", {}),
                },
            )
        return len(rows)

    def load_reports(self, rows):
        requested_by = self.default_user()
        for row in rows:
            definition, _ = ReportDefinition.objects.update_or_create(
                report_code=required(row, "report_code", "generated report"),
                defaults={
                    "report_name": row.get("report_name") or title_from_code(row["report_code"]),
                    "report_scope": row.get("report_scope", ReportDefinition.Scope.NATIONAL),
                    "definition_spec": row.get("definition_spec"),
                    "default_parameters": row.get("default_parameters"),
                    "description": row.get("description"),
                },
            )
            GeneratedReport.objects.create(
                report_definition=definition,
                requested_by=self.resolve_user(row.get("requested_by"), requested_by),
                facility=self.resolve_facility(row.get("facility_code"), required_value=False),
                unit=self.resolve_unit(
                    row.get("unit_code"),
                    row.get("unit_name"),
                    required_value=False,
                    context="generated report",
                ),
                output_format=self.normalize_report_output_format(row.get("output_format")),
                generation_status=self.normalize_report_status(row.get("status")),
                parameter_payload={**row.get("parameters", {}), "namespace": self.namespace},
                file_uri=row.get("file_uri"),
                requested_at=parse_datetime(row.get("requested_at")) or timezone.now(),
                completed_at=parse_datetime(row.get("completed_at")),
            )
        return len(rows)

    def ensure_schedule_version(self):
        version, _ = EpiScheduleVersion.objects.update_or_create(
            version_name=f"{self.namespace} schedule",
            defaults={
                "effective_from": timezone.localdate(),
                "status": EpiScheduleVersion.Status.ACTIVE,
                "notes": "JSON-loaded demo schedule.",
                "created_by": self.default_user(),
            },
        )
        return version

    def default_user(self):
        user = User.objects.filter(email__in=self.refs["users"].keys()).first()
        if user:
            return user
        user = User.objects.filter(role__role_code__in=["HEALTH_WORKER", "ADMIN"]).first()
        if user:
            return user
        role, _ = Role.objects.get_or_create(
            role_code="HEALTH_WORKER",
            defaults={"role_name": "Health Worker"},
        )
        return User.objects.create_user(
            email=f"{self.namespace}@nvoms.local",
            password="DemoPass123!",
            full_name="Demo Health Worker",
            role=role,
            status=User.Status.ACTIVE,
            is_active=True,
            must_change_password=False,
        )

    def key(self, value):
        return f"{self.namespace}:{value}"

    def resolve_unit(self, code=None, name=None, required_value=True, context=None):
        unit = None
        if code:
            unit = AdministrativeUnit.objects.filter(code=code).first()
        if unit is None and name:
            unit = AdministrativeUnit.objects.filter(name__iexact=name).first()
        if unit is None and self.auto_geography and (required_value or code or name):
            return self.auto_resolve_unit(code, name, context)
        if unit is None and required_value:
            raise DemoDataError(
                f"Administrative unit not found for code={code!r}, name={name!r}. "
                "Import geo data first, use an existing unit code/name, or pass --auto-geography "
                "for generated demo geography."
            )
        return unit

    def auto_resolve_unit(self, code=None, name=None, context=None):
        alias = code or name
        if not alias:
            self.geo_auto_counter += 1
            alias = f"auto:{context or 'unit'}:{self.geo_auto_counter}"
        if alias in self.geo_aliases:
            return self.geo_aliases[alias]

        pool = self.geo_pool_for_alias(alias)
        if not pool:
            raise DemoDataError(
                "No active woreda geography exists for automatic assignment. "
                "Run import_hdx_admin_boundaries before loading demo data."
            )

        index = stable_index(alias, len(pool))
        unit = pool[index]
        self.geo_aliases[alias] = unit
        if code or name:
            self.stdout.write(
                self.style.WARNING(
                    f"Mapped generated geography {alias!r} to {unit.code} – {unit.name}."
                )
            )
        return unit

    def geo_pool_for_alias(self, alias):
        self.ensure_geo_pools()
        region_code = None
        parts = [part for part in str(alias).upper().split("-") if part]
        for hint, code in self.REGION_HINTS.items():
            if hint in parts:
                region_code = code
                break

        regional_pool = self.geo_pools_by_region.get(region_code, []) if region_code else []
        for part in parts:
            terms = self.AREA_HINTS.get(part)
            if not terms:
                continue
            regional_matches = self.match_units_by_name(regional_pool, terms)
            if regional_matches:
                return regional_matches
            global_matches = self.match_units_by_name(self.geo_pool, terms)
            if global_matches:
                return global_matches

        if regional_pool:
            return regional_pool
        return self.geo_pool

    def match_units_by_name(self, units, terms):
        normalized_terms = [term.lower() for term in terms]
        return [
            unit
            for unit in units
            if any(term in unit.name.lower() for term in normalized_terms)
        ]

    def ensure_geo_pools(self):
        if self.geo_pool is not None:
            return

        units = list(
            AdministrativeUnit.objects.filter(is_active=True, level=AdministrativeUnit.Level.WOREDA)
            .select_related("parent__parent")
            .order_by("code")
        )
        self.geo_pool = units
        for unit in units:
            region = unit.parent.parent if unit.parent and unit.parent.parent else unit.parent
            if region:
                self.geo_pools_by_region[region.code].append(unit)

    def normalize_report_output_format(self, value):
        value = value or GeneratedReport.OutputFormat.PDF
        if value == "xlsx":
            return GeneratedReport.OutputFormat.CSV
        if value not in GeneratedReport.OutputFormat.values:
            return GeneratedReport.OutputFormat.PDF
        return value

    def normalize_report_status(self, value):
        value = value or GeneratedReport.GenerationStatus.COMPLETED
        if value == "queued":
            return GeneratedReport.GenerationStatus.PROCESSING
        if value not in GeneratedReport.GenerationStatus.values:
            return GeneratedReport.GenerationStatus.COMPLETED
        return value

    def resolve_facility(self, code, required_value=True):
        if not code:
            if required_value:
                raise DemoDataError("Facility code is required.")
            return None
        facility = self.refs["facilities"].get(code) or HealthFacility.objects.filter(facility_code=code).first()
        if facility is None and required_value:
            raise DemoDataError(f"Facility not found: {code}")
        return facility

    def resolve_user(self, email, fallback=None):
        if not email:
            return fallback
        user = self.refs["users"].get(email) or User.objects.filter(email=email).first()
        if user is None:
            raise DemoDataError(f"User not found: {email}")
        return user

    def resolve_caregiver(self, key):
        caregiver = self.refs["caregivers"].get(key) or Caregiver.objects.filter(local_client_record_id=self.key(key)).first()
        if caregiver is None:
            raise DemoDataError(f"Caregiver not found: {key}")
        return caregiver

    def resolve_patient(self, key):
        patient = self.refs["patients"].get(key) or Patient.objects.filter(local_client_record_id=self.key(key)).first()
        if patient is None:
            raise DemoDataError(f"Patient not found: {key}")
        return patient

    def resolve_vaccine(self, code, required_value=True):
        if not code:
            if required_value:
                raise DemoDataError("Vaccine code is required.")
            return None
        vaccine = self.refs["vaccines"].get(code) or VaccineDefinition.objects.filter(vaccine_code=code).first()
        if vaccine is None and required_value:
            raise DemoDataError(f"Vaccine not found: {code}")
        return vaccine

    def default_vaccine_for_disease(self, disease):
        for vaccine in self.refs["vaccines"].values():
            if vaccine.antigen and vaccine.antigen.code == disease:
                return vaccine
        return VaccineDefinition.objects.filter(antigen__code=disease, is_active=True).order_by("dose_sequence").first()

    def resolve_schedule_rule(self, vaccine, dose_label):
        key = f"{vaccine.vaccine_code}:{dose_label}"
        rule = self.refs["schedule_rules"].get(key)
        if rule is None:
            rule = EpiScheduleRule.objects.filter(vaccine=vaccine, dose_label=dose_label, is_active=True).first()
        if rule is None:
            rule = EpiScheduleRule.objects.filter(vaccine=vaccine, is_active=True).order_by("recommended_age_days").first()
        if rule is None:
            raise DemoDataError(f"Schedule rule not found for vaccine {vaccine.vaccine_code}.")
        return rule

    def resolve_batch(self, batch_number, required_value=True):
        if not batch_number:
            if required_value:
                raise DemoDataError("Batch number is required.")
            return None
        batch = self.refs["batches"].get(batch_number) or VaccineBatch.objects.filter(batch_number=batch_number).first()
        if batch is None and required_value:
            raise DemoDataError(f"Batch not found: {batch_number}")
        return batch

    def resolve_immunization(self, key, required_value=True):
        if not key:
            if required_value:
                raise DemoDataError("Immunization key is required.")
            return None
        event = self.refs["immunization_events"].get(key) or ImmunizationEvent.objects.filter(local_client_record_id=self.key(key)).first()
        if event is None and required_value:
            raise DemoDataError(f"Immunization not found: {key}")
        return event

    def resolve_case_report(self, key, required_value=True):
        if not key:
            if required_value:
                raise DemoDataError("Case report key is required.")
            return None
        report = self.refs["case_reports"].get(key) or SurveillanceReport.objects.filter(local_client_record_id=self.key(key)).first()
        if report is None and required_value:
            raise DemoDataError(f"Case report not found: {key}")
        return report


def required(row, field, context):
    value = row.get(field)
    if value in (None, ""):
        raise DemoDataError(f"Missing required field '{field}' in {context}.")
    return value


def required_date(row, field, context):
    return parse_date(required(row, field, context))


def required_datetime(row, field, context):
    return parse_datetime(required(row, field, context))


def parse_date(value):
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    return date.fromisoformat(str(value))


def parse_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed)
    return parsed


def required_disease(value, context):
    if value not in SUPPORTED_DISEASES:
        raise DemoDataError(
            f"Invalid disease {value!r} in {context}. Use one of: {', '.join(sorted(SUPPORTED_DISEASES))}."
        )
    return value


def title_from_code(value):
    return str(value).replace("_", " ").replace("-", " ").title()


def code_from_label(value):
    return "".join(character if character.isalnum() else "_" for character in value).strip("_").upper()


def stable_index(value, size):
    return sum((index + 1) * ord(character) for index, character in enumerate(str(value))) % size
