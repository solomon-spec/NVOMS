# Chapter Five: System Implementation

This chapter presents the implementation direction of the proposed National Vaccination and Outbreak Monitoring System. At the current stage of development, the implementation work is being organized around an API-first workflow so that the web, backend, and machine learning teams can work in parallel while still sharing stable contracts.

## 5.1 Implementation Approach

The implementation follows a modular monolith pattern using Express.js with TypeScript for the backend API, a web client organized by features on the frontend, and a separate machine learning workspace for outbreak prediction and risk scoring. Instead of starting with code-first endpoint development, the system is being implemented contract-first using OpenAPI. This approach provides a shared reference for request formats, response structures, authentication rules, validation expectations, and module boundaries before full coding begins.

The main implementation workspaces are organized under the technical implementation folder as follows:

- backend API contracts and module structure under `technical-implementation/backend/api/`
- frontend feature structure under `technical-implementation/frontend/web/`
- data and reference datasets under `technical-implementation/data/`
- machine learning workflows under `technical-implementation/ml/`

This structure supports independent work while preserving a common interface across the system.

## 5.2 Backend API Contract Development

The backend API documentation is now consolidated as a single resolved OpenAPI specification under `technical-implementation/backend/api/openapi/openapi.yaml`. The synchronized contract uses OpenAPI `3.0.3`, is titled `NVOMS API`, and is versioned as `1.1.0`.

This final contract now serves as the current documentation baseline for the implementation workspace. It documents 18 tagged functional areas and 77 path entries, covering both the public-facing workflows and the supporting administrative, analytics, interoperability, and operational interfaces required by the wider system design.

The contract workflow now emphasizes:

- one resolved specification for the current final API documentation
- OpenAPI linting support inside the backend workspace
- Ethiopia-context examples and field names aligned to the project domain

Supporting implementation note:

- API contract status note: `documentation/assets/chapter-5-implementation/NVOMS_API_CONTRACT_STATUS.md`

## 5.3 Finalized Contract Modules

The finalized API documentation covers the major functional areas identified in the system requirements, subsystem decomposition, and implementation planning. Instead of documenting only the clinical and reporting surface, the contract now also includes user administration, geography and facility master data, schedule rules, environmental ingestion, interoperability endpoints, and operational audit functions.

### 5.3.1 Authentication and Account Security

The authentication portion of the contract documents the complete account-access lifecycle. It includes user login, token refresh, session logout, password-reset request and confirmation, and authenticated password change. These endpoints define the security baseline for the entire platform and make account-state handling explicit through standardized success and error responses.

Main endpoints:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `POST /auth/change-password`

### 5.3.2 User Administration, Roles, Geography, and Caregiver Foundations

The finalized documentation now includes the administrative foundation needed to operate the system across different levels of the health structure. It covers user-account management, role and permission assignment, administrative units, facility records, and caregiver profiles. This creates a clearer contract for access control, deployment hierarchy, and patient-contact linkage than the earlier draft.

Main endpoints:

- `GET /users`
- `POST /users`
- `GET /users/{user_id}`
- `PATCH /users/{user_id}`
- `POST /users/{user_id}/unlock`
- `GET /roles`
- `GET /roles/{role_id}/permissions`
- `PUT /roles/{role_id}/permissions/{permission_id}`
- `GET /admin-units`
- `GET /facilities`
- `GET /caregivers`
- `POST /caregivers`

### 5.3.3 Patient Registry and Vaccine Reference Data

The patient-registry contract has been broadened beyond basic registration. It now documents patient search, duplicate review, immunization-status retrieval, and supporting vaccine and EPI schedule reference data. This better reflects the practical workflows required in a vaccination information system where clean identity matching and schedule-rule traceability are essential.

Main endpoints:

- `GET /patients`
- `POST /patients`
- `GET /patients/search`
- `GET /patients/duplicates`
- `PATCH /patients/duplicates/{duplicate_case_id}`
- `GET /patients/{uid}`
- `GET /patients/{uid}/immunization-status`
- `GET /vaccines`
- `GET /epi-schedules`
- `GET /epi-schedules/{schedule_version_id}/rules`
- `GET /vaccine-batches`

### 5.3.4 Immunization Workflow

The immunization contract now documents the full schedule and dose-management lifecycle. In addition to recording administered doses, it includes schedule retrieval, schedule-history review, schedule regeneration when rules or patient details change, and defaulter-oriented views that support follow-up activity. This aligns the API more closely with the operational behavior expected from the proposed system.

Main endpoints:

- `POST /patients/{uid}/immunizations`
- `GET /patients/{uid}/schedule`
- `GET /patients/{uid}/schedule/{patient_schedule_id}/history`
- `POST /patients/{uid}/schedule/regenerate`
- `GET /immunizations/defaulters`

### 5.3.5 Surveillance, Follow-Up, and Outbreak Alerts

The surveillance area now covers both event capture and response management. The contract documents patient-linked surveillance submissions, general surveillance reporting, follow-up case review and update, and outbreak-alert lifecycle management. This provides a clearer bridge between individual clinical observations and public-health escalation workflows.

Main endpoints:

- `POST /patients/{uid}/surveillance`
- `GET /surveillance`
- `POST /surveillance`
- `GET /surveillance/{surveillance_report_id}`
- `GET /surveillance/follow-up-cases`
- `GET /surveillance/follow-up-cases/{case_id}`
- `PATCH /surveillance/follow-up-cases/{case_id}`
- `GET /outbreak-alerts`
- `PATCH /outbreak-alerts/{outbreak_alert_id}`

### 5.3.6 Notifications and Offline Synchronization

The finalized contract also strengthens the operational workflows needed for field use. Notification endpoints cover message templates, trigger operations, delivery history, and attempt tracking. Offline synchronization endpoints cover device registration, batch upload, batch inspection, and record-level conflict resolution for low-connectivity environments.

Main endpoints:

- `GET /message-templates`
- `PATCH /message-templates/{template_id}`
- `POST /notifications/trigger`
- `GET /notifications`
- `GET /notifications/{sms_notification_id}/attempts`
- `POST /devices`
- `POST /sync/batch`
- `GET /sync/batches`
- `GET /sync/batches/{sync_batch_id}/items`
- `POST /sync/batches/{sync_batch_id}/items/{sync_batch_item_id}/resolve`

### 5.3.7 Analytics, Environmental Data, and Prediction

The analytics and prediction sections now reflect the decision-support emphasis of the project more clearly than the earlier draft. The contract includes coverage analytics, dashboard trends, risk-map outputs, defaulter clusters, environmental observations, weather ingestion, model listing, and prediction-run creation and review. This makes the relationship between surveillance, environmental context, and outbreak prediction explicit in the API documentation.

Main endpoints:

- `GET /analytics/coverage`
- `GET /analytics/dashboard-trends`
- `GET /analytics/risk-map`
- `GET /analytics/defaulter-clusters`
- `POST /analytics/environmental`
- `GET /analytics/environmental`
- `POST /integrations/weather/ingest`
- `GET /models`
- `POST /prediction/run`
- `GET /prediction/runs`
- `GET /prediction/runs/{prediction_run_id}`

### 5.3.8 Reporting, Interoperability, and System Administration

The final contract completes the broader enterprise-facing surface of the platform. It documents report definitions, report generation and download, integration-endpoint configuration, DHIS2 synchronization, HL7 FHIR exchange, system-setting access, and audit-log review. These interfaces are important because they connect the core vaccination workflows to external platforms, operational reporting, and accountability controls.

Main endpoints:

- `GET /report-definitions`
- `POST /reports/generate`
- `GET /reports`
- `GET /reports/download/{generated_report_id}`
- `GET /integrations/endpoints`
- `PATCH /integrations/endpoints/{endpoint_id}`
- `POST /integrations/dhis2/sync`
- `GET /integrations/dhis2/sync/batches`
- `GET /fhir/Patient/{uid}`
- `POST /fhir/Immunization`
- `POST /fhir/Observation`
- `GET /fhir/Patient/{uid}/bundle`
- `GET /integrations/fhir/logs`
- `GET /system/settings`
- `PATCH /system/settings/{setting_key}`
- `GET /audit-logs`

## 5.4 Importance of the Finalized Contract

The finalized API contract provides several practical advantages for the project.

- It gives the backend team a stable implementation target across the full user, clinical, analytics, and interoperability surface.
- It allows the frontend team to design registration, reporting, dashboard, and administration workflows against a consistent interface.
- It creates a clearer contract between the transactional backend and the prediction or analytics services.
- It improves documentation quality for the final report by turning functional requirements into concrete, reviewable request and response definitions.
- It reduces ambiguity for later implementation, testing, and demonstration work because the main operational workflows are now explicitly named and structured.

## 5.5 Current Implementation Status

The current implementation status can be summarized as follows:

- the backend and frontend folder structures have been prepared
- the repository now includes the finalized resolved OpenAPI contract as `technical-implementation/backend/api/openapi/openapi.yaml`
- the documented API surface now spans 18 tagged areas and 77 path entries
- the contract now covers authentication, administration, roles, geography, caregivers, patients, vaccine references, immunization, surveillance, outbreak alerts, notifications, offline synchronization, analytics, environmental data, prediction, reporting, interoperability, and system or audit workflows
- the earlier baseline comparison remains available in `documentation/assets/chapter-5-implementation/NVOMS_API_COVERAGE_MATRIX.md`

This updated documentation baseline gives the project a more complete and consistent implementation reference for the remaining development work.
