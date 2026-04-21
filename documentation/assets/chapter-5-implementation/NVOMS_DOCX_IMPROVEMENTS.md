# NVOMS DOCX Improvement Recommendations

This note was prepared during the earlier contract-improvement phase. The current authoritative API documentation is now the resolved OpenAPI contract in `technical-implementation/backend/api/openapi/openapi.yaml`.

This note proposes improvements for `NVOMS_API_Documentation (1).docx` based on:

- the implementation-ready database schema in `documentation/assets/chapter-4-design/NVOMS_POSTGRESQL_SCHEMA.sql`
- the narrative design and database documents under `documentation/`
- the earlier OpenAPI drafting materials that were later removed from `technical-implementation/backend/api/openapi/`
- the previous API and data-layer comparisons

## Position

The DOCX is worth keeping as the **primary human-readable API and data reference** because it is stronger in several important ways:

- endpoint-by-endpoint role requirements
- request and response field tables
- direct database-table linkage
- operational detail such as retry logs and scheduler-triggered jobs
- appendix-style completeness

The main problem is not that the DOCX is weak. The main problem is that it now needs to be:

1. corrected where it diverges from the actual database schema
2. extended to include the newer API contract areas now present in the OpenAPI documentation
3. reorganized slightly so public APIs, internal contracts, and database-backed derived views are clearly separated

## 1. Recommended Direction

Do **not** replace the DOCX with the OpenAPI write-up.  
Instead, improve the DOCX so that it becomes:

- the strongest narrative and tabular reference
- consistent with the PostgreSQL schema
- aligned with the current API contract

The best model is:

- **DOCX** = primary explanatory document
- **OpenAPI** = canonical machine-readable contract
- **PostgreSQL schema / DBML** = canonical persistence model

The DOCX should explicitly say this near the front.

## 2. Highest-Priority Improvements

These are the changes that will improve the DOCX the most.

### 2.1 Correct the DOCX where it disagrees with the actual database

This is the most important improvement. Right now the DOCX is strong, but a few status values and field semantics no longer match the SQL schema.

### 2.2 Add the newer contract areas that the OpenAPI now covers

The DOCX should absorb the newer work rather than leaving it split across multiple sources.

### 2.3 Add a small “data model semantics” layer

The DOCX already links endpoints to tables, which is a strength. The next step is to make it explicit when a response is:

- directly stored in a table
- derived from a materialized view
- a composed read model
- an internal service contract rather than a persisted entity

## 3. Immediate Accuracy Fixes Against The Database

These should be treated as must-fix items.

## 3.1 Administrative geography levels

The DOCX currently describes levels like `national`, `regional`, and `zonal`.  
The SQL schema uses:

- `country`
- `region`
- `zone`
- `woreda`
- `kebele`

### Improvement

Revise all hierarchy references in the DOCX to use the actual SQL values, then optionally mention user-facing labels in brackets if needed.

Example:

- Stored value: `country`
- UI label: `National`

## 3.2 User account status values

The DOCX user management section currently emphasizes:

- `active`
- `inactive`
- `locked`

But the SQL schema for `users.status` supports:

- `inactive`
- `active`
- `locked`
- `suspended`
- `deleted`

### Improvement

Expand the DOCX user-status tables and role-management responses to include all valid states from the database.

## 3.3 Vaccination schedule status values

The DOCX schedule section is currently too narrow compared with the SQL schema.

The database allows:

- `scheduled`
- `pending`
- `due_soon`
- `due_today`
- `overdue`
- `defaulter`
- `administered`
- `exempt`
- `cancelled`

### Improvement

Update:

- `/patients/{uid}/schedule`
- `/patients/{uid}/schedule/{patient_schedule_id}/history`
- `/immunizations/defaulters`

so the DOCX lists the full schedule-state vocabulary and explains the meaning of each state.

## 3.4 Patient immunization summary statuses

The DOCX search/status sections currently use values such as:

- `due`
- `overdue`
- `defaulter`
- `up_to_date`
- `zero_dose`

But the SQL schema for `patient_immunization_status.current_status` uses:

- `up_to_date`
- `due_soon`
- `overdue`
- `defaulter`
- `zero_dose`
- `unknown`

### Improvement

Replace `due` with `due_soon` where this summary view is concerned, and add `unknown`.

Also separate clearly:

- **schedule-slot state**
- **overall patient immunization summary state**

These are not the same thing.

## 3.5 Surveillance status and severity values

The DOCX surveillance section currently uses terms like:

- status: `open`, `closed`, `escalated`
- severity: `mild`, `moderate`, `severe`

But the SQL schema uses:

- status: `submitted`, `queued`, `under_follow_up`, `closed`
- severity: `low`, `moderate`, `high`, `critical`

### Improvement

Correct the surveillance status and severity values in the DOCX and add a short lifecycle note that distinguishes:

- report submission state
- follow-up need
- outbreak-alert escalation

## 3.6 Outbreak alert status values

The DOCX currently uses:

- `triggered`
- `verified`
- `dismissed`
- `false_alarm`

The SQL schema for `outbreak_alerts.status` uses:

- `potential`
- `under_review`
- `confirmed`
- `dismissed`
- `false_alarm`

### Improvement

Update the DOCX alert section to match the SQL vocabulary and describe the reviewer workflow using these real states.

## 3.7 Prediction run and risk level values

The DOCX currently implies prediction runs can be:

- `queued`
- `running`
- `completed`
- `failed`

and risk levels include `critical` in some newer API examples.

But the SQL schema uses:

- `prediction_runs.status`: `running`, `completed`, `failed`
- `prediction_runs.run_type`: `scheduled`, `on_demand`
- `prediction_scores.risk_level`: `low`, `medium`, `high`, `unknown`

### Improvement

Align the DOCX prediction section to the actual persistence layer:

- use `scheduled` / `on_demand`
- use `running` / `completed` / `failed`
- use `low` / `medium` / `high` / `unknown` in DB-backed score tables

If you want a public-facing `queued` state, label it clearly as an **API contract response state**, not a persisted SQL state.

## 3.8 Notification and retry statuses

The DOCX notification section is already strong, but it still misses some database states.

The SQL schema includes:

- `sms_notifications.status`: `queued`, `sent`, `delivered`, `pending_retry`, `failed`, `cancelled`
- `notification_attempts.attempt_status`: `sent`, `delivered`, `failed`, `retrying`

### Improvement

Expand the DOCX notification tables to include:

- `pending_retry`
- `cancelled`
- `retrying`

and update example payloads so they match the SQL states exactly.

## 3.9 Sync batch and sync item statuses

The DOCX currently uses batch states like:

- `pending`
- `acknowledged`
- `partial`
- `failed`

But the SQL schema uses:

- `sync_batches.status`: `submitted`, `processed`, `conflict`, `rejected`
- `sync_batch_items.item_status`: `pending`, `applied`, `conflict`, `rejected`

### Improvement

Rewrite the offline sync state tables to match the actual schema and clearly distinguish:

- batch status
- item status
- manual conflict resolution workflow

## 3.10 FHIR log vocabulary

The DOCX currently uses:

- `direction`: `inbound` / `outbound`
- `exchange_status`: `success` / `failed`

But the SQL schema for `fhir_exchange_logs` uses:

- `direction`: `export` / `import`
- `exchange_status`: `success`, `mapping_error`, `transmission_error`

### Improvement

Update the FHIR log section to use the actual SQL values and show sample error cases for both mapping and transmission failures.

## 3.11 Settings scope values

The DOCX settings section currently emphasizes:

- `global`
- `facility`

But the SQL schema allows:

- `global`
- `facility`
- `integration`

### Improvement

Add `integration` as a valid scope in the DOCX and explain that it is used for external-system configuration such as weather API, SMS gateway, DHIS2, or FHIR settings.

## 4. High-Value Sections To Add From The Current API Documentation

These are the biggest content additions the DOCX should absorb.

## 4.1 Password change endpoint

Add:

- `POST /auth/change-password`

### Why

The DOCX already covers password reset and account management. This endpoint completes the user lifecycle and fits naturally in the authentication chapter.

## 4.2 Schedule regeneration workflow

Add:

- `POST /patients/{uid}/schedule/regenerate`

### Why

This is important because the database already models schedule versions and rules. The DOCX currently explains schedule creation well, but it should also document how schedules are recomputed after:

- EPI rule changes
- corrected DOB
- medical exception review
- data repair

## 4.3 Follow-up case lifecycle

Add a dedicated follow-up case section, even if it is documented as a derived or workflow-level resource rather than a direct table.

Recommended endpoints to describe:

- `GET /surveillance/follow-up-cases`
- `GET /surveillance/follow-up-cases/{caseId}`
- `PATCH /surveillance/follow-up-cases/{caseId}`

### Why

Your design documentation clearly talks about follow-up flagging and outreach workflows. The DOCX should reflect that operational layer more explicitly.

### Important note

Because the current SQL schema does not yet define a dedicated `follow_up_cases` table, the DOCX should explain whether this is:

- a composed read model
- a planned persisted entity
- or a workflow derived from surveillance reports, schedule states, and patient status summaries

## 4.4 Dashboard trend analytics

Add:

- `GET /analytics/dashboard-trends`

### Why

The DOCX already has strong coverage and risk-map sections, but the narrative documentation also expects trend-series dashboard analytics. This would make the analytics chapter more complete.

## 4.5 Risk map geometry payload

Keep the existing risk-map section, but improve it by documenting:

- GeoJSON-like boundary output
- silent-district flag semantics
- whether geometry comes from `administrative_units.boundary_geojson`

### Why

This is already supported in your database design and broader system documentation and should appear clearly in the DOCX.

## 4.6 Weather ingestion workflow

Add a new subsection for weather ingestion and operational ingestion jobs.

Suggested coverage:

- weather ingestion trigger endpoint
- weather observation create/list endpoints
- relation to `environmental_observations`
- relation to `integration_jobs.job_type = weather_ingest`

### Why

The DOCX currently documents read-side environmental analytics only. It should also document how the data enters the system.

## 4.7 Internal ML contract

Add an appendix or internal-contract section for the backend-to-ML interaction.

Suggested content:

- prediction job request payload
- scoring mode
- stale-data policy
- model code and scope inputs
- result handoff back into prediction scores and alerts

### Why

This is newer than the DOCX and is very useful for implementation, but it should be clearly marked as an internal service contract rather than a public API.

## 4.8 Manual sync conflict resolution

Add a new subsection for conflict handling.

Suggested content:

- conflict resolution request model
- resolution result model
- relation to `sync_batches` and `sync_batch_items`

### Why

The current documentation now makes this explicit, and it fits the offline-first nature of the system very well.

## 4.9 Patient-level FHIR bundle retrieval

Add the patient-level bundle retrieval option currently documented in the OpenAPI work.

### Why

The DOCX already has good FHIR coverage. Adding bundle-oriented patient retrieval will make it more useful for external integration teams.

## 5. Data-Layer Improvements To Make The DOCX Even Stronger

These are the improvements that would make the DOCX better than both the current OpenAPI and the current database write-up as a day-to-day working reference.

## 5.1 Add a canonical data dictionary appendix

Create one appendix with columns such as:

- field name
- entity
- type
- nullable
- allowed values
- source of truth
- API alias
- notes

### Why

This will solve the biggest confusion in the project:

- `uid` vs `patient_id`
- `unit_id` vs `regionCode` / `woredaCode`
- `facility_id` vs `facilityCode`
- `risk_probability` vs public `riskScore`

## 5.2 Separate persisted entities from derived read models

The DOCX should explicitly tag each data source as one of:

- persisted table
- materialized view
- composed response model
- internal job payload

### Why

This helps readers know what can be queried and stored directly versus what is assembled dynamically.

Examples:

- `patient_immunization_status` = derived summary / materialized view
- follow-up cases = likely composed workflow view unless a table is later introduced
- risk map = composed analytical read model

## 5.3 Add state-machine tables per subsystem

For each important subsystem, add a small table of valid states and transitions.

Recommended areas:

- user accounts
- schedule slots
- immunization summary
- surveillance reports
- outbreak alerts
- SMS notifications
- sync batches
- sync batch items
- integration jobs

### Why

The database has enough structure now that this would greatly reduce implementation ambiguity.

## 5.4 Distinguish public IDs, database IDs, and business codes

Add a short section that defines:

- internal UUID primary keys
- business identifiers like `uid`
- geography codes
- facility codes

### Why

This is one of the biggest sources of drift across the current documents.

## 5.5 Add a “source table(s)” line for every endpoint

The DOCX already does this in many places. Make it consistent everywhere.

Good pattern:

- Primary table(s)
- Supporting lookups
- Derived view or composition logic

Example:

- `GET /analytics/risk-map`
  - Primary: `prediction_scores`
  - Supporting: `administrative_units`, `environmental_observations`
  - Derived fields: geometry and silent-district rendering metadata

## 5.6 Add “implementation status” markers

For each newer or more complex endpoint, add a small status tag:

- `Implemented in schema`
- `Documented contract, persistence pending`
- `Derived view`
- `Internal-only`

### Why

This is especially helpful for:

- follow-up cases
- internal ML jobs
- conflict resolution
- dashboard trends

## 6. Structural Improvements To The DOCX

These are presentation and maintainability improvements.

## 6.1 Split the DOCX into three major API groups

Recommended structure:

1. Public transactional APIs
2. Admin and reference-data APIs
3. Internal and operational APIs

### Why

Right now the DOCX is strong but very flat. Grouping by contract type would make it easier to navigate.

## 6.2 Add a “Conventions” chapter near the front

This should define:

- authentication style
- timestamp format
- pagination format
- error response format
- naming conventions
- code vs UUID usage
- language code conventions

### Why

The DOCX currently explains a lot section by section, but a shared conventions chapter would reduce repetition and improve consistency.

## 6.3 Add reusable error model tables

The DOCX already lists response codes per endpoint. Improve it further by adding a reusable section for:

- validation errors
- unauthorized
- forbidden
- conflict
- not found
- locked account
- duplicate detection

### Why

This would make the DOCX easier to keep consistent with the OpenAPI error responses.

## 6.4 Add a route-mapping appendix

Because the current OpenAPI uses slightly different route shapes in some areas, add a small appendix that maps:

- DOCX route
- current OpenAPI route
- equivalent or not

### Why

This prevents confusion while preserving the DOCX structure you prefer.

## 7. Recommended New Sections In The Revised DOCX

If you revise the DOCX, I recommend adding these new top-level or subsection headings:

1. Conventions and Source of Truth
2. Authentication and Session Lifecycle
3. Administration, Roles, and Permissions
4. Geography and Facility Master Data
5. Registry and Duplicate Review
6. Vaccine Reference Data and EPI Rule Management
7. Immunization Workflow and Schedule Lifecycle
8. Surveillance, Follow-Up, and Alerting
9. Notifications and Delivery Operations
10. Analytics, Trends, and Risk Map Outputs
11. Environmental Data and Weather Ingestion
12. Prediction Runtime and Internal ML Contract
13. Reporting and Report Definitions
14. Interoperability, DHIS2, and FHIR Exchange Logs
15. Offline Synchronization and Conflict Resolution
16. System Settings, Audit, and Operational Metadata
17. Data Dictionary Appendix
18. State and Enum Appendix
19. Route Mapping Appendix

## 8. Suggested Writing Style For The Revised DOCX

To preserve the DOCX’s strength, keep:

- the field tables
- the “Backed by …” data-source notes
- the response-code tables
- the complete endpoint appendix

But improve it by also adding:

- short lifecycle notes
- state-value tables
- source-of-truth notes
- implementation-status markers

That combination will make the DOCX stronger than either a pure narrative document or a pure OpenAPI file.

## 9. Recommended Revision Order

If you want to improve the DOCX efficiently, do it in this order.

### Phase 1: Accuracy fixes

- correct all enum and status vocabularies to match the SQL schema
- correct geography-level terminology
- correct sync, surveillance, alert, and FHIR log status values

### Phase 2: Data completeness

- add missing DB-backed entities such as report definitions, integration endpoints, and richer notification states where needed
- add clear data-dictionary and state appendices

### Phase 3: Contract completeness

- add change password
- add schedule regeneration
- add follow-up cases
- add dashboard trends
- add weather ingestion
- add conflict resolution
- add patient-level bundle retrieval

### Phase 4: Internal and planned contracts

- add internal ML job contracts
- add implementation-status tags for contract-only or derived endpoints

## 10. Bottom Line

The DOCX is already the stronger **human reference**.  
The best improvement is not to replace it, but to make it:

- database-accurate
- contract-complete
- explicit about what is persisted, derived, or internal

If you do that, the DOCX can become the main document that ties together:

- the database
- the API contract
- the implementation workflow

while OpenAPI remains the machine-readable source for tooling and validation.
