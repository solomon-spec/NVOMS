# Technical Implementation Structure

This folder is the implementation workspace for the National Vaccination and Outbreak Monitoring System.

It is now organized around the actual app workspaces instead of duplicated top-level support folders.

## Main Layout

- `backend/`
  backend API folder structure
- `frontend/`
  frontend web app folder structure
- `data/`
  database schema, migrations, seeds, and datasets
- `ml/`
  model training, inference, feature engineering, and evaluation

## Notes

- `backend/api/` and `frontend/web/` own their own internal structure
- duplicated top-level folders such as `integrations/`, `infrastructure/`, `testing/`, `scripts/`, and `shared-resources/` were removed
- empty folders that should be pushed to Git are kept with `.gitkeep`

## Architecture Alignment

The folder structure reflects the project’s technical direction:

- backend: contract-first API, modules, shared infrastructure, and tests
- frontend: web app with `src/`, feature folders, and app-local tests
- database: PostgreSQL
- analytics and prediction: Python-based ML components

## Recommended Build Order

1. define the API contract under `backend/api/openapi/`
2. implement backend modules under `backend/api/src/modules/`
3. connect the frontend under `frontend/web/src/`
4. define schema and datasets under `data/`
5. add prediction and analytics pipelines under `ml/`
