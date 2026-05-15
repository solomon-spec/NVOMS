"""
Django settings for nvoms project.
"""

import os
from datetime import timedelta
from pathlib import Path
from decouple import config
import dj_database_url

import environ

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Environment ───────────────────────────────────────────────────────────────
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-c+d-x59pwvmzm_$5%!qj5y)d@y4(p4t=_h)h6@s^u#wb@90*h!",
)

DEBUG = os.environ.get("DEBUG", "True") == "True"

ALLOWED_HOSTS = ["*"]

# ── Custom user model ─────────────────────────────────────────────────────────
AUTH_USER_MODEL = "users.User"

# ── Application definition ────────────────────────────────────────────────────
INSTALLED_APPS = [
    # Django defaults
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party packages
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "django_filters",
    "corsheaders",
    "django_celery_beat",
    "django_celery_results",
    # 1. Core & Shared
    "core",
    # 2. Foundational / Infrastructure
    "users",
    "authentication",
    # 3. Main Business Domains
    "patients",
    "vaccines",
    "immunizations",
    "surveillance",
    "geography",
    # 4. Operational & Supporting
    "notifications",
    "analytics",
    "reports",
    "prediction",
    "environmental",
    # 5. Integration & Offline
    "integrations",
    "offline",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # must be before CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Custom NVOMS middleware
    "nvoms.middleware.AuditLogMiddleware",
    "nvoms.middleware.RoleBasedAccessMiddleware",
]

ROOT_URLCONF = "nvoms.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "nvoms.wsgi.application"

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = config("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        ssl_require=not DATABASE_URL.startswith("sqlite"),
    )
}

# ── Password validation ───────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Internationalisation ──────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ── Static files ──────────────────────────────────────────────────────────────
STATIC_URL = "static/"

# ── Primary key default ───────────────────────────────────────────────────────
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── REST Framework ────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "core.exceptions.nvoms_exception_handler",
}

# ── Simple JWT ────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "authentication.serializers.NVOMSTokenObtainPairSerializer",
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
).split(",")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG  # allow all in dev; False in prod via env var

# ── drf-spectacular ───────────────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "NVOMS API",
    "DESCRIPTION": "National Vaccination Outbreak Management System – REST API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/v1/",
    # The API is still being documented incrementally. Several APIViews do not
    # yet expose serializer hints, which makes drf-spectacular emit many
    # warnings while serving /api/schema/. Suppress those warnings so Swagger
    # remains usable during frontend/backend integration work.
    "DISABLE_ERRORS_AND_WARNINGS": True,
}

# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "django-cache"
CELERY_TIMEZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_TASK_ALWAYS_EAGER = os.environ.get("CELERY_TASK_ALWAYS_EAGER", "False") == "True"

# ── Email / SMS delivery ──────────────────────────────────────────────────────
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@nvoms.local")
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
PASSWORD_RESET_URL = os.environ.get(
    "PASSWORD_RESET_URL",
    "http://localhost:3000/auth/reset-password",
)

SMS_GATEWAY = os.environ.get("SMS_GATEWAY", "console").lower()
SMS_FROM = os.environ.get("SMS_FROM", "NVOMS")
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "")
AFRICASTALKING_USERNAME = os.environ.get("AFRICASTALKING_USERNAME", "")
AFRICASTALKING_API_KEY = os.environ.get("AFRICASTALKING_API_KEY", "")
AFRICASTALKING_SENDER_ID = os.environ.get("AFRICASTALKING_SENDER_ID", "")

# ── Prediction / External integrations ───────────────────────────────────────
PREDICTION_DISEASES = os.environ.get("PREDICTION_DISEASES", "measles")
OPEN_METEO_ENABLED = os.environ.get("OPEN_METEO_ENABLED", "False") == "True"
DHIS2_BASE_URL = os.environ.get("DHIS2_BASE_URL", "")
DHIS2_USERNAME = os.environ.get("DHIS2_USERNAME", "")
DHIS2_PASSWORD = os.environ.get("DHIS2_PASSWORD", "")
DHIS2_PROGRAM_ID = os.environ.get("DHIS2_PROGRAM_ID", "")
DHIS2_DRY_RUN = os.environ.get("DHIS2_DRY_RUN", "True") == "True"

CELERY_BEAT_SCHEDULE = {
    # Daily 08:00 UTC — remind caregivers of vaccines due today
    'send-vaccine-reminders-daily': {
        'task': 'notifications.send_vaccine_reminders',
        'schedule': timedelta(hours=24),
        'options': {'expires': 3600},
    },
    # Daily 09:00 UTC — alert caregivers of overdue/defaulter slots
    'send-overdue-alerts-daily': {
        'task': 'notifications.send_overdue_alerts',
        'schedule': timedelta(hours=24),
        'options': {'expires': 3600},
    },
    # Every 5 minutes — dispatch all QUEUED notifications via the SMS gateway
    'dispatch-queued-notifications': {
        'task': 'notifications.dispatch_queued_notifications',
        'schedule': timedelta(minutes=5),
        'options': {'expires': 240},
    },
}

# ── SMS Gateway (Android SMS Gateway by capcom6 – https://sms-gate.app) ──────
SMS_GATEWAY_URL = os.environ.get(
    "SMS_GATEWAY_URL", "https://api.sms-gate.app/3rdparty/v1/message"
)
SMS_GATEWAY_LOGIN = os.environ.get("SMS_GATEWAY_LOGIN", "")
SMS_GATEWAY_PASSWORD = os.environ.get("SMS_GATEWAY_PASSWORD", "")
SMS_MAX_RETRIES = int(os.environ.get("SMS_MAX_RETRIES", "3"))

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "nvoms.middleware": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "authentication": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
