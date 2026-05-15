from datetime import timedelta
import secrets

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import PasswordResetToken, UserSession
from notifications.services import send_password_reset_email, send_sms
from users.models import User

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCK_DURATION = timedelta(minutes=30)
PASSWORD_RESET_TOKEN_TTL = timedelta(minutes=30)
PASSWORD_RESET_RATE_LIMIT = 3


def token_pair_payload(refresh):
    access = refresh.access_token
    return {
        "accessToken": str(access),
        "refreshToken": str(refresh),
        "tokenType": "Bearer",
        "expiresIn": int(access.lifetime.total_seconds()),
    }


def session_user_payload(user):
    facility_code = None
    if getattr(user, "assigned_facility", None):
        facility_code = user.assigned_facility.facility_code
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role.role_code,
        "displayName": user.full_name,
        "facilityCode": facility_code,
        "mustChangePassword": user.must_change_password,
    }


def _auth_error(code, message, details=None):
    payload = {"errorCode": code, "message": message}
    if details:
        payload["details"] = details
    return payload


class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class RefreshTokenRequestSerializer(serializers.Serializer):
    refreshToken = serializers.CharField()


class ChangePasswordRequestSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(write_only=True, trim_whitespace=False)
    newPassword = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["currentPassword"]):
            raise serializers.ValidationError(
                _auth_error("INVALID_CREDENTIALS", "Current password is incorrect.")
            )
        if attrs["currentPassword"] == attrs["newPassword"]:
            raise serializers.ValidationError(
                _auth_error(
                    "UNPROCESSABLE",
                    "New password must differ from the current password.",
                )
            )
        validate_password(attrs["newPassword"], user=user)
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=24, required=False, allow_blank=True)

    def validate(self, attrs):
        email = attrs.get('email') or None
        phone_number = attrs.get('phone_number') or None
        if not email and not phone_number:
            raise serializers.ValidationError('email or phone_number is required.')
        attrs['email'] = email
        attrs['phone_number'] = phone_number
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    def validate(self, attrs):
        token_hash = PasswordResetToken.hash_token(attrs['token'])
        reset = (
            PasswordResetToken.objects
            .select_related('user')
            .filter(token_hash=token_hash, used_at__isnull=True, expires_at__gte=timezone.now())
            .first()
        )
        if reset is None:
            raise serializers.ValidationError({'token': 'Invalid or expired token.'})
        validate_password(attrs['new_password'], user=reset.user)
        attrs['reset'] = reset
        return attrs


class NVOMSTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    default_error_messages = {
        "no_active_account": "Invalid credentials.",
    }

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        try:
            user = User.objects.select_related("role", "assigned_facility").get(email=email)
        except User.DoesNotExist as exc:
            raise AuthenticationFailed(
                _auth_error("INVALID_CREDENTIALS", "The email or password is incorrect.")
            ) from exc

        now = timezone.now()
        if user.locked_until and user.locked_until > now:
            raise PermissionDenied(
                _auth_error(
                    "ACCOUNT_LOCKED",
                    f"Account is locked until {user.locked_until.isoformat()}",
                    {"lockedUntil": user.locked_until.isoformat()},
                )
            )

        authenticated_user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )
        if authenticated_user is None:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
                user.status = User.Status.LOCKED
                user.locked_until = now + LOCK_DURATION
            user.save(update_fields=["failed_login_attempts", "status", "locked_until"])
            raise AuthenticationFailed(
                _auth_error("INVALID_CREDENTIALS", "The email or password is incorrect.")
            )

        if authenticated_user.status not in {User.Status.ACTIVE, User.Status.INACTIVE}:
            raise PermissionDenied(
                _auth_error("FORBIDDEN", "User account is not allowed to sign in.")
            )

        if authenticated_user.locked_until and authenticated_user.locked_until > now:
            raise PermissionDenied(
                _auth_error(
                    "ACCOUNT_LOCKED",
                    f"Account is locked until {authenticated_user.locked_until.isoformat()}",
                    {"lockedUntil": authenticated_user.locked_until.isoformat()},
                )
            )

        authenticated_user.failed_login_attempts = 0
        authenticated_user.locked_until = None
        if authenticated_user.status == User.Status.INACTIVE:
            authenticated_user.status = User.Status.ACTIVE
        authenticated_user.save(update_fields=["failed_login_attempts", "locked_until", "status"])

        refresh = self.get_token(authenticated_user)
        return {
            "user": session_user_payload(authenticated_user),
            "tokens": token_pair_payload(refresh),
            "_refresh_obj": refresh,
            "_user_obj": authenticated_user,
        }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role.role_code
        return token


def issue_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role.role_code
    return refresh


@transaction.atomic
def revoke_user_sessions(user):
    UserSession.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=timezone.now())


def create_password_reset_token(user, contact):
    token = secrets.token_urlsafe(32)
    return token, PasswordResetToken.objects.create(
        user=user,
        token_hash=PasswordResetToken.hash_token(token),
        contact=contact,
        expires_at=timezone.now() + PASSWORD_RESET_TOKEN_TTL,
    )


def password_reset_rate_limited(contact):
    since = timezone.now() - timedelta(hours=1)
    return PasswordResetToken.objects.filter(contact=contact, created_at__gte=since).count() >= PASSWORD_RESET_RATE_LIMIT


def send_password_reset_token(user, token, contact):
    if '@' in contact:
        send_password_reset_email(user, token)
    else:
        send_sms(contact, f'Your NVOMS password reset token is {token}. It expires in 30 minutes.')

