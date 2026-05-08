# Frontend Backend Requirements

## Patient Registry

- Current frontend section: `/patients` registry landing page.
- Current API used: `GET /api/v1/patients/`.
- Problem: the endpoint returns the full patient array from `PatientListView` instead of a paginated response. This will not scale for production registries with thousands of patients.
- Expected backend behavior: support `page`, `pageSize`, `search`, `status`, `facility`, and stable ordering parameters, returning `{ count, next, previous, page, pageSize, results }`.
- Suggested response additions for the registry table: include `registered_facility` as a nested brief object or include `registered_facility_name`, and include an immunization summary field with `current_status`, `next_due_date`, `due_count`, `overdue_count`, and `administered_count` so the list page does not need per-patient summary calls.
- Permissions: keep access limited to `ADMIN` and `HEALTH_WORKER`.
- Testing notes: seed at least 100 demo patients, verify the first page returns only the requested `pageSize`, verify search by UID/name/caregiver phone, verify facility filtering, and verify stable results when moving between pages.

## Patient Registration

- Current frontend section: `/patients/new` registration wizard.
- Current APIs used: `GET /api/v1/facilities/`, `GET /api/v1/geography/?active=true`, `POST /api/v1/caregivers/`, and `POST /api/v1/patients/`.
- Missing backend capability: duplicate detection before patient creation.
- Expected backend behavior: provide a duplicate-check endpoint that accepts patient name, date of birth, sex, caregiver phone, and residence unit, then returns ranked possible matches with patient UID, name, DOB, caregiver phone, facility, and confidence/reason fields.
- Suggested API: `POST /api/v1/patients/duplicates/check` or align with the existing OpenAPI duplicate path if implemented. Response shape should support `matches: []`, `requires_review: boolean`, and clear match reasons.
- Frontend behavior until backend support exists: show a duplicate-check placeholder step and require manual review before continuing to final submission.
- Testing notes: verify exact/near name matches, same caregiver phone matches, no-match responses, and role permissions for `ADMIN` and `HEALTH_WORKER`.

## Surveillance

- Public health officials can list surveillance reports through `GET /api/v1/surveillance/`, but report detail, report status updates, and follow-up action APIs are limited to admin/health worker roles. The frontend reflects that split and uses list payloads for public-health review.

## Analytics

- Current frontend analytics use `GET /api/v1/analytics/coverage/` and `GET /api/v1/analytics/coverage/by-region/`.
- Missing backend capabilities for future analytics expansion: dashboard trend series, risk map output, defaulter clusters, and AEFI aggregate analytics.

## Reports

- Current frontend reports use `POST /api/v1/reports/defaulters`, `POST /api/v1/reports/coverage`, `POST /api/v1/reports/aefi`, and `GET /api/v1/reports/{job_id}/download`.
- Missing backend capability: generated report list/history endpoint scoped to the requesting user.
- Download gap: `GET /api/v1/reports/{job_id}/download` currently returns report metadata and `file_uri`; it does not stream the generated file. A binary download response or signed file URL would let the frontend provide a direct download action.
