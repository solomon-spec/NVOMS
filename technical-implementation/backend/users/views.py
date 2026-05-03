from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import write_audit_log
from core.models import AuditLog
from users.models import HealthFacility, Role, User
from users.permissions import ADMIN, IsAdmin, IsAdminOrSelf, _role_code
from users.serializers import (
    FacilitySerializer,
    RoleSerializer,
    UserCreateSerializer,
    UserRoleAssignSerializer,
    UserSerializer,
    UserStatusSerializer,
    UserUpdateSerializer,
)


class UserListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = User.objects.select_related('role', 'assigned_facility').order_by('full_name')
        return Response(UserSerializer(qs, many=True).data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.USER_CREATE,
            entity_type='user',
            entity_id=user.id,
            detail={'email': user.email, 'role': user.role.role_code},
            request=request,
        )
        user = User.objects.select_related('role', 'assigned_facility').get(pk=user.pk)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = [IsAdminOrSelf]

    def _get_user(self, pk):
        return get_object_or_404(
            User.objects.select_related('role', 'assigned_facility'), pk=pk
        )

    def get(self, request, pk):
        user = self._get_user(pk)
        self.check_object_permissions(request, user)
        return Response(UserSerializer(user).data)

    def put(self, request, pk):
        user = self._get_user(pk)
        self.check_object_permissions(request, user)
        serializer = UserUpdateSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.USER_UPDATE,
            entity_type='user',
            entity_id=user.id,
            detail={'fields': sorted(serializer.validated_data.keys())},
            request=request,
        )
        user = User.objects.select_related('role', 'assigned_facility').get(pk=pk)
        return Response(UserSerializer(user).data)

    def patch(self, request, pk):
        user = self._get_user(pk)
        self.check_object_permissions(request, user)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.USER_UPDATE,
            entity_type='user',
            entity_id=user.id,
            detail={'fields': sorted(serializer.validated_data.keys())},
            request=request,
        )
        user = User.objects.select_related('role', 'assigned_facility').get(pk=pk)
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        if _role_code(request.user) != ADMIN:
            raise PermissionDenied('Admin access required.')
        user = get_object_or_404(User, pk=pk)
        user.status = User.Status.DELETED
        user.is_active = False
        user.save(update_fields=['status', 'is_active'])
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.USER_DEACTIVATE,
            entity_type='user',
            entity_id=user.id,
            detail={'status': User.Status.DELETED},
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserStatusView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = UserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']
        old_status = user.status
        user.status = new_status
        user.is_active = new_status == User.Status.ACTIVE
        user.save(update_fields=['status', 'is_active'])
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.USER_STATUS_UPDATE,
            entity_type='user',
            entity_id=user.id,
            detail={'from_status': old_status, 'to_status': new_status},
            request=request,
        )
        user = User.objects.select_related('role', 'assigned_facility').get(pk=pk)
        return Response(UserSerializer(user).data)


class UserRoleAssignView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, pk):
        user = get_object_or_404(
            User.objects.select_related('role', 'assigned_facility'), pk=pk
        )
        serializer = UserRoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old_role = user.role.role_code
        user.role = serializer.validated_data['role_id']
        user.save(update_fields=['role'])
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.ROLE_ASSIGN,
            entity_type='user',
            entity_id=user.id,
            detail={'from_role': old_role, 'to_role': user.role.role_code},
            request=request,
        )
        user = User.objects.select_related('role', 'assigned_facility').get(pk=pk)
        return Response(UserSerializer(user).data)


class UserUnlockView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        user = get_object_or_404(
            User.objects.select_related('role', 'assigned_facility'), pk=pk
        )
        user.failed_login_attempts = 0
        user.locked_until = None
        user.status = User.Status.ACTIVE
        user.is_active = True
        user.save(
            update_fields=[
                'failed_login_attempts',
                'locked_until',
                'status',
                'is_active',
                'updated_at',
            ]
        )
        write_audit_log(
            actor_user=request.user,
            action=AuditLog.Action.ACCOUNT_UNLOCK,
            entity_type='user',
            entity_id=user.id,
            detail={'status': User.Status.ACTIVE},
            request=request,
        )
        return Response(UserSerializer(user).data)


class RoleListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        roles = Role.objects.order_by('role_code')
        return Response(RoleSerializer(roles, many=True).data)

    def post(self, request):
        serializer = RoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(RoleSerializer(role).data, status=status.HTTP_201_CREATED)


class RoleDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        return Response(RoleSerializer(role).data)

    def put(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        serializer = RoleSerializer(role, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(RoleSerializer(role).data)

    def delete(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        try:
            role.delete()
        except ProtectedError:
            return Response(
                {
                    'errorCode': 'CONFLICT',
                    'message': 'Role is assigned to users and cannot be deleted.',
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class FacilityListView(APIView):

    def get(self, request):
        facilities = HealthFacility.objects.order_by('facility_code')
        return Response(FacilitySerializer(facilities, many=True).data)

    def post(self, request):
        if _role_code(request.user) != ADMIN:
            raise PermissionDenied('Admin access required.')
        serializer = FacilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        facility = serializer.save()
        return Response(FacilitySerializer(facility).data, status=status.HTTP_201_CREATED)


class FacilityDetailView(APIView):

    def get(self, request, pk):
        facility = get_object_or_404(HealthFacility, pk=pk)
        return Response(FacilitySerializer(facility).data)

    def put(self, request, pk):
        if _role_code(request.user) != ADMIN:
            raise PermissionDenied('Admin access required.')
        facility = get_object_or_404(HealthFacility, pk=pk)
        serializer = FacilitySerializer(facility, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(FacilitySerializer(facility).data)

    def delete(self, request, pk):
        if _role_code(request.user) != ADMIN:
            raise PermissionDenied('Admin access required.')
        facility = get_object_or_404(HealthFacility, pk=pk)
        facility.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
