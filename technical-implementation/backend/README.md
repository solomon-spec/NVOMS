# Backend Area

Recommended backend approach:

- one main Spring Boot application under `nvoms-api/`
- modular organization by subsystem inside `modules/`
- shared utilities inside `shared/`

Current module layout:

- `user-management/`
- `patient-registry/`
- `vaccination-tracking/`
- `surveillance/`
- `notifications/`
- `analytics/`
- `prediction/`
- `reporting/`
- `interoperability/`
- `offline-sync/`
