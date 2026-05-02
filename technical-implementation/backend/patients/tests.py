from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from patients.models import Caregiver, Patient
from users.models import Role, User


class PatientMeTests(TestCase):
    def setUp(self):
        self.patient_role = Role.objects.create(role_code='PATIENT', role_name='Patient')
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.patient_user = User.objects.create_user(
            email='patient@example.com',
            password='password123',
            full_name='Patient User',
            role=self.patient_role,
            status=User.Status.ACTIVE,
        )
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        caregiver = Caregiver.objects.create(
            full_name='Care Giver',
            phone_number='+251911000000',
            relationship_to_patient='mother',
        )
        self.patient = Patient.objects.create(
            first_name='Kid',
            sex=Patient.Sex.FEMALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
            user_account=self.patient_user,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_patient_can_read_own_record_schedule_and_doses(self):
        self.authenticate(self.patient_user)

        record = self.client.get('/api/v1/patients/me/')
        schedule = self.client.get('/api/v1/patients/me/schedule/')
        doses = self.client.get('/api/v1/patients/me/doses/')

        self.assertEqual(record.status_code, 200)
        self.assertEqual(record.data['patient']['id'], str(self.patient.id))
        self.assertEqual(schedule.status_code, 200)
        self.assertEqual(schedule.data, [])
        self.assertEqual(doses.status_code, 200)
        self.assertEqual(doses.data, [])

    def test_admin_cannot_use_patient_self_service_endpoint(self):
        self.authenticate(self.admin_user)

        response = self.client.get('/api/v1/patients/me/')

        self.assertEqual(response.status_code, 403)
