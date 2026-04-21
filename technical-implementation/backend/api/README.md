# API Contract Tooling

This folder now carries the finalized NVOMS API documentation as a single resolved OpenAPI contract file.

## Current Contract File

- `openapi/openapi.yaml`
  canonical OpenAPI 3.0.3 specification for `NVOMS API` version `1.1.0`

The current contract documents 18 tagged functional areas and 77 path entries, covering authentication, user and role management, geography and facilities, caregivers, patient registry, vaccine reference data, immunization, surveillance, outbreak alerts, notifications, offline synchronization, analytics, environmental data, prediction, reporting, interoperability, and system or audit workflows.

## Commands

- `npm run openapi:lint`
  validates `openapi/openapi.yaml`

## Notes

- The legacy split-draft files and bundled copy have been removed.
- For current review and documentation work, use `openapi/openapi.yaml` as the source of truth.
