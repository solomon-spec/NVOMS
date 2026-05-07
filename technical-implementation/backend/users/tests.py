from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from core.models import AuditLog
from users.models import Role, User


class UserUnlockTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.worker_role = Role.objects.create(
            role_code='HEALTH_WORKER',
            role_name='Health Worker',
        )
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        self.locked_user = User.objects.create_user(
            email='locked@example.com',
            password='password123',
            full_name='Locked User',
            role=self.worker_role,
            status=User.Status.LOCKED,
            failed_login_attempts=3,
            locked_until=timezone.now() + timedelta(minutes=30),
            is_active=False,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_admin_can_unlock_locked_user(self):
        self.authenticate(self.admin)

        response = self.client.post(f'/api/v1/users/{self.locked_user.id}/unlock/')

        self.assertEqual(response.status_code, 200)
        self.locked_user.refresh_from_db()
        self.assertEqual(self.locked_user.status, User.Status.ACTIVE)
        self.assertEqual(self.locked_user.failed_login_attempts, 0)
        self.assertIsNone(self.locked_user.locked_until)
        self.assertTrue(self.locked_user.is_active)
        self.assertTrue(
            AuditLog.objects.filter(
                actor_user=self.admin,
                action=AuditLog.Action.ACCOUNT_UNLOCK,
                entity_type='user',
                entity_id=str(self.locked_user.id),
            ).exists()
        )
