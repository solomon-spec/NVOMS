# NVOMS Backend

National Vaccination Outbreak Management System — Django REST API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Django 4.x + Django REST Framework |
| Auth | JWT via `djangorestframework-simplejwt` |
| Database | SQLite (dev) / PostgreSQL (prod) |
| API Docs | `drf-spectacular` (Swagger + ReDoc) |
| Task Queue | Celery + Redis |
| Filtering | `django-filter` |
| CORS | `django-cors-headers` |

---

## Project Structure

```
backend/
├── manage.py
├── db.sqlite3
├── nvoms/                     # Project configuration
│   ├── settings.py
│   ├── urls.py                # Root URL routing
│   ├── middleware.py          # AuditLog + RoleBasedAccess middleware
│   ├── wsgi.py
│   └── asgi.py
├── core/                      # Shared utilities
│   ├── exceptions.py          # Custom DRF exception handler
│   └── pagination.py          # StandardPagination
├── users/                     # User model, roles, facilities
│   ├── models.py              # User, Role, HealthFacility
│   ├── serializers.py
│   ├── views.py
│   ├── permissions.py         # IsAdmin, IsHealthWorker, IsPublicHealthOfficial, IsAdminOrSelf
│   ├── urls.py                # /users/ routes
│   ├── role_urls.py           # /roles/ routes
│   └── facility_urls.py       # /facilities/ routes
├── authentication/            # JWT login, sessions, token management
│   ├── models.py              # UserSession
│   ├── serializers.py
│   ├── views.py
│   └── urls.py                # /auth/ routes
├── patients/                  # Patient registration and profiles
├── vaccines/                  # Vaccine catalogue
├── immunizations/             # Vaccination records
├── surveillance/              # Disease surveillance and outbreak tracking
├── geography/                 # Regions, districts, facilities geography
├── notifications/             # Alerts and notification delivery
├── analytics/                 # Dashboards and aggregated metrics
├── reports/                   # Report generation
├── integrations/              # External system connectors
└── offline/                   # Offline sync support
```

---

## API Endpoints

Base path: `/api/v1/`

### Authentication — `/api/v1/auth/`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `login` | Public | Obtain JWT access + refresh tokens |
| POST | `refresh` | Public | Rotate refresh token |
| POST | `logout` | Authenticated | Revoke current session |
| POST | `logout-all` | Authenticated | Revoke all sessions |
| GET | `me` | Authenticated | Current user profile |
| POST | `change-password` | Authenticated | Change password |

### Users — `/api/v1/users/`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `` | Admin | List all users |
| POST | `` | Admin | Create user |
| GET | `{uid}` | Admin or self | Retrieve user |
| PUT | `{uid}` | Admin or self | Update user profile |
| PATCH | `{uid}` | Admin or self | Partial update |
| DELETE | `{uid}` | Admin | Soft-delete user |
| PUT | `{uid}/status` | Admin | Update user status |
| PUT | `{uid}/roles` | Admin | Assign role to user |

### Roles — `/api/v1/roles/`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `` | Admin | List roles |
| POST | `` | Admin | Create role |
| GET | `{id}` | Admin | Retrieve role |
| PUT | `{id}` | Admin | Update role |
| DELETE | `{id}` | Admin | Delete role (blocked if users assigned) |

### Facilities — `/api/v1/facilities/`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `` | Authenticated | List health facilities |
| POST | `` | Admin | Create facility |
| GET | `{id}` | Authenticated | Retrieve facility |
| PUT | `{id}` | Admin | Update facility |
| DELETE | `{id}` | Admin | Delete facility |

---

## Authentication

All non-public endpoints require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <accessToken>
```

Token lifetimes (configurable in `settings.py` → `SIMPLE_JWT`):

- Access token: **1 hour**
- Refresh token: **7 days** (rotated on each refresh, old token blacklisted)

Account lockout: **5 failed login attempts** triggers a **30-minute lock**.

---

## Role-Based Access Control

### Roles

| Role code | Description |
|---|---|
| `ADMIN` | Full system access — equivalent to superuser |
| `HEALTH_WORKER` | Patient registration, vaccination recording, surveillance, offline sync |
| `PUBLIC_HEALTH_OFFICIAL` | Read-only access to analytics, reports, and surveillance |

### Access Matrix (middleware-level, by URL prefix)

| Prefix | Allowed roles |
|---|---|
| `/api/v1/users/` | `ADMIN` |
| `/api/v1/roles/` | `ADMIN` |
| `/api/v1/integrations/` | `ADMIN` |
| `/api/v1/analytics/` | `ADMIN`, `PUBLIC_HEALTH_OFFICIAL` |
| `/api/v1/reports/` | `ADMIN`, `PUBLIC_HEALTH_OFFICIAL` |
| `/api/v1/patients/` | `ADMIN`, `HEALTH_WORKER` |
| `/api/v1/vaccines/` | `ADMIN`, `HEALTH_WORKER`, `PUBLIC_HEALTH_OFFICIAL` |
| `/api/v1/immunizations/` | `ADMIN`, `HEALTH_WORKER` |
| `/api/v1/surveillance/` | `ADMIN`, `HEALTH_WORKER`, `PUBLIC_HEALTH_OFFICIAL` |
| `/api/v1/offline/` | `ADMIN`, `HEALTH_WORKER` |
| `/api/v1/notifications/` | `ADMIN`, `HEALTH_WORKER`, `PUBLIC_HEALTH_OFFICIAL` |
| `/api/v1/facilities/` | Any authenticated user (write restricted to `ADMIN` at view level) |

---

## Getting Started

### 1. Create and activate virtual environment

```bash
python -m venv nvoms_env
# Windows
nvoms_env\Scripts\activate
# macOS/Linux
source nvoms_env/bin/activate
```

### 2. Install dependencies

```bash
pip install django djangorestframework djangorestframework-simplejwt \
    drf-spectacular django-filter django-cors-headers \
    celery django-celery-beat django-celery-results
```

### 3. Apply migrations

```bash
python manage.py migrate
```

### 4. Create a superuser (auto-assigned ADMIN role)

```bash
python manage.py createsuperuser
```

### 5. Run the development server

```bash
python manage.py runserver
```

### 6. API documentation

| UI | URL |
|---|---|
| Swagger | `http://localhost:8000/api/docs/` |
| ReDoc | `http://localhost:8000/api/redoc/` |
| Raw schema | `http://localhost:8000/api/schema/` |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | insecure dev key | Django secret key |
| `DEBUG` | `True` | Debug mode |
| `CORS_ALLOWED_ORIGINS` | localhost:3000, :5173 | Allowed CORS origins |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Redis broker URL |
