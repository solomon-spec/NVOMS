from datetime import date

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from geography.models import AdministrativeUnit
from immunizations.models import ImmunizationEvent
from integrations.models import SyncLog
from patients.models import Caregiver, Patient
from surveillance.models import SurveillanceReport
from users.models import HealthFacility, Role, User
from vaccines.models import Antigen, VaccineDefinition


class IntegrationEndpointTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.pho_role = Role.objects.create(
            role_code='PUBLIC_HEALTH_OFFICIAL',
            role_name='Public Health Official',
        )
        self.admin = User.objects.create_user(
            email='int-admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        self.pho = User.objects.create_user(
            email='int-pho@example.com',
            password='password123',
            full_name='PHO User',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        self.unit = AdministrativeUnit.objects.create(
            code='INT-WOR',
            name='Interop Woreda',
            level=AdministrativeUnit.Level.WOREDA,
        )
        self.facility = HealthFacility.objects.create(
            facility_code='HF-1',
            facility_name='Health Facility',
        )
        caregiver = Caregiver.objects.create(
            full_name='Care Giver',
            phone_number='+251922222222',
            relationship_to_patient='father',
            residence_unit=self.unit,
        )
        self.patient = Patient.objects.create(
            first_name='Patient',
            last_name='One',
            sex=Patient.Sex.MALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
            residence_unit=self.unit,
        )
        antigen = Antigen.objects.create(code='bcg', name='BCG')
        self.vaccine = VaccineDefinition.objects.create(
            vaccine_code='BCG',
            vaccine_name='BCG',
            antigen=antigen,
        )
        self.event = ImmunizationEvent.objects.create(
            patient=self.patient,
            vaccine=self.vaccine,
            facility=self.facility,
            administered_at=timezone.now(),
        )
        self.report = SurveillanceReport.objects.create(
            patient=self.patient,
            facility=self.facility,
            reported_by=self.pho,
            surveillance_category=SurveillanceReport.Category.SYMPTOM,
            condition_type='rash',
            disease_suspected='measles',
            onset_date=date(2026, 5, 1),
            severity=SurveillanceReport.Severity.MODERATE,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    @override_settings(DHIS2_DRY_RUN=True)
    def test_dhis2_sync_marks_immunization_events_and_logs_batch(self):
        self.authenticate(self.admin)

        response = self.client.post('/api/v1/dhis2/sync/', {}, format='json')

        self.assertEqual(response.status_code, 202)
        self.event.refresh_from_db()
        self.assertIsNotNone(self.event.dhis2_synced_at)
        log = SyncLog.objects.get()
        self.assertEqual(log.integration_type, SyncLog.IntegrationType.DHIS2)
        self.assertEqual(log.records_attempted, 1)
        self.assertEqual(log.records_synced, 1)

    def test_fhir_patient_immunization_and_observation_endpoints(self):
        self.authenticate(self.pho)

        patient_response = self.client.get(f'/api/v1/fhir/Patient/{self.patient.id}')
        immunization_response = self.client.get(f'/api/v1/fhir/Immunization/{self.event.id}')
        observation_response = self.client.get(f'/api/v1/fhir/Observation/{self.report.id}')

        self.assertEqual(patient_response.status_code, 200)
        self.assertEqual(patient_response.data['resourceType'], 'Patient')
        self.assertEqual(immunization_response.status_code, 200)
        self.assertEqual(immunization_response.data['resourceType'], 'Immunization')
        self.assertEqual(observation_response.status_code, 200)
        self.assertEqual(observation_response.data['resourceType'], 'Observation')

        self.event.refresh_from_db()
        self.report.refresh_from_db()
        self.assertTrue(self.event.fhir_resource_id.startswith('Immunization-'))
        self.assertTrue(self.report.fhir_resource_id.startswith('Observation-'))
