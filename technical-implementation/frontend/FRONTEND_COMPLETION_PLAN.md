# NVOMS Frontend Completion Plan

Date audited: 2026-05-02

This plan compares the Chapter 3 functional requirements FR1-FR21, Chapter 4 subsystem decomposition, `technical-implementation/frontend/BACKEND_REQUIREMENTS.md`, Django backend URL files, `technical-implementation/backend/api/openapi/openapi.yaml`, and the current Next.js frontend routes/services.

No features were implemented while preparing this plan.

## Verification Snapshot

Commands run from `technical-implementation/frontend/web`:

| Command | Result | Current failures |
|---|---:|---|
| `npm run typecheck` | Passed | None |
| `npm run lint` | Passed | None |

## Status Legend

- Implemented: UI route and service exist and call the currently implemented backend.
- Partially implemented: core UI/service exists, but requirement coverage is incomplete.
- Missing: frontend route/service/workspace does not exist yet.
- Backend-blocked: frontend completion depends on backend endpoints or behavior that is absent, empty, or different from the OpenAPI contract.

## Sources Reviewed

- Chapter 3 FR1-FR21: `documentation/04-chapter-3-problem-analysis-and-modeling/chapter-draft.md`
- Requirement verification table: `documentation/assets/chapter-4-design/requirements-verification.md`
- Subsystem decomposition: `documentation/assets/chapter-4-design/subsystem-decomposition.md`
- Frontend backend notes: `technical-implementation/frontend/BACKEND_REQUIREMENTS.md`
- OpenAPI contract: `technical-implementation/backend/api/openapi/openapi.yaml`
- Backend route roots: `technical-implementation/backend/nvoms/urls.py`
- Frontend routes: `technical-implementation/frontend/web/src/app/**/page.tsx`
- Frontend services: `technical-implementation/frontend/web/src/services/*.ts`
- Frontend workspaces: `technical-implementation/frontend/web/src/features/**`

## Current Frontend Surface

Implemented routes:

| Route | Status | Entry file | Workspace/component |
|---|---|---|---|
| `/login` | Implemented | `web/src/app/login/page.tsx` | `web/src/features/auth/LoginForm.tsx` |
| `/change-password` | Implemented | `web/src/app/change-password/page.tsx` | `web/src/features/auth/ChangePasswordForm.tsx` |
| `/auth/sign-in` | Implemented redirect | `web/src/app/(auth)/auth/sign-in/page.tsx` | redirects to `/login` |
| `/auth/forgot-password` | Partially implemented | `web/src/app/(auth)/auth/forgot-password/page.tsx` | placeholder form, no backend call |
| `/auth/reset-password` | Partially implemented | `web/src/app/(auth)/auth/reset-password/page.tsx` | placeholder form, no backend call |
| `/auth/session-expired` | Implemented static screen | `web/src/app/(auth)/auth/session-expired/page.tsx` | `SessionExpiredWorkspace` |
| `/auth/access-denied` | Implemented static screen | `web/src/app/(auth)/auth/access-denied/page.tsx` | `AccessDeniedWorkspace` |
| `/dashboard` | Implemented | `web/src/app/(dashboard)/dashboard/page.tsx` | `DashboardHome` |
| `/patients` | Partially implemented | `web/src/app/(dashboard)/patients/page.tsx` | `PatientRegistry` |
| `/my-patient` | Partially implemented | `web/src/app/(dashboard)/my-patient/page.tsx` | patient self-service only |
| `/immunizations` | Partially implemented | `web/src/app/(dashboard)/immunizations/page.tsx` | `ImmunizationWorkspace` |
| `/surveillance` | Partially implemented | `web/src/app/(dashboard)/surveillance/page.tsx` | `SurveillanceWorkspace` |
| `/analytics` | Partially implemented | `web/src/app/(dashboard)/analytics/page.tsx` | coverage analytics only |
| `/reports` | Partially implemented | `web/src/app/(dashboard)/reports/page.tsx` | queue/session jobs only |
| `/all-components` | Implemented demo/template route | `web/src/app/(dashboard)/all-components/page.tsx` | not requirement-facing |

Sidebar links without routes:

| Sidebar path | Status | Source file |
|---|---|---|
| `/notifications` | Missing and backend-blocked | `web/src/components/layout/AppSidebar.tsx` |
| `/offline` | Missing frontend, backend routes exist | `web/src/components/layout/AppSidebar.tsx` |

Current services:

| Service | Status | Main backend paths used |
|---|---|---|
| `web/src/services/api.ts` | Implemented | base `http://127.0.0.1:8000/api/v1` |
| `web/src/services/auth.ts` | Partially implemented | `/auth/login`, `/auth/change-password`, `/auth/me`, `/auth/logout` |
| `web/src/services/patients.ts` | Partially implemented | `/patients/`, `/caregivers/`, `/facilities/`, `/geography/`, `/vaccines/`, `/vaccines/batches/`, `/vaccines/schedules/` |
| `web/src/services/surveillance.ts` | Partially implemented | `/surveillance/`, `/surveillance/{id}/follow-ups`, `/alerts/` |
| `web/src/services/analytics.ts` | Partially implemented | `/analytics/coverage/`, `/analytics/coverage/by-region/` |
| `web/src/services/reports.ts` | Partially implemented | `/reports/defaulters`, `/reports/coverage`, `/reports/aefi`, `/reports/{id}/download` |

## OpenAPI, Backend URL, and Frontend Drift

The frontend currently follows the Django URL files more closely than the OpenAPI contract. Before generating more frontend services, decide whether to update the backend to the OpenAPI paths, update the contract to the Django paths, or support compatibility aliases.

Major drift:

| Area | OpenAPI contract path examples | Django backend route files | Current frontend behavior |
|---|---|---|---|
| Base URL | server shows `/v1`; paths omit `/api/v1` | `nvoms/urls.py` mounts under `/api/v1/` | `api.ts` uses `/api/v1` |
| Admin units | `/admin-units` | `/api/v1/geography/` via `geography/urls.py` | uses `/geography/?active=true` |
| Patient identity | `/patients/{uid}` | `/api/v1/patients/<uuid:pk>` | uses patient UUID `id`, not UID |
| Patient duplicates | `/patients/duplicates` | no matching backend URL | no frontend UI |
| Vaccine reference | `/epi-schedules`, `/vaccine-batches` | `/vaccines/schedules/`, `/vaccines/batches/` | uses Django paths |
| Immunization workflow | `/patients/{uid}/immunizations`, `/immunizations/defaulters` | `immunizations/urls.py` is empty; dose APIs live under `/patients/{pk}/doses` | uses patient dose APIs |
| Outbreak alerts | `/outbreak-alerts` | `/api/v1/alerts/` | uses `/alerts/` |
| Notifications | `/message-templates`, `/notifications`, `/notifications/trigger` | `notifications/urls.py` is empty | missing route/service |
| Offline sync | `/devices`, `/sync/batch`, `/sync/batches` | `/api/v1/offline/devices`, `/api/v1/offline/sync/batches` | missing route/service |
| Analytics expansion | `/analytics/dashboard-trends`, `/analytics/risk-map`, `/analytics/defaulter-clusters`, `/analytics/environmental` | only `/analytics/coverage/` and `/analytics/coverage/by-region/` exist | coverage only |
| Prediction and weather | `/integrations/weather/ingest`, `/models`, `/prediction/run`, `/prediction/runs` | `integrations/urls.py` is empty; no prediction URLs | missing and backend-blocked |
| Reports | `/report-definitions`, `/reports/generate`, `/reports`, `/reports/download/{id}` | `/reports/defaulters`, `/reports/coverage`, `/reports/aefi`, `/reports/{job_id}/download` | uses Django report queue paths |
| FHIR/DHIS2 | `/fhir/*`, `/integrations/dhis2/*`, `/integrations/fhir/logs` | `integrations/urls.py` is empty | missing and backend-blocked |
| System/audit | `/system/settings`, `/audit-logs` | no matching backend URL | missing and backend-blocked |

Backend URL files with empty route lists:

- `technical-implementation/backend/immunizations/urls.py`
- `technical-implementation/backend/notifications/urls.py`
- `technical-implementation/backend/integrations/urls.py`

## FR1-FR21 Coverage Matrix

| FR | Requirement summary | Frontend status | Notes |
|---|---|---|---|
| FR1 | Role-based user account creation and management | Partially implemented | Role-gated routes exist, but no admin user/role management UI. Backend has `/users/`, `/roles/`, `/facilities/`. |
| FR2 | Secure authentication and authorization | Partially implemented | Login, change-password, protected routes, and local session storage exist. Token refresh and access-denied routing need hardening. |
| FR3 | Password recovery and admin account management | Partially implemented, backend-blocked | Forgot/reset screens are placeholders. Backend lacks OpenAPI password reset request/confirm URLs. Admin account management UI is missing. |
| FR4 | Register patient demographics and caregiver linkage | Partially implemented | Patient and caregiver create/list/update flows exist for health workers/admins. |
| FR5 | Generate persistent patient UID | Partially implemented | UID is displayed from backend responses; duplicate resolution is missing/backend-blocked. |
| FR6 | Maintain complete digital vaccination history | Partially implemented | Dose history and patient self-service exist; coverage depends on patient dose APIs and schedule completeness. |
| FR7 | Generate vaccination schedules from EPI guidelines | Partially implemented | Schedule regeneration and basic vaccine schedule setup exist; dedicated EPI schedule management is missing. |
| FR8 | Record administered doses with batch, route, site metadata | Implemented | Registry and immunization workspaces submit dose metadata to `/patients/{id}/doses`. |
| FR9 | Offline recording and automatic sync | Missing frontend | Backend offline routes exist, but no frontend offline queue/PWA/sync workspace exists. |
| FR10 | Identify zero-dose and defaulters | Partially implemented, backend-blocked | Status values are displayed in schedules/analytics, but no dedicated zero-dose/defaulter workflow or OpenAPI `/immunizations/defaulters` backend exists. |
| FR11 | Record active surveillance observations | Partially implemented | Surveillance reports with symptom parsing and status workflow exist. |
| FR12 | Send reminder SMS for upcoming appointments | Missing and backend-blocked | Sidebar link exists, but no route/service. Backend notifications URLs are empty. |
| FR13 | Send missed-appointment SMS alerts | Missing and backend-blocked | Same notification gap as FR12. |
| FR14 | Detect high-dropout/high-risk clusters | Backend-blocked | No frontend risk cluster UI; backend lacks OpenAPI defaulter cluster/risk map endpoints. |
| FR15 | Ingest meteorological data | Missing and backend-blocked | No frontend integration UI; backend integrations URLs are empty. |
| FR16 | Execute outbreak prediction models | Missing and backend-blocked | No prediction service/UI; backend prediction URLs absent. |
| FR17 | Visualize outbreak risk levels and silent districts | Partially implemented, backend-blocked | Outbreak alert review exists; risk map/silent district dashboard is absent and backend-blocked. |
| FR18 | Generate configurable reports | Partially implemented | Three report queue flows exist. Full configurable report definitions/history are backend-blocked. |
| FR19 | Export reports in standard formats | Partially implemented, backend-blocked | Output format is selected, but download endpoint returns metadata/file URI rather than streamed file. |
| FR20 | HL7 FHIR mapping for Patient, Immunization, Observation | Missing and backend-blocked | Surveillance displays `fhir_observation_id`; no FHIR export/log UI and backend integrations URLs are empty. |
| FR21 | Exchange data with DHIS2 and related platforms | Missing and backend-blocked | No DHIS2 UI/service and backend integrations URLs are empty. |

## Module-by-Module Checklist

### 1. User Management and Security Subsystem

Subsystem source: Chapter 4 User Management and Security. Covers FR1-FR3.

Current status: Partially implemented.

Implemented:

- Login form calls `POST /api/v1/auth/login`.
- Change password form calls `POST /api/v1/auth/change-password`.
- Logout service calls `POST /api/v1/auth/logout`.
- Current-user service exists for `GET /api/v1/auth/me`.
- Dashboard layout is wrapped in `ProtectedRoute`.
- Route role guards exist on `/patients`, `/my-patient`, `/immunizations`, `/surveillance`, `/analytics`, and `/reports`.
- Sidebar filters navigation items by `session.user.role`.

Partially implemented:

- `ForgotPasswordWorkspace` and `ResetPasswordWorkspace` are local placeholder flows and do not call backend APIs.
- Token refresh exists in backend and OpenAPI, but frontend does not call `POST /auth/refresh` or retry expired requests.
- `/auth/access-denied` exists, but role rejection currently redirects back to `/dashboard`.
- `fetchMe` exists in `auth.ts`, but session hydration currently trusts `localStorage`.
- Admin user, role, facility, status, and role assignment screens are absent.

Missing:

- User management route:
  - `web/src/app/(dashboard)/users/page.tsx`
  - `web/src/features/users/UserManagementWorkspace.tsx`
  - `web/src/features/users/types.ts`
  - `web/src/services/users.ts`
- Role management route:
  - `web/src/app/(dashboard)/roles/page.tsx`
  - `web/src/features/roles/RoleManagementWorkspace.tsx`
  - `web/src/features/roles/types.ts`
  - `web/src/services/roles.ts`
- Facility administration route if facilities remain managed from frontend:
  - `web/src/app/(dashboard)/facilities/page.tsx`
  - `web/src/features/facilities/FacilityManagementWorkspace.tsx`
  - `web/src/features/facilities/types.ts`
  - `web/src/services/facilities.ts`
- Admin dashboard cards and sidebar links for users/roles/facilities.
- Session refresh, logout-all, session-expired redirect, and access-denied redirect behavior.

Backend-blocked:

- OpenAPI password reset endpoints `/auth/password-reset/request` and `/auth/password-reset/confirm` are not present in `authentication/urls.py`.
- OpenAPI role permission endpoints are not present in `users/role_urls.py`; backend only has role list/detail and user role assignment.
- OpenAPI `/audit-logs` is not present, so audit review UI is backend-blocked.

Files to touch later:

- `web/src/services/api.ts`
- `web/src/services/auth.ts`
- `web/src/features/auth/ForgotPasswordWorkspace.tsx`
- `web/src/features/auth/ResetPasswordWorkspace.tsx`
- `web/src/features/auth/LoginForm.tsx`
- `web/src/features/auth/useAuthSession.ts`
- `web/src/components/app-shell/ProtectedRoute.tsx`
- `web/src/components/layout/AppSidebar.tsx`
- `web/src/features/auth/DashboardHome.tsx`
- New files listed above for users, roles, and facilities.
- Backend/contract references: `backend/authentication/urls.py`, `backend/users/urls.py`, `backend/users/role_urls.py`, `backend/users/facility_urls.py`, `backend/api/openapi/openapi.yaml`.

### 2. Patient and Caregiver Registry Subsystem

Subsystem source: Chapter 4 Patient and Caregiver Registry. Covers FR4-FR6 and supports FR10.

Current status: Partially implemented.

Implemented:

- `/patients` route with `PatientRegistry`.
- `/my-patient` route with `PatientSelfService` for `PATIENT` users.
- Patient list, create, retrieve, update, patch, delete/deactivate, and summary flows.
- Caregiver list/create flow embedded in registry.
- Facility, geography, vaccine, batch, and schedule reference data loaded through services.
- Patient UID is displayed in registry and self-service views.
- Patient dose and schedule history are visible from registry and self-service.

Partially implemented:

- UID generation is backend-owned; frontend only displays it.
- Duplicate detection/review is not surfaced.
- OpenAPI uses `/patients/{uid}` while backend/frontend use UUID `id`.
- `CAREGIVER` role self-service endpoints exist in backend but have no frontend route.
- Patient search is basic and tied to backend query behavior.
- Patient `registered_facility` is typed as `string | null` rather than a facility object, so display fidelity is limited.

Missing:

- Duplicate review workspace:
  - `web/src/app/(dashboard)/patient-duplicates/page.tsx`
  - `web/src/features/registry/PatientDuplicateReviewWorkspace.tsx`
  - additions to `web/src/services/patients.ts`
- Caregiver self-service route:
  - `web/src/app/(dashboard)/caregiver/patients/page.tsx`
  - `web/src/features/registry/CaregiverSelfService.tsx`
  - additions to `web/src/services/patients.ts`
- Dedicated patient detail route if moving beyond single-screen master/detail:
  - `web/src/app/(dashboard)/patients/[patientId]/page.tsx`

Backend-blocked:

- OpenAPI duplicate endpoints `/patients/duplicates` and `/patients/duplicates/{duplicate_case_id}` have no matching backend URL.
- If UID should be the public route key, backend/frontend contract must be reconciled before changing services.

Files to touch later:

- `web/src/app/(dashboard)/patients/page.tsx`
- `web/src/app/(dashboard)/my-patient/page.tsx`
- `web/src/features/registry/PatientRegistry.tsx`
- `web/src/features/registry/PatientSelfService.tsx`
- `web/src/features/registry/types.ts`
- `web/src/services/patients.ts`
- `web/src/components/layout/AppSidebar.tsx`
- `web/src/features/auth/DashboardHome.tsx`
- Backend/contract references: `backend/patients/urls.py`, `backend/patients/caregiver_urls.py`, `backend/patients/me_views.py`, `backend/patients/caregiver_me_views.py`, `backend/api/openapi/openapi.yaml`.

### 3. Vaccination Scheduling and Tracking Subsystem

Subsystem source: Chapter 4 Vaccination Scheduling and Tracking. Covers FR7-FR10.

Current status: Partially implemented.

Implemented:

- `/immunizations` route with patient queue, schedule queue, schedule slot updates, and dose recording.
- Registry also supports dose creation, schedule slot update, and schedule regeneration.
- Dose payload includes vaccine, batch, facility, administered time, route, site, event status, source channel, local client record ID, and notes.
- Vaccine, batch, EPI schedule version, and EPI schedule rule creation exist in `patients.ts` and registry setup panel.

Partially implemented:

- EPI schedule setup is embedded inside the patient registry, not a dedicated reference-data workspace.
- Defaulter and zero-dose indicators are visible only indirectly through schedule/status/analytics data.
- No dedicated defaulter list, outreach queue, or zero-dose case management view.
- The frontend uses `/patients/{id}/doses`, while OpenAPI documents `/patients/{uid}/immunizations`.

Missing:

- Dedicated vaccine/reference setup workspace:
  - `web/src/app/(dashboard)/vaccines/page.tsx`
  - `web/src/features/vaccines/VaccineReferenceWorkspace.tsx`
  - `web/src/features/vaccines/types.ts`
  - `web/src/services/vaccines.ts`
- EPI schedule management workspace:
  - `web/src/app/(dashboard)/epi-schedules/page.tsx`
  - `web/src/features/vaccines/EpiScheduleWorkspace.tsx`
- Defaulter/zero-dose operational queue:
  - `web/src/app/(dashboard)/defaulters/page.tsx`
  - `web/src/features/immunizations/DefaulterQueueWorkspace.tsx`
  - additions to `web/src/services/patients.ts` or a new `web/src/services/immunizations.ts`

Backend-blocked:

- `backend/immunizations/urls.py` is empty.
- OpenAPI `/immunizations/defaulters` has no current backend route.
- Any shift to OpenAPI `/patients/{uid}/immunizations` requires backend/frontend contract reconciliation.

Files to touch later:

- `web/src/app/(dashboard)/immunizations/page.tsx`
- `web/src/features/immunizations/ImmunizationWorkspace.tsx`
- `web/src/features/registry/PatientRegistry.tsx`
- `web/src/features/registry/types.ts`
- `web/src/services/patients.ts`
- `web/src/components/layout/AppSidebar.tsx`
- `web/src/features/auth/DashboardHome.tsx`
- New vaccine/EPI/defaulter files listed above.
- Backend/contract references: `backend/patients/urls.py`, `backend/vaccines/urls.py`, `backend/vaccines/antigen_urls.py`, `backend/immunizations/urls.py`, `backend/api/openapi/openapi.yaml`.

### 4. Surveillance and Defaulter Monitoring Subsystem

Subsystem source: Chapter 4 Surveillance and Defaulter Monitoring. Covers FR10-FR11 and contributes to FR17.

Current status: Partially implemented.

Implemented:

- `/surveillance` route with report list, create report form, report status updates, follow-up action creation, outbreak alert list, and alert status updates.
- Public health officials can review list payloads without report mutations, matching `BACKEND_REQUIREMENTS.md`.
- Symptoms are parsed from comma/newline text into structured symptom payloads.
- Outbreak alert verification uses `/alerts/{id}/status`.

Partially implemented:

- Public health officials cannot call report detail/update/follow-up APIs by backend design; frontend reflects that split.
- No dedicated follow-up case queue matching OpenAPI `/surveillance/follow-up-cases`.
- No patient-specific surveillance route matching OpenAPI `/patients/{uid}/surveillance`.
- Defaulter monitoring is not unified with surveillance follow-up/outreach workflows.

Missing:

- Follow-up case queue if backend adds/aligns it:
  - `web/src/app/(dashboard)/surveillance/follow-ups/page.tsx`
  - `web/src/features/surveillance/FollowUpCasesWorkspace.tsx`
  - additions to `web/src/services/surveillance.ts`
- Patient detail surveillance tab if patient detail route is created:
  - `web/src/features/registry/PatientSurveillancePanel.tsx`

Backend-blocked:

- OpenAPI `/surveillance/follow-up-cases` and `/surveillance/follow-up-cases/{case_id}` do not match current Django URLs.
- OpenAPI `/patients/{uid}/surveillance` is absent from current backend URLs.

Files to touch later:

- `web/src/app/(dashboard)/surveillance/page.tsx`
- `web/src/features/surveillance/SurveillanceWorkspace.tsx`
- `web/src/features/surveillance/types.ts`
- `web/src/services/surveillance.ts`
- `web/src/services/patients.ts`
- Backend/contract references: `backend/surveillance/urls.py`, `backend/surveillance/alert_urls.py`, `backend/api/openapi/openapi.yaml`, `technical-implementation/frontend/BACKEND_REQUIREMENTS.md`.

### 5. Notification and Reminder Subsystem

Subsystem source: Chapter 4 Notification and Reminder. Covers FR12-FR13.

Current status: Missing and backend-blocked.

Implemented:

- Sidebar contains a `/notifications` link for admin, health worker, and public health official roles.

Missing:

- `/notifications` route currently has no page file, so the sidebar link resolves to a missing route.
- Notification service is absent.
- Notification templates, queued SMS, retry/delivery attempts, trigger action, and notification history UI are absent.

Backend-blocked:

- `backend/notifications/urls.py` is empty.
- OpenAPI documents `/message-templates`, `/message-templates/{template_id}`, `/notifications/trigger`, `/notifications`, and `/notifications/{sms_notification_id}/attempts`, but Django routes do not expose them yet.

Files to touch later:

- `web/src/app/(dashboard)/notifications/page.tsx`
- `web/src/features/notifications/NotificationsWorkspace.tsx`
- `web/src/features/notifications/types.ts`
- `web/src/services/notifications.ts`
- `web/src/components/layout/AppSidebar.tsx`
- `web/src/features/auth/DashboardHome.tsx`
- Backend/contract references: `backend/notifications/urls.py`, `backend/notifications/views.py`, `backend/api/openapi/openapi.yaml`.

### 6. Analytics and Dashboard Subsystem

Subsystem source: Chapter 4 Analytics and Dashboard. Covers part of FR14 and FR17.

Current status: Partially implemented.

Implemented:

- `/analytics` route loads coverage and coverage-by-region data.
- Filters exist for administrative unit, vaccine, date from, and date to.
- Coverage, missed, scheduled, administered, and regional comparison UI exists.
- `BACKEND_REQUIREMENTS.md` accurately notes current backend analytics limits.

Partially implemented:

- Current analytics covers descriptive vaccine coverage only.
- Dashboard trend series, AEFI aggregate analytics, defaulter clusters, hotspot summaries, risk maps, and silent districts are absent.
- No map visualization exists.

Missing:

- Dashboard trend panels:
  - `web/src/features/analytics/DashboardTrendsPanel.tsx`
  - additions to `web/src/services/analytics.ts`
- Risk map/silent districts workspace:
  - `web/src/features/analytics/RiskMapPanel.tsx`
  - possible map dependency and shared map component
- Defaulter cluster panel:
  - `web/src/features/analytics/DefaulterClustersPanel.tsx`
- AEFI analytics panel:
  - `web/src/features/analytics/AefiAnalyticsPanel.tsx`
- Supporting types in `web/src/features/analytics/types.ts`.

Backend-blocked:

- `BACKEND_REQUIREMENTS.md` lists missing dashboard trend series, risk map output, defaulter clusters, and AEFI aggregate analytics.
- Current `backend/analytics/urls.py` exposes only `coverage/` and `coverage/by-region/`.
- OpenAPI paths `/analytics/dashboard-trends`, `/analytics/risk-map`, `/analytics/defaulter-clusters`, and `/analytics/environmental` are not implemented in Django URLs.

Files to touch later:

- `web/src/app/(dashboard)/analytics/page.tsx`
- `web/src/features/analytics/AnalyticsWorkspace.tsx`
- `web/src/features/analytics/types.ts`
- `web/src/services/analytics.ts`
- `web/src/services/patients.ts`
- Backend/contract references: `backend/analytics/urls.py`, `backend/analytics/views.py`, `backend/api/openapi/openapi.yaml`, `technical-implementation/frontend/BACKEND_REQUIREMENTS.md`.

### 7. Prediction and Outbreak Alert Subsystem

Subsystem source: Chapter 4 Prediction and Outbreak Alert. Covers FR14-FR17.

Current status: Partially implemented and backend-blocked.

Implemented:

- Outbreak alert list and status update are available inside `/surveillance`.
- Alert review includes unit, disease code, source, risk probability, triggered time, and verification state.

Partially implemented:

- Prediction output is visible only if backend already creates outbreak alerts.
- No model registry, prediction run, environmental feature ingestion, or risk-map workflow exists.
- No XGBoost/KNN model execution UI exists.

Missing:

- Prediction workspace:
  - `web/src/app/(dashboard)/prediction/page.tsx`
  - `web/src/features/prediction/PredictionWorkspace.tsx`
  - `web/src/features/prediction/types.ts`
  - `web/src/services/prediction.ts`
- Environmental data ingestion UI:
  - `web/src/app/(dashboard)/environmental-data/page.tsx`
  - `web/src/features/prediction/EnvironmentalDataWorkspace.tsx`
- Risk score/risk map components that can be reused by analytics:
  - `web/src/features/analytics/RiskMapPanel.tsx`

Backend-blocked:

- `backend/integrations/urls.py` is empty.
- No Django prediction URL file is mounted.
- OpenAPI `/integrations/weather/ingest`, `/models`, `/prediction/run`, `/prediction/runs`, and `/prediction/runs/{prediction_run_id}` are not available from current backend URLs.

Files to touch later:

- `web/src/features/surveillance/SurveillanceWorkspace.tsx`
- `web/src/services/surveillance.ts`
- `web/src/features/analytics/AnalyticsWorkspace.tsx`
- New prediction/environmental files listed above.
- Backend/contract references: `backend/surveillance/alert_urls.py`, `backend/integrations/urls.py`, `backend/api/openapi/openapi.yaml`, `technical-implementation/ml/README.md`.

### 8. Reporting and Interoperability Subsystem

Subsystem source: Chapter 4 Reporting and Interoperability. Covers FR18-FR21.

Current status: Partially implemented and backend-blocked.

Implemented:

- `/reports` route can queue defaulter, coverage, and AEFI report jobs.
- Report form supports PDF/CSV output format and facility/unit/date filters.
- Download/status check calls `/reports/{job_id}/download`.
- UI explains current backend limitations from `BACKEND_REQUIREMENTS.md`.

Partially implemented:

- Jobs are tracked only in browser state for the current session.
- Download endpoint returns metadata and `file_uri`; it does not stream a generated file.
- No report definitions/templates endpoint is consumed.
- No FHIR/DHIS2 workflow exists.

Missing:

- Generated report history/list:
  - additions to `web/src/services/reports.ts`
  - additions to `web/src/features/reports/ReportsWorkspace.tsx`
- Report definition management if backend implements contract:
  - `web/src/app/(dashboard)/report-definitions/page.tsx`
  - `web/src/features/reports/ReportDefinitionsWorkspace.tsx`
- Interoperability workspace:
  - `web/src/app/(dashboard)/integrations/page.tsx`
  - `web/src/features/integrations/IntegrationsWorkspace.tsx`
  - `web/src/features/integrations/types.ts`
  - `web/src/services/integrations.ts`
- FHIR browser/export panels:
  - `web/src/features/integrations/FhirExchangePanel.tsx`
  - `web/src/features/integrations/FhirLogsPanel.tsx`
- DHIS2 sync panels:
  - `web/src/features/integrations/Dhis2SyncPanel.tsx`

Backend-blocked:

- `BACKEND_REQUIREMENTS.md` notes no generated report list/history endpoint and no binary download response/signed URL.
- Current `backend/reports/urls.py` exposes report-specific queue endpoints, not OpenAPI `/report-definitions`, `/reports/generate`, `/reports`, or `/reports/download/{generated_report_id}`.
- `backend/integrations/urls.py` is empty, blocking FHIR and DHIS2 workflows.
- OpenAPI `/fhir/Patient/{uid}`, `/fhir/Immunization`, `/fhir/Observation`, `/fhir/Patient/{uid}/bundle`, `/integrations/fhir/logs`, `/integrations/dhis2/sync`, and `/integrations/dhis2/sync/batches` are not available from current backend URLs.

Files to touch later:

- `web/src/app/(dashboard)/reports/page.tsx`
- `web/src/features/reports/ReportsWorkspace.tsx`
- `web/src/features/reports/types.ts`
- `web/src/services/reports.ts`
- `web/src/components/layout/AppSidebar.tsx`
- `web/src/features/auth/DashboardHome.tsx`
- New integration/FHIR/DHIS2 files listed above.
- Backend/contract references: `backend/reports/urls.py`, `backend/integrations/urls.py`, `backend/api/openapi/openapi.yaml`, `technical-implementation/frontend/BACKEND_REQUIREMENTS.md`.

### 9. Offline Sync Subsystem

Subsystem source: Chapter 4 Offline Sync. Covers FR9 and supports registry, immunization, and surveillance workflows.

Current status: Missing frontend; backend routes exist.

Implemented:

- Backend exposes device registration, sync batch submission, batch detail, item list, conflict resolution, sync config, and reference data endpoints under `/api/v1/offline/`.
- Registry/immunization dose forms include `source_channel` and `local_client_record_id`, which can support synced offline records later.
- Sidebar contains `/offline` link for admin and health worker roles.

Missing:

- `/offline` route currently has no page file.
- No offline service wrapper exists.
- No PWA/service worker/offline queue/IndexedDB layer exists.
- No sync status, conflict resolution, device registration, reference data download, or retry UI exists.
- No integration between offline queue and patient/dose/surveillance forms.

Backend-blocked:

- Not blocked for the basic offline admin/sync UI because Django routes exist.
- Contract drift remains: OpenAPI paths are `/devices`, `/sync/batch`, `/sync/batches`, while Django mounts them under `/offline/` and uses `/sync/batches` for submit.

Files to touch later:

- `web/src/app/(dashboard)/offline/page.tsx`
- `web/src/features/offline/OfflineSyncWorkspace.tsx`
- `web/src/features/offline/types.ts`
- `web/src/services/offline.ts`
- `web/src/services/api.ts`
- `web/src/services/patients.ts`
- `web/src/services/surveillance.ts`
- `web/src/components/layout/AppSidebar.tsx`
- `web/src/features/auth/DashboardHome.tsx`
- Optional PWA files if offline-first is implemented:
  - `web/public/sw.js` or Next-compatible service worker setup
  - `web/src/shared/offline-store.ts`
  - `web/src/shared/sync-queue.ts`
- Backend/contract references: `backend/offline/urls.py`, `backend/offline/views.py`, `backend/api/openapi/openapi.yaml`.

### 10. Data Management, System Settings, and Audit Subsystem

Subsystem source: Chapter 4 Data Management plus OpenAPI System & Audit tag. Supports FR1-FR21 governance.

Current status: Missing and backend-blocked.

Implemented:

- No requirement-facing frontend exists for settings, audit logs, integration logs, or data retention.

Missing:

- System settings route:
  - `web/src/app/(dashboard)/settings/page.tsx`
  - `web/src/features/settings/SystemSettingsWorkspace.tsx`
  - `web/src/features/settings/types.ts`
  - `web/src/services/settings.ts`
- Audit logs route:
  - `web/src/app/(dashboard)/audit-logs/page.tsx`
  - `web/src/features/audit/AuditLogsWorkspace.tsx`
  - `web/src/features/audit/types.ts`
  - `web/src/services/audit.ts`
- Data quality/admin panels if required:
  - `web/src/features/admin/DataQualityWorkspace.tsx`

Backend-blocked:

- OpenAPI `/system/settings`, `/system/settings/{setting_key}`, and `/audit-logs` are not mounted in current Django URLs.
- No frontend implementation should be started until backend ownership and exact API behavior are clarified.

Files to touch later:

- `web/src/components/layout/AppSidebar.tsx`
- `web/src/features/auth/DashboardHome.tsx`
- New settings/audit files listed above.
- Backend/contract references: `backend/nvoms/urls.py`, `backend/api/openapi/openapi.yaml`.

## Cross-Cutting Frontend Checklist

Current status: Partially implemented.

Implemented:

- Shared `apiRequest` wrapper centralizes base URL, JSON parsing, Authorization header, and error handling.
- Shared workspace UI components exist in `web/src/shared/workspace-ui.tsx`.
- Role-gated route wrapper exists.
- Feature folders are already used for auth, registry, immunizations, surveillance, analytics, and reports.

Missing or incomplete:

- Token refresh and 401 retry strategy in `web/src/services/api.ts`.
- Session revalidation using `fetchMe` after page load.
- Central route constants and sidebar/dashboard card source to avoid route drift.
- Pagination support in service functions and UI tables where backend returns paginated payloads.
- Generated or contract-derived API types, once OpenAPI/backend drift is resolved.
- Frontend tests for auth gating, service path construction, and each workspace's loading/error/success paths.
- Not-found handling for sidebar links that point to modules not implemented yet.
- Decision on whether to remove template/demo route `/all-components` from production navigation.

Files to touch later:

- `web/src/services/api.ts`
- `web/src/shared/auth-storage.ts`
- `web/src/components/app-shell/ProtectedRoute.tsx`
- `web/src/components/layout/AppSidebar.tsx`
- `web/src/features/auth/DashboardHome.tsx`
- `web/src/shared/workspace-ui.tsx`
- `web/tsconfig.json`
- `web/eslint.config.mjs`
- New test files under `web/src/**/__tests__` or a future `web/tests/` folder.

## Recommended Implementation Order

1. Resolve API contract drift first:
   - Choose OpenAPI-as-target, Django-as-target, or compatibility aliases.
   - Update `BACKEND_REQUIREMENTS.md` after that decision.
   - Do not generate broad frontend services until path naming and identifiers are stable.
2. Harden auth/session behavior:
   - Add refresh-token flow, session revalidation, access-denied routing, and real forgot/reset behavior if backend endpoints exist.
3. Build frontend for backend-ready modules:
   - User/role/facility admin.
   - Offline sync workspace.
   - Caregiver self-service.
   - Dedicated vaccine/EPI schedule management.
4. Fill partial operational modules:
   - Defaulter/zero-dose queue.
   - Surveillance follow-up queue after backend alignment.
   - Report history and real download after backend endpoint update.
5. Build backend-blocked modules after APIs exist:
   - Notifications and SMS delivery tracking.
   - Analytics risk map/trends/defaulter clusters/AEFI aggregates.
   - Prediction/model/environmental workflows.
   - FHIR/DHIS2 interoperability.
   - System settings and audit logs.

## Immediate Non-Implementation Follow-Up

Before feature work starts, create a small alignment issue or document that answers:

- Should frontend services follow current Django URLs or the OpenAPI contract?
- Should patient-facing routes use database UUIDs or public UIDs?
- Which backend gaps are in scope for the final-year implementation versus documented as future work?
- Should `/notifications` and `/offline` remain visible in the sidebar before routes exist?
- Should reports use the existing three queue endpoints or migrate to OpenAPI `/reports/generate`?
