# NVOMS API Contract Status

This note summarizes the current state of the API contract work for Chapter Five.

## Source of Truth

The main authoring location is:

- `technical-implementation/backend/api/openapi/openapi.yaml`

The OpenAPI contract is intentionally split into:

- `paths/`
- `components/parameters/`
- `components/responses/`
- `components/schemas/`
- `components/security/`

## Import-Friendly Output

For Postman and Swagger imports, the contract can be bundled into:

- `technical-implementation/backend/api/openapi/openapi.bundle.yaml`

## Current Detailed Modules

The most detailed documentation work currently covers:

- Auth
- Registry
- Immunization
- Surveillance
- Notifications
- Analytics
- Prediction
- Reporting and Interoperability
- Offline Sync

These modules now include:

- endpoint descriptions
- realistic Ethiopia-context examples
- reusable parameters and responses
- standardized error structures
- Postman and Swagger compatible bundled output

## Current Commands

Run the following from `technical-implementation/backend/api/`:

```bash
npm run openapi:lint
npm run openapi:bundle
```

## Immediate Next Step

The next contract milestone should be the internal backend and ML prediction contract. That contract should define:

- prediction inputs
- prediction outputs
- model metadata
- refresh and scoring mode
- failure and stale-data handling rules
