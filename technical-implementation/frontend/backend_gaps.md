# NVOMS Backend Gaps Identified During Frontend Refactor

During the implementation of the Auth Hardening, Patient Self-Service Portal, and Caregiver portals, the following backend gaps and required endpoints were identified. These need to be implemented or updated in the Django backend to fully support the frontend features.

## 1. Authentication & Session

- **`GET /api/v1/auth/me` Role Support**:
  - The endpoint needs to return `CAREGIVER` as a valid role for users who are logging in as caregivers.
  - The `tokens` object should be structured appropriately with `accessToken` and `refreshToken` (this was already expected, just documenting to ensure it returns the correct structure).

- **Caregiver Role Contract**:
  - `setup_test_accounts.py` now seeds `caregiver@nvoms.local / password123`, but the backend should treat `CAREGIVER` as a first-class role everywhere roles are listed, assigned, audited, and documented.

## 2. Patient Self-Service Portal

- **`GET /api/v1/patients/me/doses`**:
  - Needs to return a list of `ImmunizationEvent` objects for the currently authenticated patient.

- **`GET /api/v1/patients/me/schedule`**:
  - Needs to return a list of `PatientScheduleSlot` objects for the currently authenticated patient.

- **Patient QR Payload**:
  - The frontend can display `patient.qr_code_value` when present, but there is no dedicated endpoint or guaranteed encoded QR payload for printable cards.
  - Add or document a stable QR payload field for patient/caregiver self-service cards.

- **Self-Service Alerts**:
  - The frontend currently derives patient alerts from schedule statuses.
  - Add a dedicated self-service alert endpoint if backend-generated reminder/defaulter messaging should differ from raw schedule status.

## 3. Caregiver Self-Service Portal

The following endpoints are needed for a caregiver to manage and view their dependents (patients):

- **`GET /api/v1/caregivers/me/patients`**:
  - Returns a list of patients linked to the authenticated caregiver.
  - Expected minimal fields: `id`, `full_name`, `uid`.

- **Caregiver Dependent Summary**:
  - Caregivers can list dependents, doses, and schedules, but cannot call `GET /api/v1/patients/{id}/summary` because that endpoint is health-worker-only.
  - Add `GET /api/v1/caregivers/me/patients/{patient_id}/summary` or include immunization summary fields in `GET /api/v1/caregivers/me/patients` so the caregiver landing card can show accurate status metrics.

- **`GET /api/v1/caregivers/me/patients/{patient_id}/doses`**:
  - Returns the list of `ImmunizationEvent` objects for the specified dependent patient.

- **`GET /api/v1/caregivers/me/patients/{patient_id}/schedule`**:
  - Returns the list of `PatientScheduleSlot` objects for the specified dependent patient.

## 4. Caregiver Management in Staff Registry

Staff need to be able to view and edit caregiver information:

- **`GET /api/v1/caregivers/{id}`**:
  - Retrieves detailed information about a specific caregiver.

- **`PUT /api/v1/caregivers/{id}`**:
  - Completely updates a caregiver record.

- **`PATCH /api/v1/caregivers/{id}`**:
  - Partially updates a caregiver record (e.g., updating just the phone number).

## 5. Patient Registry and Immunization UX Privacy

- **Cross-patient clinical immunization queue**:
  - The frontend can review due/overdue slots after a patient is selected via `GET /api/v1/patients/{id}/schedule`.
  - There is no backend endpoint that returns a facility-scoped due-today/overdue immunization queue across patients with minimum necessary fields.
  - Add a queryable endpoint such as `GET /api/v1/immunizations/queue?facility=&status=due_today,overdue` for scalable clinic worklists.

- **Recent patient shortcuts**:
  - The frontend stores only recent patient IDs in session storage and renders shortcuts when matching rows are already loaded.
  - A backend-supported recent-records endpoint would allow server-side audit controls, expiry, and role-aware minimum fields.

- **Rendered QR artifact**:
  - Patient Detail can display `patient.qr_code_value`, but the backend does not provide a rendered QR image or signed short-lived QR payload for staff workflows.
  - Add a dedicated QR endpoint if printable or scannable clinic QR cards are required.

- **Role-scoped list contracts**:
  - Protected routes currently keep Patient Registry and Immunization workspaces limited to ADMIN and HEALTH_WORKER.
  - If public health users ever need restricted line lists, the backend should expose an explicit, audited permission and minimum-field serializer instead of reusing operational patient list payloads.
