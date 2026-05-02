from django.test import TestCase
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from offline.models import DeviceRegistration, SyncBatch
from users.models import Role, User


class SyncBatchListScopeTests(TestCase):
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
        self.other_worker = User.objects.create_user(
            email='other@example.com',
            password='password123',
            full_name='Other Worker',
            role=self.worker_role,
            status=User.Status.ACTIVE,
        )
        self.worker_device = DeviceRegistration.objects.create(
            user=self.worker,
            device_label='Worker phone',
            platform='android',
        )
        self.other_device = DeviceRegistration.objects.create(
            user=self.other_worker,
            device_label='Other phone',
            platform='android',
        )
        self.worker_batch = SyncBatch.objects.create(
            user=self.worker,
            device=self.worker_device,
            record_count=1,
        )
        self.other_batch = SyncBatch.objects.create(
            user=self.other_worker,
            device=self.other_device,
            record_count=1,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_health_worker_sees_only_own_device_batches(self):
        self.authenticate(self.worker)

        response = self.client.get('/api/v1/offline/sync/batches/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [str(self.worker_batch.id)])

    def test_admin_can_filter_batches_by_user_id(self):
        self.authenticate(self.admin)

        response = self.client.get(
            '/api/v1/offline/sync/batches/',
            {'user_id': str(self.other_worker.id)},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [str(self.other_batch.id)])
