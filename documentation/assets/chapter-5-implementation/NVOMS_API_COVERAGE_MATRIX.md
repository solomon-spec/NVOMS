# NVOMS OpenAPI Coverage Matrix

This matrix captures the baseline comparison between the broader NVOMS system documentation and the OpenAPI contract that existed before the current expansion pass. It is intended to serve as a reference point while the API contract is broadened to cover as much of the documented system scope as possible.

Status labels:

- `Covered`: directly represented by an endpoint and schema set in the OpenAPI contract
- `Partial`: partly represented, but key behaviors, payloads, or lifecycle actions are missing
- `Missing`: described elsewhere in the documentation, but not represented in the OpenAPI contract

## Functional Requirements Baseline

| ID | Requirement Summary | Baseline Status | Baseline Notes | Planned Contract Additions |
| --- | --- | --- | --- | --- |
| FR1 | Role-based user account creation and management | Missing | Login existed, but user lifecycle management was not documented. | Add admin user management endpoints and account schemas. |
| FR2 | Secure authentication and authorization | Partial | Login and refresh existed, but account state and password-change flows were incomplete. | Add password reset, password change, richer session user metadata, and admin lifecycle states. |
| FR3 | Password recovery and administrative account management | Missing | No reset or admin account endpoints. | Add reset request/confirm, unlock, and admin account update flows. |
| FR4 | Register patients and link caregivers | Covered | `POST /patients` captured patient and caregiver data. | Keep current coverage. |
| FR5 | Generate persistent patient UID | Covered | UID was present in patient responses. | Keep current coverage. |
| FR6 | Maintain complete digital vaccination history | Partial | Schedule and dose recording existed, but no dedicated immunization-event read API. | Add immunization history retrieval endpoint. |
| FR7 | Automatically generate vaccination schedules | Partial | Schedule retrieval existed, but regeneration/config-driven refresh was not documented. | Add schedule regeneration endpoint and richer schedule state coverage. |
| FR8 | Record administered vaccine doses with metadata | Covered | Immunization recording included route, site, and batch metadata. | Keep current coverage. |
| FR9 | Offline recording and synchronization | Partial | Device registration, batch upload, and status existed, but conflict-resolution workflow was incomplete. | Add explicit manual conflict-resolution endpoint and acknowledgement fields. |
| FR10 | Identify zero-dose patients and defaulters | Partial | Follow-up cases referenced zero-dose and defaulter states, but management lifecycle was thin. | Add follow-up case detail/update coverage and broader analytics/reporting support. |
| FR11 | Record surveillance observations | Covered | Surveillance report creation and retrieval were documented. | Keep current coverage. |
| FR12 | Send appointment reminder SMS | Partial | Notifications existed, but templates and retry/audit detail were incomplete. | Add template and delivery-attempt documentation. |
| FR13 | Send missed-appointment alerts | Partial | Same gap as FR12. | Add template and retry coverage. |
| FR14 | Detect high-risk clusters | Missing | No cluster or hotspot endpoint. | Add defaulter-cluster analytics endpoint. |
| FR15 | Ingest meteorological data | Missing | Prediction referenced environmental data, but no ingestion contract existed. | Add weather ingestion and observation endpoints. |
| FR16 | Execute outbreak prediction models | Partial | Public prediction run and score endpoints existed, but internal ML contract was absent. | Add backend-to-ML prediction contract and richer run detail. |
| FR17 | Visualize risk levels and silent districts through dashboards and maps | Partial | Scores and alerts existed, but no geospatial map payload or trend/dashboard contract existed. | Add risk-map and dashboard-trend endpoints. |
| FR18 | Generate configurable reports | Partial | Report generation existed, but date-range and preview-style coverage was thin. | Expand report request schema for ranges and preview metadata. |
| FR19 | Export reports in standard formats | Covered | Report formats and download URLs were documented. | Keep current coverage and enrich report metadata. |
| FR20 | HL7 FHIR interoperability | Partial | Bulk export jobs existed, but direct request/response bundle exchange was incomplete. | Add patient-level FHIR bundle retrieval. |
| FR21 | Exchange data with DHIS2 and related platforms | Covered | DHIS2 synchronization jobs and job status were documented. | Keep current coverage. |

## Use Case Baseline

| ID | Use Case | Baseline Status | Baseline Notes | Planned Contract Additions |
| --- | --- | --- | --- | --- |
| UC-01 | Authenticate User | Covered | Login and refresh were documented. | Add account-state responses for completeness. |
| UC-02 | Manage User Accounts | Missing | No admin user endpoints. | Add list/create/get/update/unlock user endpoints. |
| UC-03 | Configure System Settings | Missing | No settings API existed. | Add settings retrieval/update endpoints. |
| UC-04 | Register Patient | Covered | Patient registration was documented. | Keep current coverage. |
| UC-05 | View Immunization Record | Partial | Patient details and schedule existed, but not full immunization-event history. | Add patient immunization history endpoint. |
| UC-06 | Record Vaccine Administration | Covered | Dose recording endpoint existed. | Keep current coverage. |
| UC-07 | Record Surveillance Data | Covered | Surveillance creation and retrieval were documented. | Keep current coverage. |
| UC-08 | View Analytics Dashboard | Partial | Only coverage summary was documented. | Add dashboard trends and hotspot-oriented analytics endpoints. |
| UC-09 | View Outbreak Risk Map | Partial | Prediction scores existed, but no map-ready geometry payload. | Add risk-map endpoint with GeoJSON-like boundaries. |
| UC-10 | Generate and Export Reports | Partial | Report jobs existed, but filtering and preview detail were limited. | Expand report request/response metadata. |
| UC-11 | Generate Vaccination Schedule | Partial | Schedule viewing existed, but regeneration/recomputation was not explicit. | Add schedule regeneration endpoint. |
| UC-12 | Sync Offline Data | Partial | Upload and status existed, but manual conflict-resolution flow was absent. | Add conflict-resolution endpoint. |
| UC-13 | Monitor Vaccination Status | Missing | Scheduler behavior was implied, not documented as contract surface. | Represent status lifecycle through schedule states and analytics/follow-up endpoints where externally relevant. |
| UC-14 | Identify Defaulters | Partial | Follow-up list existed, but case management lifecycle was incomplete. | Add follow-up case detail/update endpoint and cluster analytics. |
| UC-15 | Send Reminder SMS | Partial | Notification creation/history existed, but templates and attempts were not documented. | Add template and notification-attempt endpoints. |
| UC-16 | Send Missed Appointment Alert | Partial | Same gap as UC-15. | Add template and notification-attempt endpoints. |
| UC-17 | Detect High Defaulter Clusters | Missing | No dedicated hotspot/cluster contract existed. | Add defaulter-cluster analytics endpoint. |
| UC-18 | Predict Disease Outbreak | Partial | Public prediction runs existed, but ML-side contract and richer run state were not documented. | Add internal ML prediction job contract and run detail endpoint. |
| UC-19 | Ingest Meteorological Data | Missing | No weather ingestion or observation contract existed. | Add weather ingestion and observation endpoints. |
| UC-20 | Share Data with DHIS2 | Covered | DHIS2 sync jobs and status were documented. | Keep current coverage. |
| UC-21 | Exchange Data via FHIR | Partial | Export jobs existed, but direct FHIR bundle retrieval for external systems did not. | Add patient-level FHIR bundle endpoint. |

## Expansion Goals

The contract expansion should prioritize:

1. Administration and security lifecycle coverage
2. Complete immunization history and follow-up management coverage
3. Analytics, hotspot, and risk-map payloads
4. Weather ingestion and backend-to-ML prediction contracts
5. Offline conflict resolution and notification operational detail
6. Patient-level FHIR exchange in addition to bulk export jobs
