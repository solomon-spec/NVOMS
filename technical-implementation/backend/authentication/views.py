from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import UserSession
from authentication.serializers import (
    ChangePasswordRequestSerializer,
    LoginRequestSerializer,
    NVOMSTokenObtainPairSerializer,
    RefreshTokenRequestSerializer,
    issue_tokens_for_user,
    revoke_user_sessions,
    session_user_payload,
    token_pair_payload,
)
from users.models import User as UserModel
from users.serializers import UserSerializer


def _request_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _persist_session(user, refresh, request):
    expires_at = timezone.now() + refresh.lifetime
    UserSession.objects.create(
        user=user,
        jwt_id=str(refresh["jti"]),
        client_ip=_request_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        expires_at=expires_at,
    )


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        request_serializer = LoginRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        serializer = NVOMSTokenObtainPairSerializer(
            data=request_serializer.validated_data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        refresh = data.pop("_refresh_obj")
        user = data.pop("_user_obj")
        _persist_session(user=user, refresh=refresh, request=request)
        return Response(data, status=status.HTTP_200_OK)


class RefreshAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RefreshTokenRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            incoming = RefreshToken(serializer.validated_data["refreshToken"])
            user = incoming.user
            UserSession.objects.filter(
                jwt_id=str(incoming["jti"]),
                revoked_at__isnull=True,
            ).update(revoked_at=timezone.now())
        except TokenError as exc:
            return Response(
                {"errorCode": "UNAUTHORIZED", "message": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as exc:
            return Response(
                {"errorCode": "UNAUTHORIZED", "message": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        new_refresh = issue_tokens_for_user(user)
        _persist_session(user=user, refresh=new_refresh, request=request)
        return Response(
            {
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "role": user.role.role_code,
                    "displayName": user.full_name,
                    "facilityCode": (
                        user.assigned_facility.facility_code
                        if user.assigned_facility
                        else None
                    ),
                    "mustChangePassword": user.must_change_password,
                },
                "tokens": token_pair_payload(new_refresh),
            },
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RefreshTokenRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            incoming = RefreshToken(serializer.validated_data["refreshToken"])
            UserSession.objects.filter(
                jwt_id=str(incoming["jti"]),
                revoked_at__isnull=True,
            ).update(revoked_at=timezone.now())
            incoming.blacklist()
        except TokenError:
            pass

        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


class LogoutAllAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        revoke_user_sessions(request.user)
        tokens = OutstandingToken.objects.filter(user=request.user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
        return Response({"message": "All sessions revoked."}, status=status.HTTP_200_OK)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = UserModel.objects.select_related("role", "assigned_facility").get(
            pk=request.user.pk
        )
        return Response(
            {
                "user": session_user_payload(user),
                "profile": UserSerializer(user).data,
            }
        )


class ChangePasswordAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = ChangePasswordRequestSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["newPassword"])
        user.must_change_password = False
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(
            update_fields=[
                "password",
                "must_change_password",
                "failed_login_attempts",
                "locked_until",
            ]
        )

        revoke_user_sessions(user)
        new_refresh = issue_tokens_for_user(user)
        _persist_session(user=user, refresh=new_refresh, request=request)

        return Response(
            {
                "message": "Password changed successfully.",
                "tokens": token_pair_payload(new_refresh),
            },
            status=status.HTTP_200_OK,
        )
