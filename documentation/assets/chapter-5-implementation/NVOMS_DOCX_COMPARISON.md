# NVOMS DOCX vs Current Documentation Comparison

This note is a historical comparison snapshot created during the pre-final contract expansion phase. The current authoritative API documentation is now the resolved OpenAPI contract in `technical-implementation/backend/api/openapi/openapi.yaml`.

This note compares the external document `NVOMS_API_Documentation (1).docx` against the earlier NVOMS documentation set used during that comparison exercise, including:

- the earlier split-draft OpenAPI materials that were later removed from `technical-implementation/backend/api/openapi/`
- the Chapter Three and Chapter Four narrative requirements/design documents
- the Chapter Five API contract write-up

The goal is to distinguish:

- capabilities that the DOCX is missing
- capabilities that the current documentation is missing but the DOCX includes
- capabilities that are present on both sides but exposed under different route names or structures

## A. Things Missing From The DOCX

These items are represented in the current NVOMS documentation but are not explicitly covered by the DOCX.

### 1. Internal backend-to-ML contract

The current documentation includes explicit internal prediction-job endpoints for the backend-to-ML boundary:

- `POST /internal/ml/prediction-jobs`
- `GET /internal/ml/prediction-jobs/{jobId}`

The DOCX documents public prediction runs and a model registry, but it does not define the internal service contract for ML job submission, result exchange, stale-data handling, or machine-to-machine integration boundaries.

### 2. Weather ingestion job workflow

The current documentation includes:

- `POST /environment/weather/ingestions`
- `GET /environment/weather/observations`
- `POST /environment/weather/observations`

The DOCX only exposes a read-side analytics endpoint for environmental observations (`GET /analytics/environmental`). It does not document how weather data is ingested, stored, validated, or reprocessed.

### 3. Vaccination schedule regeneration

The current documentation includes:

- `POST /patients/{patientId}/schedule/regenerate`

This is not present in the DOCX. The DOCX supports reading schedules and history, but it does not cover recomputing schedules after rule changes, corrected birth dates, or catch-up adjustments.

### 4. Follow-up case lifecycle management

The current documentation includes:

- `GET /surveillance/follow-up-cases`
- `GET /surveillance/follow-up-cases/{caseId}`
- `PATCH /surveillance/follow-up-cases/{caseId}`

The DOCX covers defaulter-related behavior and outbreak alerts, but it does not define a first-class follow-up case resource with status updates, assignment, outcome notes, and outreach lifecycle tracking.

### 5. Dashboard trend analytics

The current documentation includes:

- `GET /analytics/dashboard-trends`

The DOCX covers coverage, risk map, defaulter clusters, and environmental observations, but it does not define trend-series payloads for dashboard charts.

### 6. Explicit public outbreak alert create/read lifecycle

The current documentation includes:

- `POST /predictions/alerts`
- `GET /predictions/alerts/{alertId}`
- `PATCH /predictions/alerts/{alertId}`

The DOCX covers listing and verifying/dismissing outbreak alerts, but it does not document a create endpoint or the same alert-resource lifecycle shape used in the current OpenAPI set.

### 7. Manual offline conflict resolution

The current documentation includes:

- `POST /sync/batches/{batchId}/resolve`

The DOCX documents sync submission, sync batches, and sync batch items, but it does not expose an explicit conflict-resolution endpoint for manual reconciliation workflows.

### 8. Patient-level FHIR bundle retrieval in current interop structure

The current documentation includes:

- `GET /interop/fhir/patients/{patientId}/bundle`

The DOCX exposes direct FHIR resource endpoints, but it does not include this current bundle-oriented patient interoperability route shape.

## B. Things Missing In The Current Documentation But Available In The DOCX

These are the strongest gaps where the DOCX adds concrete API coverage that is still absent, or only implied narratively, in the current documentation set.

### 1. Roles and permission administration endpoints

The DOCX includes:

- `GET /roles`
- `GET /roles/{role_id}/permissions`
- `POST /roles/{role_id}/permissions`
- `DELETE /roles/{role_id}/permissions/{permission_id}`

Current documentation mentions RBAC, roles, and permissions narratively, and user objects include permission arrays, but there is no documented API surface for role and permission management.

### 2. Administrative geography and facility master-data endpoints

The DOCX includes:

- `GET /admin-units`
- `GET /admin-units/{unit_id}`
- `GET /facilities`
- `GET /facilities/{facility_id}`

Current documentation refers to regions, woredas, facilities, and facility mappings, but it does not currently expose dedicated master-data endpoints for administrative units or facilities.

### 3. Standalone caregiver endpoints

The DOCX includes:

- `GET /caregivers`
- `GET /caregivers/{caregiver_id}`
- `PUT /caregivers/{caregiver_id}`

Current documentation embeds caregiver data inside patient registration and patient responses, but it does not document caregivers as a standalone manageable resource.

### 4. Patient search and immunization-status endpoints

The DOCX includes:

- `GET /patients/search`
- `GET /patients/{uid}/immunization-status`

Current documentation supports search behavior through patient listing/filtering and exposes schedules and immunization history, but it does not define these dedicated route shapes.

### 5. Duplicate-patient review endpoints

The DOCX includes:

- `GET /patients/duplicates`
- `PUT /patients/duplicates/{duplicate_case_id}`

Current documentation discusses duplicate prevention narratively and includes a duplicate-patient response type, but there is still no documented duplicate-review workflow endpoint.

### 6. Vaccine catalog, EPI schedule rule, and vaccine-batch management endpoints

The DOCX includes:

- `GET /vaccines`
- `GET /epi-schedules`
- `GET /epi-schedules/{schedule_version_id}/rules`
- `GET /vaccine-batches`

Current documentation documents vaccine administration, schedule generation, and schedule regeneration, but not the reference-data management endpoints behind vaccine definitions, schedule versions/rules, and available batches.

### 7. Patient schedule history endpoint

The DOCX includes:

- `GET /patients/{uid}/schedule/{patient_schedule_id}/history`

Current documentation exposes current schedules and immunization events, but not the schedule status-event history endpoint described in the DOCX.

### 8. Defaulter list endpoint as a direct resource

The DOCX includes:

- `GET /immunizations/defaulters`

Current documentation covers follow-up cases and cluster analytics, but it does not currently define a direct defaulter listing endpoint under the immunization domain.

### 9. Logout endpoint

The DOCX includes:

- `POST /auth/logout`

Current documentation includes login, refresh, password reset, and password change, but no explicit logout route.

### 10. Notification trigger endpoint

The DOCX includes:

- `POST /notifications/trigger`

Current documentation supports notification creation, templates, and delivery-attempt review, but not a dedicated trigger endpoint for system-driven reminder generation.

### 11. Device listing endpoint

The DOCX includes:

- `GET /devices`

Current documentation includes device registration under `/sync/devices`, but not a separate list/query endpoint for registered devices in the DOCX style.

### 12. Sync batch items endpoint

The DOCX includes:

- `GET /sync/batches/{sync_batch_id}/items`

Current documentation supports batch creation, batch status retrieval, and conflict resolution, but not item-level inspection of all records in a sync batch.

### 13. Model registry endpoint

The DOCX includes:

- `GET /models`

Current documentation documents prediction runs, scores, alerts, weather data, and internal ML job contracts, but it does not expose a public model registry endpoint.

### 14. Report definition and report download endpoints

The DOCX includes:

- `GET /report-definitions`
- `POST /reports/generate`
- `GET /reports/download/{generated_report_id}`

Current documentation has generic report generation/listing endpoints, but not an explicit report-definition catalog or a distinct download route in this form.

### 15. Integration endpoint configuration and FHIR exchange log endpoints

The DOCX includes:

- `GET /integrations/endpoints`
- `PUT /integrations/endpoints/{endpoint_id}`
- `GET /integrations/fhir/logs`

Current documentation covers DHIS2 sync jobs, FHIR exports, patient bundle retrieval, and generic job status, but not integration-endpoint configuration management or FHIR exchange log inspection as explicit endpoints.

### 16. Item-level DHIS2 sync inspection

The DOCX includes:

- `GET /integrations/dhis2/sync/batches`
- `GET /integrations/dhis2/sync/batches/{dhis2_sync_batch_id}/items`

Current documentation includes DHIS2 sync job creation and generic job tracking, but not the same batch-history plus per-item error inspection surface.

### 17. Direct FHIR resource endpoints

The DOCX includes:

- `GET /fhir/Patient/{uid}`
- `GET /fhir/Immunization`
- `GET /fhir/Observation`

Current documentation supports FHIR export jobs and patient bundle retrieval, but it does not expose these direct resource-oriented read endpoints.

## C. Present On Both Sides But Named Or Structured Differently

These should not be counted as full gaps unless you specifically want the route shape in the DOCX.

| DOCX Endpoint / Area | Current Documentation Equivalent | Notes |
| --- | --- | --- |
| `/users`, `/users/{user_id}`, `/users/{user_id}/unlock` | `/admin/users`, `/admin/users/{userId}`, `/admin/users/{userId}/unlock` | Same capability, different admin namespace. |
| `/system/settings`, `/system/settings/{setting_key}` | `/admin/settings` | Same domain, but current docs use collection retrieval/update rather than key-specific route design. |
| `/audit-logs` | `/admin/audit-logs` | Same capability, different namespace. |
| `/message-templates`, `/message-templates/{template_id}` | `/notification-templates`, `/notification-templates/{templateCode}` | Same capability, different naming. |
| `/prediction/runs`, `/prediction/runs/{prediction_run_id}` | `/predictions/runs`, `/predictions/runs/{runId}` | Same prediction-run concept, different pluralization/path style. |
| `/outbreak-alerts` | `/predictions/alerts` | Similar outbreak alert domain, but current docs attach alerts more explicitly to prediction workflows. |
| `/analytics/coverage` | `/analytics/coverage-summary` | Same reporting intent, different route naming and schema shape. |
| `/patients/{uid}/surveillance` | `/patients/{patientId}/surveillance-reports` | Same main purpose, different naming. |
| `/devices` and `/sync/batch` | `/sync/devices` and `/sync/batches` | Same offline-support area, different path organization. |
| `/integrations/dhis2/sync` and job/batch routes | `/interop/dhis2/sync-jobs`, `/interop/jobs/{jobId}` | Same interoperability area, but current docs are more job-centric and less batch-item centric. |

## D. Detail-Level Differences

The DOCX is stronger in a few documentation-style areas even where the capability itself exists in the current docs.

### The DOCX is stronger on:

- visible required-role annotation on nearly every endpoint
- request-field tables tied directly to database columns and tables
- explicit success and error code tables per endpoint
- operations appendix listing all endpoints in one place
- clearer mention of scheduled-job behavior for automation-triggered endpoints

### The current documentation is stronger on:

- reusable split OpenAPI structure that was suitable for tooling and validation during that phase
- bundled Swagger/Postman import output used during that phase
- richer modern coverage for weather ingestion, internal ML contracts, conflict resolution, dashboard trends, follow-up cases, and schedule regeneration
- standardized reusable schemas and responses across modules

## Bottom Line

The DOCX is not simply "better" or "worse" than the current documentation. It is stronger as a table-driven API inventory and operational reference, especially for RBAC, master data, reference catalogs, integration administration, and endpoint-by-endpoint error tables. The current documentation is stronger in the newer areas added during the OpenAPI expansion, especially internal ML workflows, environmental ingestion, conflict resolution, follow-up case lifecycle management, and map/dashboard analytics support.

If you want the two sources fully aligned, the highest-value additions to the current documentation would be:

1. roles and permissions endpoints
2. admin-unit and facility master-data endpoints
3. caregiver standalone endpoints
4. duplicate-review endpoints
5. vaccine, EPI-rule, and vaccine-batch catalog endpoints
6. report-definition, report-download, and integration-endpoint management endpoints
7. FHIR log and direct FHIR resource endpoints
