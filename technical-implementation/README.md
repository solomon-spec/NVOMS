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

## One-command Demo Setup

For a fresh clone, run:

```bash
cd technical-implementation
./setup_demo_environment.sh
```

This installs backend/frontend dependencies, applies migrations, creates demo
accounts, imports the required HDX geography files, and loads demo data.

If the full generated demo file exists at:

```text
data/demo/demo-data-huge-no-geography.json
```

the setup script loads it. Otherwise it falls back to the small bundled backend
sample at `backend/demo_data.example.json`.

Required geography files are already in the repo:

- `data/datasets/eth_admin_boundaries.xlsx`
- `data/datasets/eth_admin_boundaries.shp.zip`

## Run the App Locally

Run the backend and frontend in two separate terminal windows.

### 1. Start the backend

```bash
cd "/Users/tikursew/Documents/Final Year/technical-implementation/backend"
source nvoms_env/bin/activate
python manage.py migrate
python setup_test_accounts.py
python manage.py runserver 127.0.0.1:8000
```

The backend API will be available at:

- API base: `http://127.0.0.1:8000/api/v1/`
- Swagger docs: `http://127.0.0.1:8000/api/docs/`
- ReDoc: `http://127.0.0.1:8000/api/redoc/`

If you want the patient registry and public health monitoring demos to look realistic, import geography and load demo data before starting or while the backend environment is active:

```bash
python manage.py import_hdx_admin_boundaries \
  --source ../data/datasets/eth_admin_boundaries.xlsx \
  --geojson-source ../data/datasets/eth_admin_boundaries.shp.zip

python manage.py load_demo_data \
  ../data/demo/demo-data-huge-no-geography.json \
  --namespace quality-demo \
  --reset \
  --auto-geography
```

### 2. Start the frontend

```bash
cd "/Users/tikursew/Documents/Final Year/technical-implementation/frontend/web"
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

The frontend will be available at:

- App: `http://127.0.0.1:3000`
- Login: `http://127.0.0.1:3000/login`

### Demo Accounts

The `backend/setup_test_accounts.py` script creates these local development accounts:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@nvoms.local` | `password123` |
| Health Worker | `hw@nvoms.local` | `password123` |
| Public Health Official | `pho@nvoms.local` | `password123` |
| Patient | `patient@nvoms.local` | `password123` |
| Caregiver | `caregiver@nvoms.local` | `password123` |

Use these accounts to test role-based navigation and protected pages.

### Demo Video Recordings

Playwright demo recordings are run from the frontend workspace:

```bash
cd "/Users/tikursew/Documents/Final Year/technical-implementation/frontend/web"
npm run demo
```

Run one section at a time:

```bash
npm run demo:auth
npm run demo:patients
npm run demo:patient-detail
npm run demo:registration
npm run demo:case-reports
npm run demo:public-health
```

Generated raw videos are written under:

```bash
frontend/web/test-results/
```

For easy review paths, publish the latest generated videos into stable filenames:

```bash
npm run demo:publish-videos
```

Published videos are written under:

```bash
frontend/web/demo-videos/
```

Example published paths:

- `frontend/web/demo-videos/auth.webm`
- `frontend/web/demo-videos/case-reports.webm`
- `frontend/web/demo-videos/public-health.webm`

Playwright starts its own frontend server for demos. If a manual `npm run dev` server is already running and Next.js reports a dev-server lock, stop the manual frontend server first, run the demo command, then restart the frontend.

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
