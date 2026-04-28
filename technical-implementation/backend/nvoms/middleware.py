"""
NVOMS custom middleware.

AuditLogMiddleware        – logs every request with user info and response status.
RoleBasedAccessMiddleware – enforces role-based URL access using JWT claims.
"""

import logging

from django.http import JsonResponse
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger("nvoms.middleware")

# ── Open paths (no token required) ───────────────────────────────────────────
OPEN_PATHS = [
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/admin/",  # Django admin handles its own auth
    "/api/schema/",  # OpenAPI schema endpoint
    "/api/docs/",  # Swagger UI
    "/api/redoc/",  # ReDoc UI
]

# ── URL prefix → allowed roles ────────────────────────────────────────────────
ROLE_ACCESS_MAP = {
    "/api/v1/users/": {"ADMIN"},
    "/api/v1/roles/": {"ADMIN"},
    "/api/v1/integrations/": {"ADMIN"},
    "/api/v1/prediction/": {"ADMIN", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/analytics/": {"ADMIN", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/reports/": {"ADMIN", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/notifications/": {"ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/patients/": {"ADMIN", "HEALTH_WORKER"},
    "/api/v1/vaccines/": {"ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/immunizations/": {"ADMIN", "HEALTH_WORKER"},
    "/api/v1/surveillance/": {"ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/offline/": {"ADMIN", "HEALTH_WORKER"},
    "/api/v1/auth/change-password": {"ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/auth/logout": {"ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/auth/logout-all": {"ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"},
    "/api/v1/auth/me": {"ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"},
}


# ── AuditLogMiddleware ────────────────────────────────────────────────────────


class AuditLogMiddleware:
    """
    Logs every request in the format:
        [AUDIT] METHOD /path | user=<email|anonymous> | status=<code>
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            user_label = getattr(user, "email", str(user))
        else:
            user_label = "anonymous"

        logger.debug(
            "[AUDIT] %s %s | user=%s | status=%s",
            request.method,
            request.path,
            user_label,
            response.status_code,
        )
        return response


# ── RoleBasedAccessMiddleware ─────────────────────────────────────────────────


class RoleBasedAccessMiddleware:
    """
    Enforces role-based URL access by decoding the JWT Bearer token and
    inspecting the embedded 'role' claim.

    Flow:
      1. Open paths → pass through immediately.
      2. Extract Bearer token → 401 if missing or invalid.
      3. Longest-prefix match in ROLE_ACCESS_MAP → 403 if role not allowed.
      4. Otherwise pass through.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # Pre-sort prefixes longest-first so most-specific match wins
        self._sorted_prefixes = sorted(ROLE_ACCESS_MAP.keys(), key=len, reverse=True)

    def _json_401(self):
        return JsonResponse(
            {
                "error": {
                    "code": "AUTHENTICATION_REQUIRED",
                    "message": (
                        "Authentication credentials were not provided or are invalid."
                    ),
                }
            },
            status=401,
        )

    def _json_403(self):
        return JsonResponse(
            {
                "error": {
                    "code": "PERMISSION_DENIED",
                    "message": "You do not have permission to access this resource.",
                }
            },
            status=403,
        )

    def __call__(self, request):
        path = request.path

        # 1. Always allow open paths ───────────────────────────────────────────
        for open_path in OPEN_PATHS:
            if path.startswith(open_path):
                return self.get_response(request)

        # 2. Decode the Bearer token ───────────────────────────────────────────
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        role = None

        if auth_header.startswith("Bearer "):
            raw_token = auth_header.split(" ", 1)[1].strip()
            try:
                token = AccessToken(raw_token)
                role = token.get("role")
            except (InvalidToken, TokenError) as exc:
                logger.debug("RoleBasedAccessMiddleware: invalid token – %s", exc)
                return self._json_401()
        else:
            return self._json_401()

        # 3. Find the longest matching URL prefix ─────────────────────────────
        allowed_roles = None
        for prefix in self._sorted_prefixes:
            if path.startswith(prefix):
                allowed_roles = ROLE_ACCESS_MAP[prefix]
                break

        # 4. Enforce role ──────────────────────────────────────────────────────
        if allowed_roles is not None and role not in allowed_roles:
            logger.debug(
                "RoleBasedAccessMiddleware: role=%r denied for path=%s", role, path
            )
            return self._json_403()

        return self.get_response(request)
