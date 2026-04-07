# NVOMS Database Verification Against Functional Requirements

## Verification Result

The database design is sufficient to meet the functional requirements of the National Vaccination and Outbreak Monitoring System when used together with the application services defined in the project architecture.

Important distinction:

- the database provides the data structures, constraints, relationships, and persistence needed for the requirements
- some requirements such as authentication, visualization, report rendering, and SMS delivery still need application and service logic above the database

There are no blocking schema gaps for FR1 to FR21.

## Requirement Traceability

| FR | Requirement summary | Supporting tables | Verification |
|---|---|---|---|
| FR1 | Role-based user account creation and management | `roles`, `permissions`, `role_permissions`, `users`, `audit_logs` | Supported |
| FR2 | Secure authentication and authorization | `users`, `user_sessions`, `roles`, `permissions`, `role_permissions`, `audit_logs` | Supported by database + auth service |
| FR3 | Password recovery and admin account management | `users`, `password_reset_tokens`, `audit_logs` | Supported |
| FR4 | Register patient demographics and link to caregiver | `patients`, `caregivers`, `administrative_units`, `health_facilities` | Supported |
| FR5 | Generate unique persistent UID for each patient | `patients.uid`, `patient_duplicate_cases` | Supported |
| FR6 | Maintain full digital vaccination history | `patients`, `patient_vaccination_schedules`, `immunization_events`, `schedule_status_events` | Supported |
| FR7 | Generate vaccination schedules from EPI guidelines | `epi_schedule_versions`, `epi_schedule_rules`, `patient_vaccination_schedules` | Supported |
| FR8 | Record administered doses with metadata | `immunization_events`, `vaccine_batches`, `vaccine_definitions`, `health_facilities`, `users` | Supported |
| FR9 | Offline recording and central synchronization | `device_registrations`, `sync_batches`, `sync_batch_items`, `immunization_events`, `surveillance_reports` | Supported |
| FR10 | Identify zero-dose and defaulter patients | `patient_immunization_status`, `patient_vaccination_schedules`, `schedule_status_events`, `defaulter_clusters` | Supported |
| FR11 | Record surveillance observations | `surveillance_reports`, `surveillance_symptoms`, `patients`, `fhir_exchange_logs` | Supported |
| FR12 | Send reminder SMS for upcoming appointments | `message_templates`, `sms_notifications`, `notification_attempts`, `patient_vaccination_schedules`, `caregivers` | Supported |
| FR13 | Send missed-appointment alerts | `message_templates`, `sms_notifications`, `notification_attempts`, `patient_vaccination_schedules`, `caregivers` | Supported |
| FR14 | Detect high-dropout and high-risk clusters | `prediction_runs`, `prediction_scores`, `defaulter_clusters`, `patient_immunization_status`, `administrative_units` | Supported |
| FR15 | Ingest meteorological data | `environmental_observations`, `integration_endpoints`, `integration_jobs` | Supported |
| FR16 | Execute outbreak prediction models | `model_registry`, `prediction_runs`, `prediction_scores`, `environmental_observations`, `patient_immunization_status` | Supported |
| FR17 | Visualize risk levels and silent districts | `prediction_scores`, `administrative_units.boundary_geojson`, `outbreak_alerts` | Supported by database + analytics UI |
| FR18 | Generate configurable reports | `report_definitions`, `generated_reports`, `patient_immunization_status`, `prediction_scores`, `surveillance_reports` | Supported |
| FR19 | Export reports in standard formats | `generated_reports` | Supported by database + reporting service |
| FR20 | HL7 FHIR mapping for Patient, Immunization, Observation | `fhir_exchange_logs`, `patients`, `immunization_events`, `surveillance_reports` | Supported |
| FR21 | Exchange data with DHIS2 and related platforms | `integration_endpoints`, `integration_jobs`, `dhis2_sync_batches`, `dhis2_sync_items`, `fhir_exchange_logs` | Supported |

## Why The Database Meets The Requirements

### 1. Core registry requirements are covered

The schema has a strong patient registry centered on:

- unique patient UID
- mandatory caregiver linkage
- duplicate review workflow
- location and facility linkage

This directly supports the report’s goal of reducing phantom coverage and zero-dose invisibility.

### 2. Immunization workflow requirements are covered

The vaccination design is separated into:

- national schedule rules
- patient-specific scheduled appointments
- actual immunization events
- schedule status history
- current immunization summary

This matches the state and activity diagrams very well.

### 3. Offline-first and alerting requirements are covered

The database includes:

- device registration
- sync batches and sync items
- SMS queue and retry history
- outbreak alerts

So the offline capture and notification flows shown in the diagrams are traceable in the data layer.

### 4. Analytics and interoperability requirements are covered

The schema stores:

- environmental observations
- model registry and prediction outputs
- hotspot cluster results
- DHIS2 sync logs
- FHIR exchange logs

That is enough to support the prediction, dashboard, and national interoperability workflows described in the report.

## Small Notes

1. FR2, FR17, and FR19 are not solved by the database alone because they also need application behavior.
2. The schema is still valid for them because the required data structures are present.
3. The current design intentionally excludes vaccine stock and cold-chain management because the report excludes logistics scope.

## Conclusion

Yes, the database design can meet the functional requirements of the project. The schema is consistent with the report, the use case diagram, the sequence diagrams, the activity diagrams, the state diagrams, and the layered service architecture.
