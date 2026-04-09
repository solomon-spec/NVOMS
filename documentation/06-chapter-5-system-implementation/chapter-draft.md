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

The backend API documentation is being written as a split OpenAPI specification under `technical-implementation/backend/api/openapi/`. The split structure separates the root specification, path definitions, reusable parameters, reusable responses, security definitions, and shared schemas. This makes the contract easier to maintain and review than a single large file.

For tool compatibility, the split specification can also be bundled into a single file named `openapi.bundle.yaml`. That bundled file is intended for import into Postman and Swagger-based tools, while the split files remain the source of truth during documentation and implementation.

The contract workflow currently uses:

- split authoring files for clarity and maintainability
- bundled output for Postman and Swagger import
- OpenAPI linting to catch structural mistakes early
- realistic Ethiopia-context sample payloads to improve usability and domain relevance

Supporting implementation note:

- API contract status and workflow note: `documentation/assets/chapter-5-implementation/NVOMS_API_CONTRACT_STATUS.md`

## 5.3 Implemented Contract Modules

At the current stage, the detailed API documentation now covers the main public modules identified in the system design chapter.

### 5.3.1 Authentication Module

The authentication contract defines the entry points required for secure access to the system. It currently includes login and refresh-token workflows. The documented responses include the authenticated user profile, token metadata, and standardized error structures for invalid credentials and unauthorized access.

Main endpoints:

- `POST /auth/login`
- `POST /auth/refresh`

### 5.3.2 Registry Module

The registry contract defines the patient and caregiver registration workflow. It includes list or search behavior, patient creation, and patient retrieval by identifier. The documented request and response structures reflect the Ethiopian public health context and include caregiver linkage, region code, facility code, and current immunization status.

Main endpoints:

- `GET /patients`
- `POST /patients`
- `GET /patients/{patientId}`

### 5.3.3 Immunization Module

The immunization contract defines how the system exposes patient schedules and how completed vaccine doses are recorded. The schedule response is aligned to the Ethiopian EPI context and includes schedule versioning, antigen grouping, dose numbering, recommended age in weeks, and current schedule state. The dose-recording endpoint documents administration metadata such as route, site, source, facility, and responsible user.

Main endpoints:

- `GET /patients/{patientId}/schedule`
- `POST /patients/{patientId}/immunizations`

### 5.3.4 Analytics Module

The analytics contract currently includes a dashboard-oriented coverage summary endpoint. This endpoint provides aggregate values such as total registered children, fully immunized children, due cases, overdue cases, zero-dose counts, and dropout rates, together with antigen-level coverage breakdowns. This supports the design goal of giving health managers a concise decision-support view.

Main endpoint:

- `GET /analytics/coverage-summary`

### 5.3.5 Surveillance and Defaulter Monitoring Module

The surveillance contract documents how clinical observations and follow-up cases are captured and reviewed. Its structure aligns with the Chapter Four subsystem description by covering symptom observations such as fever, rash, and AEFI-related findings, while also supporting follow-up workflows for zero-dose, overdue, and defaulter cases. The follow-up listing endpoint is designed for outreach and public health action.

Main endpoints:

- `POST /patients/{patientId}/surveillance-reports`
- `GET /surveillance/follow-up-cases`
- `GET /surveillance/reports/{reportId}`

### 5.3.6 Notifications Module

The notifications contract supports reminder and alert delivery workflows for caregivers. The current specification covers notification creation, dispatch queueing, delivery status review, and notification history retrieval. This reflects the design requirement for localized SMS reminders, missed-appointment alerts, and operational tracking of retries and delivery outcomes.

Main endpoints:

- `GET /notifications`
- `POST /notifications`

### 5.3.7 Prediction and Outbreak Alert Module

The prediction contract provides the public API layer for model-driven decision support. It documents batch prediction run requests, area-level risk score retrieval, and outbreak alert listing. The documented payloads align with the design chapter by exposing disease-specific risk levels, confidence scores, silent-district flags, and model metadata rather than raw machine learning internals.

Main endpoints:

- `POST /predictions/runs`
- `GET /predictions/scores`
- `GET /predictions/alerts`

### 5.3.8 Reporting and Interoperability Module

The reporting and interoperability contract reflects the combined subsystem described in Chapter Four. It includes report generation and retrieval together with FHIR export and DHIS2 synchronization workflows. The documented job structures expose status tracking, record counts, and error summaries so that reporting and external exchange can be audited consistently.

Main endpoints:

- `GET /reports`
- `POST /reports`
- `GET /reports/{reportId}`
- `POST /interop/fhir/exports`
- `POST /interop/dhis2/sync-jobs`
- `GET /interop/jobs/{jobId}`

### 5.3.9 Offline Sync Module

The offline sync contract supports low-connectivity field operations by documenting device registration, offline batch submission, synchronization status review, and conflict-aware processing outcomes. This matches the system design requirement for eventual synchronization from field devices to the central platform.

Main endpoints:

- `POST /sync/devices`
- `POST /sync/batches`
- `GET /sync/batches/{batchId}`

## 5.4 Importance of the Contract-First Workflow

The API-first implementation approach provides several practical advantages for this project.

- It allows the web team to design forms, tables, and dashboards before the backend logic is fully implemented.
- It gives the backend team a stable implementation target with clear validation and error-handling expectations.
- It prepares the ground for a clean contract between the backend and the machine learning module, especially for outbreak prediction and risk-scoring outputs.
- It makes the surveillance, reporting, interoperability, and offline workflows explicit before implementation begins, which reduces ambiguity for parallel teams.
- It improves documentation quality for the final report by making implementation artifacts explicit, reviewable, and reproducible.

## 5.5 Current Implementation Status

The current implementation status can be summarized as follows:

- the backend and frontend folder structures have been prepared
- the OpenAPI authoring and bundling workflow has been set up
- detailed contracts now cover Auth, Registry, Immunization, Surveillance, Notifications, Analytics, Prediction, Reporting and Interoperability, and Offline Sync
- the next major contract activity is the definition of the internal backend-to-ML prediction interface

This staged implementation approach ensures that the system remains coherent as development proceeds in parallel across multiple teams.
