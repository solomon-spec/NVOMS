# API Contract Status

This note summarizes the current state of the API contract work for Chapter Five after synchronizing the repository with the finalized API documentation.

## Current Source of Truth

The active contract file is:

- `technical-implementation/backend/api/openapi/openapi.yaml`

This file reflects the resolved OpenAPI contract titled `NVOMS API`, version `1.1.0`, using OpenAPI `3.0.3`.

## Coverage Snapshot

The finalized contract currently documents:

- 18 tagged functional areas
- 77 path entries
- public, administrative, analytics, interoperability, and operational workflows in one resolved specification

Documented API areas:

- Authentication
- User Management
- Roles & Permissions
- Geography & Facilities
- Caregivers
- Patient Registry
- Vaccine Reference Data
- Immunization Workflow
- Surveillance & Follow-Up
- Outbreak Alerts
- Notifications
- Offline Synchronization
- Analytics & Risk Map
- Environmental Data
- Prediction & ML
- Reporting
- Interoperability & FHIR
- System & Audit

Representative endpoints now include:

- `POST /auth/login`
- `GET /users`
- `GET /roles`
- `GET /admin-units`
- `POST /caregivers`
- `POST /patients`
- `GET /vaccines`
- `POST /patients/{uid}/immunizations`
- `POST /surveillance`
- `PATCH /outbreak-alerts/{outbreak_alert_id}`
- `POST /notifications/trigger`
- `POST /sync/batch`
- `GET /analytics/risk-map`
- `POST /integrations/weather/ingest`
- `POST /prediction/run`
- `POST /reports/generate`
- `GET /fhir/Patient/{uid}/bundle`
- `GET /system/settings`

## Current Commands

Run the following from `technical-implementation/backend/api/`:

```bash
npm run openapi:lint
```

## Note on Removed Draft Files

The earlier split `paths/` and `components/` files, together with the bundled copy, have been removed from the repository. For current review and reporting, `openapi.yaml` should be treated as the authoritative API documentation.
