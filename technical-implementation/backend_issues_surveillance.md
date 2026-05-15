# Surveillance Backend Issues & Deficiencies

During the implementation of the Disease Surveillance Flow, several backend deficiencies were noted that prevent a truly scalable and strictly controlled professional application:

## 1. Lack of Server-Side Pagination
- **Endpoint:** `GET /api/v1/surveillance/`
- **Issue:** The API returns a flat array of all reports, which works for development but will crash the client and time out the server at scale when thousands of surveillance reports are created.
- **Requirement:** Implement standard cursor-based or offset-based pagination (`?page=1&limit=50`). The frontend queue should be updated to handle `PaginatedResponse<SurveillanceReport>`.

## 2. Inadequate Symptom Payload Schema
- **Endpoint:** `POST /api/v1/surveillance/`
- **Issue:** The backend expects `symptoms` as an array of strict objects (`{ symptom_code, symptom_label, is_present, observation_value }`). While this is FHIR-compliant, without a dedicated terminology service or backend code lookup, the frontend is forced to parse plain comma-separated text into these structured objects. 
- **Requirement:** Provide a `GET /api/v1/surveillance/symptoms/` lookup endpoint that returns standard SNOMED/ICD symptom codes, or allow unstructured `symptoms_text` for initial reporting before classification.

## 3. Disconnected AEFI Linking
- **Endpoint:** `POST /api/v1/surveillance/`
- **Issue:** An Adverse Event Following Immunization (AEFI) is inherently linked to a specific vaccine dose. The payload currently lacks a `vaccine_dose_id` field to establish a database relationship between the AEFI report and the `ImmunizationRecord` that caused it.
- **Requirement:** Add `vaccine_dose_id?: string` to the creation payload and model.

## 4. Incomplete Permission Matrix for Status Updates
- **Endpoint:** `PATCH /api/v1/surveillance/:id`
- **Issue:** Currently, any `HEALTH_WORKER` can close a surveillance case. In a clinical workflow, case closure or verification is usually restricted to a `PUBLIC_HEALTH_OFFICER` or `ADMIN`.
- **Requirement:** Implement stricter permission checking on the `status` mutation. If a health worker attempts to set `status: "closed"`, it should return `403 Forbidden`.
