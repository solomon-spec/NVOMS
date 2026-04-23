from rest_framework.permissions import BasePermission

ADMIN = 'ADMIN'
HEALTH_WORKER = 'HEALTH_WORKER'
PUBLIC_HEALTH_OFFICIAL = 'PUBLIC_HEALTH_OFFICIAL'


def _role_code(user):
    if not user or not user.is_authenticated:
        return None
    try:
        return user.role.role_code
    except AttributeError:
        return None


class IsAdmin(BasePermission):
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return _role_code(request.user) == ADMIN


class IsHealthWorker(BasePermission):
    message = 'Health worker access required.'

    def has_permission(self, request, view):
        return _role_code(request.user) in (ADMIN, HEALTH_WORKER)


class IsPublicHealthOfficial(BasePermission):
    message = 'Public health official access required.'

    def has_permission(self, request, view):
        return _role_code(request.user) in (ADMIN, PUBLIC_HEALTH_OFFICIAL)


class IsAdminOrSelf(BasePermission):
    message = 'You can only access your own profile.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return _role_code(request.user) == ADMIN or obj == request.user
