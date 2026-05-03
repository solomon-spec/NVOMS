from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from environmental.models import MeteorologicalObservation
from geography.models import AdministrativeUnit
from users.models import Role, User


class EnvironmentalObservationTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.pho_role = Role.objects.create(
            role_code='PUBLIC_HEALTH_OFFICIAL',
            role_name='Public Health Official',
        )
        self.admin = User.objects.create_user(
            email='env-admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        self.pho = User.objects.create_user(
            email='env-pho@example.com',
            password='password123',
            full_name='PHO User',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        self.unit = AdministrativeUnit.objects.create(
            code='ENV-WOR',
            name='Environmental Woreda',
            level=AdministrativeUnit.Level.WOREDA,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_admin_can_create_observation_and_pho_can_filter_list(self):
        self.authenticate(self.admin)
        create_response = self.client.post(
            '/api/v1/environmental/observations/',
            {
                'unit_id': str(self.unit.id),
                'observation_date': '2026-05-01',
                'rainfall_mm': '12.40',
                'temperature_c': '22.50',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(MeteorologicalObservation.objects.count(), 1)

        self.authenticate(self.pho)
        list_response = self.client.get(
            '/api/v1/environmental/observations/',
            {'unit_id': str(self.unit.id), 'date_from': '2026-05-01', 'date_to': '2026-05-01'},
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['unit_name'], self.unit.name)
        self.assertEqual(list_response.data[0]['observation_date'], date(2026, 5, 1).isoformat())
