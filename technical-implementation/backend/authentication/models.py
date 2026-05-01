import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class UserSession(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column="session_id"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions",
        db_column="user_id",
    )
    jwt_id = models.CharField(max_length=128, unique=True)
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    issued_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "user_sessions"

    @property
    def is_revoked(self):
        return self.revoked_at is not None
