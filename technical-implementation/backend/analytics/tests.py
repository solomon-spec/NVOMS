from django.test import TestCase
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from users.models import Role, User


class AnalyticsPermissionTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_admin_can_access_vaccine_coverage(self):
        self.authenticate(self.admin)

        response = self.client.get('/api/v1/analytics/coverage/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['summary']['total_scheduled'], 0)
        self.assertEqual(response.data['vaccines'], [])
