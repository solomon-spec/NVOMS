# Prompt: Generate NVOMS Demo Data JSON

Generate one valid JSON object for the NVOMS `load_demo_data` command. The data must look realistic for Ethiopia immunization and public-health workflows, and it must use only the existing administrative unit codes/names I provide.

Use this command target:

```bash
./nvoms_env/bin/python manage.py load_demo_data demo-data.json --namespace quality-demo --reset --auto-geography
```

If the generated JSON uses realistic-but-not-exact local geography codes, `--auto-geography` will map them to the imported HDX woredas. Exact `AdministrativeUnit.code` values are still preferred when available.

Before loading demo data, import the provided geography dataset:

```bash
./nvoms_env/bin/python manage.py import_hdx_admin_boundaries --source ../data/datasets/eth_admin_boundaries.xlsx --geojson-source ../data/datasets/eth_admin_boundaries.shp.zip
```

## Existing Geography

Use these administrative unit codes exactly. Do not invent new geography. Assign every caregiver, patient, risk score, alert, environmental observation, and generated report to one of these codes.

I will paste the geography from NVOMS using a command like:

```bash
./nvoms_env/bin/python manage.py shell -c "from django.db.models import F; from geography.models import AdministrativeUnit; import json; print(json.dumps(list(AdministrativeUnit.objects.filter(is_active=True).values('code','name','level', parent_code=F('parent__code'))), indent=2))"
```

For Addis Ababa-focused demo data, these real unit codes are especially useful:

```json
[
  { "code": "ET14", "name": "Addis Ababa", "level": "region", "parent_code": "ET" },
  { "code": "ET140101", "name": "Akaki Kality Sub City", "level": "woreda", "parent_code": "ET1401" },
  { "code": "ET140102", "name": "Nifas Silk Lafto Sub City", "level": "woreda", "parent_code": "ET1401" },
  { "code": "ET140103", "name": "Kolfe Keraniyo Sub City", "level": "woreda", "parent_code": "ET1401" },
  { "code": "ET140104", "name": "Bole Sub City", "level": "woreda", "parent_code": "ET1401" },
  { "code": "ET140107", "name": "Yeka Sub City", "level": "woreda", "parent_code": "ET1401" },
  { "code": "ET140108", "name": "Addis Ketema Sub City", "level": "woreda", "parent_code": "ET1401" }
]
```

```json
PASTE_EXISTING_ADMIN_UNITS_HERE
```

Each geography row I paste will include at least:

```json
{
  "code": "string",
  "name": "string",
  "level": "country|region|zone|woreda|kebele",
  "parent_code": "string or null"
}
```

## Output Requirements

Return only JSON. No markdown, no comments, no prose.

The top-level object must contain:

- `metadata`
- `facilities`
- `users`
- `vaccines`
- `caregivers`
- `patients`
- `immunizations`
- `case_reports`
- `follow_ups`
- `risk_scores`
- `public_health_alerts`
- `environmental_observations`
- `generated_reports`

## Data Quality Requirements

Create a realistic medium-sized demo dataset:

- 6 to 10 health facilities with Ethiopian-style names and stable facility codes.
- 6 to 10 users across roles: `ADMIN`, `HEALTH_WORKER`, `PUBLIC_HEALTH_OFFICIAL`.
- Vaccine setup only for the app-supported diseases: `measles`, `polio`, `cholera`.
- Use vaccine products such as:
  - `MCV1` / Measles-Rubella Vaccine Dose 1
  - `OPV3` / Bivalent Oral Polio Vaccine Dose 3
  - `OCV1` / Oral Cholera Vaccine Dose 1
- Include realistic batches with manufacturer, expiry date, and validity.
- 40 to 80 caregivers.
- 50 to 100 patients, with realistic Ethiopian names, phone numbers, age distribution, sex, residence units, facilities, and caregiver links.
- Every patient must have 3 disease schedules: measles, polio, cholera.
- Add schedule slots for upcoming vaccine work so the registry/immunization pages are not empty.
- Patient states should be mixed:
  - up to date
  - due soon
  - overdue
  - missed follow-up / defaulter
  - zero dose
- 80 to 180 immunization events across the three supported diseases.
- 12 to 25 case reports:
  - Some AEFI reports linked to vaccine/batch/vaccination date.
  - Some suspected vaccine-preventable disease reports for measles, polio, or cholera.
  - Include symptoms, onset date, severity, status, lab/specimen fields, clinical outcome, and next follow-up date when relevant.
- 10 to 25 follow-up actions linked to case reports.
- 10 to 20 public-health risk scores using the provided geography.
- 5 to 12 public-health alerts linked to risk and optionally to case reports.
- 20 to 40 environmental observations across multiple units and dates.
- 5 to 10 generated reports.

## JSON Shape

Use this exact field style.

```json
{
  "metadata": {
    "namespace": "quality-demo",
    "description": "Realistic NVOMS demo data for case reporting, vaccination work, and public health monitoring."
  },
  "facilities": [
    {
      "code": "DEMO-HC-001",
      "name": "Addis Ketema Health Center"
    }
  ],
  "users": [
    {
      "email": "marta.alemu@nvoms.demo",
      "password": "DemoPass123!",
      "full_name": "Marta Alemu",
      "role": "HEALTH_WORKER",
      "facility_code": "DEMO-HC-001",
      "phone_number": "+251911000101",
      "preferred_language": "am"
    }
  ],
  "vaccines": [
    {
      "code": "MCV1",
      "name": "Measles-Rubella Vaccine Dose 1",
      "antigen_code": "measles",
      "antigen_name": "Measles",
      "dose_sequence": 1,
      "route": "SC",
      "site": "Left upper arm",
      "batches": [
        {
          "batch_number": "MR-ADD-2026-041",
          "manufacturer": "Bio Farma",
          "expiry_date": "2027-12-31",
          "is_valid": true
        }
      ],
      "schedule_rules": [
        {
          "dose_label": "MCV1",
          "recommended_age_days": 270,
          "grace_period_days": 7,
          "defaulter_threshold_days": 14
        }
      ]
    }
  ],
  "caregivers": [
    {
      "key": "cg-001",
      "full_name": "Hirut Tesfaye",
      "phone_number": "+251911220001",
      "relationship_to_patient": "mother",
      "preferred_language": "am",
      "residence_unit_code": "USE_EXISTING_UNIT_CODE",
      "address_line": "Near the health post"
    }
  ],
  "patients": [
    {
      "key": "pat-001",
      "caregiver_key": "cg-001",
      "first_name": "Liya",
      "middle_name": "Marta",
      "last_name": "Tesfaye",
      "sex": "female",
      "date_of_birth": "2025-02-14",
      "facility_code": "DEMO-HC-001",
      "residence_unit_code": "USE_EXISTING_UNIT_CODE",
      "status": "registered",
      "immunization_summary": {
        "current_status": "due_soon",
        "next_due_date": "2026-05-25",
        "due_count": 1,
        "overdue_count": 0,
        "administered_count": 2,
        "is_zero_dose": false
      },
      "disease_schedules": [
        {
          "disease": "measles",
          "current_due_date": "2026-05-25",
          "status": "due_soon",
          "is_complete": false,
          "status_reason": "MCV follow-up due soon"
        }
      ],
      "schedule_slots": [
        {
          "vaccine_code": "MCV1",
          "dose_label": "MCV1",
          "due_date": "2026-05-25",
          "status": "due_soon",
          "status_reason": "MCV follow-up due soon"
        }
      ]
    }
  ],
  "immunizations": [
    {
      "key": "imm-001",
      "patient_key": "pat-001",
      "disease": "polio",
      "vaccine_code": "OPV3",
      "batch_number": "BOPV-ADD-2026-118",
      "facility_code": "DEMO-HC-001",
      "administered_by": "marta.alemu@nvoms.demo",
      "administered_at": "2026-04-18T09:20:00+03:00",
      "route": "Oral",
      "site": "Mouth",
      "event_status": "administered",
      "next_due_date": null,
      "disease_completed": true,
      "notes": "Child tolerated vaccine well."
    }
  ],
  "case_reports": [
    {
      "key": "case-aefi-001",
      "patient_key": "pat-001",
      "facility_code": "DEMO-HC-001",
      "reported_by": "marta.alemu@nvoms.demo",
      "category": "aefi",
      "condition_type": "Fever and injection-site swelling after vaccination",
      "disease_suspected": null,
      "onset_date": "2026-04-19",
      "body_temperature_c": "38.6",
      "severity": "moderate",
      "follow_up_required": true,
      "status": "under_follow_up",
      "aefi_immunization_key": "imm-001",
      "aefi_vaccine_code": "OPV3",
      "aefi_batch_number": "BOPV-ADD-2026-118",
      "vaccine_dose_label": "OPV3",
      "vaccination_date": "2026-04-18",
      "specimen_status": "not_collected",
      "lab_result_status": "not_sent",
      "clinical_outcome": "recovering",
      "next_follow_up_date": "2026-04-22",
      "notes": "Caregiver advised to return if fever persists.",
      "symptoms": [
        {
          "label": "Fever",
          "observation_value": "38.6 C"
        }
      ]
    }
  ],
  "follow_ups": [
    {
      "case_key": "case-aefi-001",
      "action_taken": "Phone follow-up with caregiver and check fever resolution.",
      "assigned_to": "marta.alemu@nvoms.demo",
      "due_date": "2026-04-22",
      "status": "open"
    }
  ],
  "risk_scores": [
    {
      "unit_code": "USE_EXISTING_UNIT_CODE",
      "disease": "measles",
      "risk_score": "0.7600",
      "computed_at": "2026-05-17T08:30:00+03:00",
      "model_version": "json-demo-v1",
      "factors": {
        "missed_followups": 18,
        "recent_case_reports": 2,
        "coverage_gap": 0.21
      }
    }
  ],
  "public_health_alerts": [
    {
      "unit_code": "USE_EXISTING_UNIT_CODE",
      "disease": "measles",
      "source": "prediction",
      "risk_probability": "0.7600",
      "status": "under_review",
      "triggered_at": "2026-05-17T08:45:00+03:00",
      "notes": "High missed-follow-up pressure and two suspected reports in the last week."
    }
  ],
  "environmental_observations": [
    {
      "unit_code": "USE_EXISTING_UNIT_CODE",
      "observation_date": "2026-05-16",
      "rainfall_mm": "17.4",
      "temperature_c": "23.1",
      "raw_payload": {
        "source": "demo weather station"
      }
    }
  ],
  "generated_reports": [
    {
      "report_code": "COVERAGE",
      "report_name": "Vaccination Coverage Report",
      "report_scope": "woreda",
      "requested_by": "marta.alemu@nvoms.demo",
      "facility_code": "DEMO-HC-001",
      "unit_code": "USE_EXISTING_UNIT_CODE",
      "output_format": "pdf",
      "status": "completed",
      "requested_at": "2026-05-16T16:00:00+03:00",
      "completed_at": "2026-05-16T16:02:00+03:00",
      "parameters": {
        "date_from": "2026-04-01",
        "date_to": "2026-05-16"
      }
    }
  ]
}
```

## Rules

- Use only these diseases: `measles`, `polio`, `cholera`.
- Use only valid patient sex values: `male`, `female`, `other`, `unknown`.
- Use only valid patient summary statuses: `up_to_date`, `due_soon`, `overdue`, `defaulter`, `zero_dose`, `unknown`.
- Use only valid disease schedule statuses: `not_started`, `scheduled`, `due_soon`, `due_today`, `overdue`, `protected`, `completed`, `refused`, `contraindicated`.
- Use only valid schedule slot statuses: `scheduled`, `pending`, `due_soon`, `due_today`, `overdue`, `defaulter`, `administered`, `exempt`, `cancelled`.
- Use only valid case categories: `aefi`, `symptom`, `lab_follow_up`.
- Use only valid case statuses: `submitted`, `queued`, `under_follow_up`, `closed`.
- Use only valid case severity values: `low`, `moderate`, `high`, `critical`.
- Use only valid specimen statuses: `not_collected`, `pending`, `collected`, `sent`, `received`.
- Use only valid lab result statuses: `not_sent`, `pending`, `positive`, `negative`, `inconclusive`.
- Use only valid clinical outcomes: `unknown`, `recovering`, `recovered`, `hospitalized`, `referred`, `transferred`, `deceased`.
- For non-AEFI case reports, `disease_suspected` is required and must be `measles`, `polio`, or `cholera`.
- For AEFI case reports, include either `aefi_immunization_key` or `aefi_vaccine_code`; include batch and vaccination date when known.
- Use realistic dates around 2025-2026.
- Use ISO date strings: `YYYY-MM-DD`.
- Use ISO datetime strings with timezone: `YYYY-MM-DDTHH:MM:SS+03:00`.
- Every reference must resolve:
  - `caregiver_key` must exist in `caregivers`.
  - `patient_key` must exist in `patients`.
  - `vaccine_code` must exist in `vaccines`.
  - `batch_number` must exist in the vaccine batches.
  - `facility_code` must exist in `facilities`.
  - `unit_code` must exist in the geography I pasted.
- Make names, notes, symptoms, and outcomes varied and clinically plausible.
- Avoid placeholder text, joke names, impossible dates, duplicate phone numbers, or random strings.
