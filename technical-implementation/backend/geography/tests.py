from django.test import TestCase
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from geography.models import AdministrativeUnit
from users.models import Role, User


class GeographyMutationTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.pho_role = Role.objects.create(
            role_code='PUBLIC_HEALTH_OFFICIAL',
            role_name='Public Health Official',
        )
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        self.pho = User.objects.create_user(
            email='pho@example.com',
            password='password123',
            full_name='PHO User',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        self.parent = AdministrativeUnit.objects.create(
            code='REG-1',
            name='Region 1',
            level=AdministrativeUnit.Level.REGION,
        )
        self.child = AdministrativeUnit.objects.create(
            code='WOR-1',
            name='Woreda 1',
            level=AdministrativeUnit.Level.WOREDA,
            parent=self.parent,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_mutations_are_restricted_to_admin(self):
        self.authenticate(self.pho)

        response = self.client.post(
            '/api/v1/geography/',
            {'code': 'REG-2', 'name': 'Region 2', 'level': AdministrativeUnit.Level.REGION},
            format='json',
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_with_child_units_returns_conflict(self):
        self.authenticate(self.admin)

        response = self.client.delete(f'/api/v1/geography/{self.parent.id}/')

        self.assertEqual(response.status_code, 409)
        self.parent.refresh_from_db()
        self.assertTrue(self.parent.is_active)

    def test_admin_soft_deletes_unit_without_children(self):
        self.authenticate(self.admin)

        response = self.client.delete(f'/api/v1/geography/{self.child.id}/')

        self.assertEqual(response.status_code, 204)
        self.child.refresh_from_db()
        self.assertFalse(self.child.is_active)
