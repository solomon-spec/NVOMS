# Backend Area

The backend now lives under `api/`.

Main areas:

- `api/openapi/`
  API contract folder structure
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

Current feature modules:

- `auth/`
- `registry/`
- `immunization/`
- `surveillance/`
- `notifications/`
- `analytics/`
- `prediction/`
- `reporting/`
- `interoperability/`
- `offline-sync/`

Only the folder structure is kept for now. Empty directories use `.gitkeep` so they can be pushed to Git.
