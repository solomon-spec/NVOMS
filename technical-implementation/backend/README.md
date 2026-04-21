# Backend Area

The backend now lives under `api/`, and the API documentation has been synchronized to the finalized resolved OpenAPI contract.

Main areas:

- `api/openapi/openapi.yaml`
  current canonical NVOMS API specification (`OpenAPI 3.0.3`, version `1.1.0`)
- `api/src/app/`
  app shell, middleware, and app-level errors
- `api/src/modules/`
  feature module boundaries
- `api/src/processes/`
  cross-module workflow boundaries
- `api/src/infrastructure/`
  adapters and shared technical layers
- `api/tests/`
  contract, integration, and unit test folders

Current documented API areas:

- authentication and account security
- user management, roles, permissions, geography, facilities, and caregivers
- patient registry and vaccine reference data
- immunization, surveillance, outbreak alerts, and notifications
- offline synchronization, analytics, environmental data, and prediction
- reporting, interoperability, system settings, and audit logging

Only the folder structure is kept for now. Empty directories use `.gitkeep` so they can be pushed to Git.
The `api/` workspace now also includes simple tooling to lint the OpenAPI spec.
