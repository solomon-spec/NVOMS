from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from immunizations.models import ImmunizationEvent, PatientDiseaseSchedule, SupportedDisease
from patients.models import Caregiver, Patient
from users.models import Role, User
from vaccines.models import Antigen, VaccineDefinition


class DiseaseOutcomeFlowTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.admin = User.objects.create_user(
            email='immunization-admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        self.caregiver = Caregiver.objects.create(
            full_name='Caregiver',
            phone_number='+251911111111',
            relationship_to_patient='mother',
        )
        measles = Antigen.objects.create(code='MEASLES', name='Measles')
        polio = Antigen.objects.create(code='POLIO', name='Polio')
        self.measles_vaccine = VaccineDefinition.objects.create(
            vaccine_code='MCV1',
            vaccine_name='Measles 1',
            antigen=measles,
        )
        self.polio_vaccine = VaccineDefinition.objects.create(
            vaccine_code='OPV1',
            vaccine_name='OPV 1',
            antigen=polio,
        )
        self.client = APIClient()
        self.authenticate(self.admin)

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_patient_registration_accepts_three_disease_due_dates(self):
        response = self.client.post(
            '/api/v1/patients/',
            {
                'first_name': 'New',
                'last_name': 'Patient',
                'sex': Patient.Sex.FEMALE,
                'date_of_birth': '2025-01-01',
                'primary_caregiver_id': str(self.caregiver.id),
                'disease_due_dates': [
                    {
                        'disease': SupportedDisease.MEASLES,
                        'due_date': '2025-10-01',
                    },
                    {
                        'disease': SupportedDisease.POLIO,
                        'due_date': '2025-03-01',
                    },
                    {
                        'disease': SupportedDisease.CHOLERA,
                        'is_complete': True,
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        patient = Patient.objects.get(pk=response.data['id'])
        schedules = {
            item.disease: item
            for item in PatientDiseaseSchedule.objects.filter(patient=patient)
        }

        self.assertEqual(schedules[SupportedDisease.MEASLES].current_due_date, date(2025, 10, 1))
        self.assertEqual(schedules[SupportedDisease.POLIO].current_due_date, date(2025, 3, 1))
        self.assertTrue(schedules[SupportedDisease.CHOLERA].is_complete)
        self.assertEqual(
            schedules[SupportedDisease.CHOLERA].status,
            PatientDiseaseSchedule.DiseaseStatus.COMPLETED,
        )

    def test_recording_outcome_updates_next_due_date_and_history_views(self):
        patient = Patient.objects.create(
            first_name='Existing',
            sex=Patient.Sex.MALE,
            date_of_birth=date(2025, 1, 1),
            primary_caregiver=self.caregiver,
        )

        response = self.client.post(
            f'/api/v1/patients/{patient.id}/outcomes',
            {
                'disease': SupportedDisease.MEASLES,
                'vaccine_id': str(self.measles_vaccine.id),
                'administered_at': '2026-05-17T09:00:00Z',
                'event_status': ImmunizationEvent.EventStatus.ADMINISTERED,
                'next_due_date': '2026-08-17',
                'notes': 'Return in three months.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        schedule = PatientDiseaseSchedule.objects.get(
            patient=patient,
            disease=SupportedDisease.MEASLES,
        )
        self.assertEqual(schedule.current_due_date, date(2026, 8, 17))
        self.assertFalse(schedule.is_complete)
        self.assertEqual(schedule.status, PatientDiseaseSchedule.DiseaseStatus.SCHEDULED)

        compact_history = self.client.get(f'/api/v1/patients/{patient.id}/vaccination-history')
        detailed_history = self.client.get(
            f'/api/v1/patients/{patient.id}/vaccination-history?detail=true'
        )

        self.assertEqual(compact_history.status_code, 200)
        self.assertEqual(compact_history.data[0]['disease'], SupportedDisease.MEASLES)
        self.assertIn('vaccine_name', compact_history.data[0])
        self.assertNotIn('administration_route', compact_history.data[0])
        self.assertEqual(detailed_history.status_code, 200)
        self.assertIn('administration_route', detailed_history.data[0])

    def test_recording_completed_outcome_marks_disease_complete(self):
        patient = Patient.objects.create(
            first_name='Complete',
            sex=Patient.Sex.MALE,
            date_of_birth=date(2025, 1, 1),
            primary_caregiver=self.caregiver,
        )

        response = self.client.post(
            f'/api/v1/patients/{patient.id}/outcomes',
            {
                'disease': SupportedDisease.POLIO,
                'vaccine_id': str(self.polio_vaccine.id),
                'administered_at': '2026-05-17T09:00:00Z',
                'event_status': ImmunizationEvent.EventStatus.ADMINISTERED,
                'disease_completed': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        schedule = PatientDiseaseSchedule.objects.get(
            patient=patient,
            disease=SupportedDisease.POLIO,
        )
        self.assertTrue(schedule.is_complete)
        self.assertIsNone(schedule.current_due_date)
        self.assertEqual(schedule.status, PatientDiseaseSchedule.DiseaseStatus.COMPLETED)

    def test_disease_schedule_endpoint_updates_due_dates_after_registration(self):
        patient = Patient.objects.create(
            first_name='Schedule',
            sex=Patient.Sex.MALE,
            date_of_birth=date(2025, 1, 1),
            primary_caregiver=self.caregiver,
        )

        response = self.client.put(
            f'/api/v1/patients/{patient.id}/disease-schedules',
            {
                'disease_due_dates': [
                    {
                        'disease': SupportedDisease.MEASLES,
                        'due_date': '2026-06-01',
                    },
                    {
                        'disease': SupportedDisease.POLIO,
                        'is_complete': True,
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        measles = PatientDiseaseSchedule.objects.get(
            patient=patient,
            disease=SupportedDisease.MEASLES,
        )
        polio = PatientDiseaseSchedule.objects.get(
            patient=patient,
            disease=SupportedDisease.POLIO,
        )
        self.assertEqual(measles.current_due_date, date(2026, 6, 1))
        self.assertTrue(polio.is_complete)
