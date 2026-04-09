# API Contract Tooling

This folder uses a split OpenAPI structure for authoring and a bundled OpenAPI file for import into Postman or Swagger tools.

## Commands

- `npm run openapi:lint`
  validates the split OpenAPI files
- `npm run openapi:bundle`
  generates `openapi/openapi.bundle.yaml`

## Workflow

1. edit the split files under `openapi/`
2. run `npm run openapi:bundle`
3. import `openapi/openapi.bundle.yaml` into Postman or Swagger
