# 4.3.2 Subsystem Decomposition

Subsystem decomposition is used to divide the National Vaccination and Outbreak Monitoring System into manageable and logically related parts. This makes the architecture easier to understand, supports focused development, and allows each major system function to be implemented, tested, and maintained independently. Based on the project report and design diagrams, the system can be decomposed into the following subsystems.

## Overview

The decomposition follows the layered service-oriented architecture shown in the design:

- Presentation Layer
- Application Layer
- Data Layer
- Integration Layer

Within these layers, the system is divided into functional subsystems that align with the use cases, sequence diagrams, state diagrams, activity diagrams, and collaboration diagram.

## Subsystems

### 1. User Management and Security Subsystem

This subsystem manages user accounts, authentication, authorization, password recovery, and audit control.

Main responsibilities:

- create and manage role-based accounts for administrators, health workers, and public health officials
- enforce secure login and authorization rules
- support password reset and first-login password change
- lock accounts after repeated failed login attempts
- log security-sensitive activities for accountability

Main data:

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_sessions`
- `password_reset_tokens`
- `audit_logs`

Primary actors:

- Administrator
- Health Worker
- Public Health Official

### 2. Patient and Caregiver Registry Subsystem

This subsystem manages the registration of patients and caregivers and ensures that each patient has a unique identity in the system.

Main responsibilities:

- capture patient demographic details
- capture caregiver information
- generate and preserve a unique patient UID
- detect and review possible duplicate records
- maintain the core patient profile used by all other subsystems

Main data:

- `patients`
- `caregivers`
- `patient_duplicate_cases`
- `administrative_units`
- `health_facilities`

Primary actor:

- Health Worker

### 3. Vaccination Scheduling and Tracking Subsystem

This subsystem is responsible for the digital immunization workflow from vaccine schedule generation to dose history maintenance.

Main responsibilities:

- store national EPI schedule versions and rules
- generate patient-specific vaccine schedules after registration
- record vaccine administration details such as batch number, route, site, and date
- maintain vaccination appointment lifecycle states such as scheduled, due, overdue, defaulter, and administered
- keep an updated vaccination history for each patient

Main data:

- `vaccine_definitions`
- `epi_schedule_versions`
- `epi_schedule_rules`
- `patient_vaccination_schedules`
- `immunization_events`
- `vaccine_batches`
- `schedule_status_events`
- `patient_immunization_status`

Primary actors:

- Health Worker
- System Scheduler

### 4. Surveillance and Defaulter Monitoring Subsystem

This subsystem monitors clinical signals and vaccination follow-up conditions that require public health action.

Main responsibilities:

- record surveillance observations such as AFP, rash, fever, and AEFI
- flag patients requiring follow-up
- identify zero-dose children
- detect overdue and defaulter patients
- support outreach monitoring and case follow-up

Main data:

- `surveillance_reports`
- `surveillance_symptoms`
- `patient_immunization_status`
- `patient_vaccination_schedules`
- `outbreak_alerts`

Primary actors:

- Health Worker
- Public Health Official
- System Scheduler

### 5. Notification and Reminder Subsystem

This subsystem handles all automated messaging to caregivers and supports retention in the immunization program.

Main responsibilities:

- send reminder SMS for upcoming vaccinations
- send missed-appointment alerts for overdue vaccinations
- localize messages using caregiver language preferences
- manage SMS queueing, retries, and delivery tracking
- keep notification history for each patient and caregiver

Main data:

- `message_templates`
- `sms_notifications`
- `notification_attempts`

Primary actors and external systems:

- Caregiver
- SMS Gateway
- System Scheduler

### 6. Analytics and Dashboard Subsystem

This subsystem produces descriptive analytics for administrators and public health officials.

Main responsibilities:

- calculate coverage rates, dropout rates, zero-dose counts, and other KPIs
- aggregate data across facility, woreda, regional, and national levels
- provide dashboard-ready data for charts, indicators, and summaries
- support hotspot detection and analytical review

Main data:

- `patient_immunization_status`
- `prediction_scores`
- `defaulter_clusters`
- `generated_reports`
- `administrative_units`

Primary actors:

- Administrator
- Public Health Official

### 7. Prediction and Outbreak Alert Subsystem

This subsystem provides predictive decision support for early outbreak detection and risk mapping.

Main responsibilities:

- ingest model-ready health and environmental features
- run outbreak prediction models such as XGBoost and KNN
- assign risk scores to administrative units
- identify high-risk areas and silent districts
- generate outbreak alerts for further verification

Main data:

- `environmental_observations`
- `model_registry`
- `prediction_runs`
- `prediction_scores`
- `defaulter_clusters`
- `outbreak_alerts`

Primary actors:

- Public Health Official
- System Analytics Engine

### 8. Reporting and Interoperability Subsystem

This subsystem supports formal reporting and data exchange with external health platforms.

Main responsibilities:

- generate immunization and outbreak reports
- export reports in standard formats such as PDF and CSV
- map internal data to HL7 FHIR resources
- share aggregate and case-based data with DHIS2
- log exchange status, mapping errors, and import summaries

Main data:

- `report_definitions`
- `generated_reports`
- `integration_endpoints`
- `integration_jobs`
- `dhis2_sync_batches`
- `dhis2_sync_items`
- `fhir_exchange_logs`

Primary actors and external systems:

- Administrator
- Public Health Official
- DHIS2
- FHIR-based external systems

### 9. Offline Sync Subsystem

This subsystem supports data capture in low-connectivity environments and synchronization with the central database when connectivity is restored.

Main responsibilities:

- register devices used for field data capture
- queue offline transactions
- submit sync batches to the central server
- acknowledge successful synchronization
- flag conflicts for manual resolution

Main data:

- `device_registrations`
- `sync_batches`
- `sync_batch_items`

Primary actor:

- Health Worker

### 10. Data Management Subsystem

This subsystem provides the shared persistent data layer used by all application services.

Main responsibilities:

- enforce referential integrity and consistency
- store transactional, analytical, and integration data
- support secure storage and auditability
- maintain historical records for clinical, operational, and reporting processes

Main data stores:

- PostgreSQL database
- file storage for exported reports and external artifacts

## Subsystem Interaction Summary

The major interactions among the subsystems are as follows:

1. The User Management and Security Subsystem authenticates users before they access any other subsystem.
2. The Patient and Caregiver Registry Subsystem creates the patient record used by the Vaccination Scheduling and Tracking Subsystem.
3. The Vaccination Scheduling and Tracking Subsystem updates patient schedules and status values used by the Surveillance and Defaulter Monitoring Subsystem.
4. The Surveillance and Defaulter Monitoring Subsystem provides cases and status flags that can trigger the Notification and Reminder Subsystem and the Prediction and Outbreak Alert Subsystem.
5. The Prediction and Outbreak Alert Subsystem depends on the Analytics and Dashboard Subsystem, Environmental Data, and surveillance data to generate risk scores and alerts.
6. The Reporting and Interoperability Subsystem consumes data from the registry, vaccination, surveillance, analytics, and prediction subsystems to produce reports and exchange records with external systems.
7. The Offline Sync Subsystem connects field-level data capture with the central data layer and ensures eventual consistency.

## Summary Table

| Subsystem | Primary responsibility | Main consumers |
|---|---|---|
| User Management and Security | authentication, RBAC, password recovery, audit logging | all internal users |
| Patient and Caregiver Registry | patient identity, caregiver linkage, duplicate prevention | Health Worker, Vaccination subsystem |
| Vaccination Scheduling and Tracking | scheduling, dose recording, vaccination history | Health Worker, Notification subsystem |
| Surveillance and Defaulter Monitoring | symptom capture, zero-dose and defaulter tracking | Health Worker, Public Health Official |
| Notification and Reminder | SMS reminders and missed-dose alerts | Caregiver, Health Worker |
| Analytics and Dashboard | KPIs, aggregated indicators, hotspot analysis | Administrator, Public Health Official |
| Prediction and Outbreak Alert | outbreak prediction, risk scoring, silent district detection | Public Health Official |
| Reporting and Interoperability | reports, exports, FHIR mapping, DHIS2 exchange | Administrator, Public Health Official, external platforms |
| Offline Sync | local capture and later synchronization | Health Worker |
| Data Management | persistent storage and integrity control | all subsystems |

## Conclusion

The subsystem decomposition shows that the National Vaccination and Outbreak Monitoring System is modular, service-oriented, and suitable for phased development. Each subsystem has a clear responsibility, defined data ownership, and well-understood interactions with the others. This structure improves maintainability, scalability, and testability while also supporting the practical workflows described in the project report.
