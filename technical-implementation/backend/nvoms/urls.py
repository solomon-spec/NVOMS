"""
URL configuration for the NVOMS project.
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),
    # OpenAPI schema & interactive docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # ── API v1 ────────────────────────────────────────────────────────────────
    path("api/v1/auth/", include("authentication.urls")),
    path("api/v1/users/", include("users.urls")),
    path("api/v1/roles/", include("users.role_urls")),
    path("api/v1/facilities/", include("users.facility_urls")),
    path("api/v1/patients/", include("patients.urls")),
    path("api/v1/vaccines/", include("vaccines.urls")),
    path("api/v1/immunizations/", include("immunizations.urls")),
    path("api/v1/surveillance/", include("surveillance.urls")),
    path("api/v1/notifications/", include("notifications.urls")),
    path("api/v1/analytics/", include("analytics.urls")),
    path("api/v1/reports/", include("reports.urls")),
    path("api/v1/integrations/", include("integrations.urls")),
    path("api/v1/offline/", include("offline.urls")),
    path("api/v1/geography/", include("geography.urls")),
]
