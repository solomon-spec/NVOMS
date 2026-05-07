from django.test import TestCase
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from core.models import AuditLog
from users.models import Role, User


class AuditLogEndpointTests(TestCase):
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
        self.worker = User.objects.create_user(
            email='worker@example.com',
            password='password123',
            full_name='Worker User',
            role=self.worker_role,
            status=User.Status.ACTIVE,
        )
        self.log = AuditLog.objects.create(
            actor_user=self.admin,
            action=AuditLog.Action.USER_CREATE,
            entity_type='user',
            entity_id=str(self.worker.id),
            detail={'email': self.worker.email},
            ip_address='127.0.0.1',
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_admin_can_filter_audit_logs(self):
        self.authenticate(self.admin)

        response = self.client.get(
            '/api/v1/audit-logs/',
            {'actor_user_id': str(self.admin.id), 'action': AuditLog.Action.USER_CREATE},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['items'][0]['id'], str(self.log.id))

    def test_non_admin_cannot_read_audit_logs(self):
        self.authenticate(self.worker)

        response = self.client.get('/api/v1/audit-logs/')

        self.assertEqual(response.status_code, 403)
