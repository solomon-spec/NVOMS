# Frontend Backend Requirements

## Patient Registry

- Current frontend section: `/patients` registry landing page.
- Current API used: `GET /api/v1/patients/`.
- Problem: the endpoint returns the full patient array from `PatientListView` instead of a paginated response. This will not scale for production registries with thousands of patients.
- Expected backend behavior: support `page`, `pageSize`, `search`, `status`, `facility`, and stable ordering parameters, returning `{ count, next, previous, page, pageSize, results }`.
- Suggested response additions for the registry table: include `registered_facility` as a nested brief object or include `registered_facility_name`, and include an immunization summary field with `current_status`, `next_due_date`, `due_count`, `overdue_count`, and `administered_count` so the list page does not need per-patient summary calls.
- Permissions: keep access limited to `ADMIN` and `HEALTH_WORKER`.
- Testing notes: seed at least 100 demo patients, verify the first page returns only the requested `pageSize`, verify search by UID/name/caregiver phone, verify facility filtering, and verify stable results when moving between pages.

## Surveillance

- Public health officials can list surveillance reports through `GET /api/v1/surveillance/`, but report detail, report status updates, and follow-up action APIs are limited to admin/health worker roles. The frontend reflects that split and uses list payloads for public-health review.

## Analytics

- Current frontend analytics use `GET /api/v1/analytics/coverage/` and `GET /api/v1/analytics/coverage/by-region/`.
- Missing backend capabilities for future analytics expansion: dashboard trend series, risk map output, defaulter clusters, and AEFI aggregate analytics.

## Reports

- Current frontend reports use `POST /api/v1/reports/defaulters`, `POST /api/v1/reports/coverage`, `POST /api/v1/reports/aefi`, and `GET /api/v1/reports/{job_id}/download`.
- Missing backend capability: generated report list/history endpoint scoped to the requesting user.
- Download gap: `GET /api/v1/reports/{job_id}/download` currently returns report metadata and `file_uri`; it does not stream the generated file. A binary download response or signed file URL would let the frontend provide a direct download action.
