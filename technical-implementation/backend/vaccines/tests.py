from datetime import date

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from immunizations.models import PatientVaccinationSchedule
from patients.models import Caregiver, Patient
from users.models import Role, User
from vaccines.models import (
    Antigen,
    EpiScheduleRule,
    EpiScheduleVersion,
    ScheduleRegenerationJob,
    VaccineDefinition,
)


class ScheduleRegenerationTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.pho_role = Role.objects.create(
            role_code='PUBLIC_HEALTH_OFFICIAL',
            role_name='Public Health Official',
        )
        self.admin = User.objects.create_user(
            email='schedule-admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        self.pho = User.objects.create_user(
            email='schedule-pho@example.com',
            password='password123',
            full_name='PHO User',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        caregiver = Caregiver.objects.create(
            full_name='Caregiver',
            phone_number='+251966666666',
            relationship_to_patient='mother',
        )
        self.patient = Patient.objects.create(
            first_name='Scheduled',
            sex=Patient.Sex.FEMALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
        )
        self.unaffected_patient = Patient.objects.create(
            first_name='No Schedule',
            sex=Patient.Sex.MALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
        )
        antigen = Antigen.objects.create(code='schedule-bcg', name='BCG')
        self.bcg = VaccineDefinition.objects.create(
            vaccine_code='SCHED-BCG',
            vaccine_name='BCG',
            antigen=antigen,
        )
        self.opv = VaccineDefinition.objects.create(
            vaccine_code='SCHED-OPV',
            vaccine_name='OPV',
            antigen=antigen,
        )
        self.version = EpiScheduleVersion.objects.create(
            version_name='Bulk 2026',
            effective_from=date(2026, 1, 1),
        )
        self.existing_rule = EpiScheduleRule.objects.create(
            schedule_version=self.version,
            vaccine=self.bcg,
            dose_label='Birth',
            recommended_age_days=0,
        )
        self.new_rule = EpiScheduleRule.objects.create(
            schedule_version=self.version,
            vaccine=self.opv,
            dose_label='Dose 1',
            recommended_age_days=42,
        )
        self.slot = PatientVaccinationSchedule.objects.create(
            patient=self.patient,
            schedule_rule=self.existing_rule,
            vaccine=self.bcg,
            due_date=date(2024, 1, 1),
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_admin_can_regenerate_all_schedules_for_version(self):
        self.authenticate(self.admin)
        self.existing_rule.recommended_age_days = 10
        self.existing_rule.save(update_fields=['recommended_age_days'])

        response = self.client.post(f'/api/v1/vaccines/schedules/{self.version.id}/regenerate-all/')

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['processed'], 1)
        self.assertEqual(response.data['failed'], 0)

        self.slot.refresh_from_db()
        self.assertEqual(self.slot.due_date, date(2024, 1, 11))
        self.assertTrue(
            PatientVaccinationSchedule.objects.filter(
                patient=self.patient,
                schedule_rule=self.new_rule,
                due_date=date(2024, 2, 12),
            ).exists()
        )
        self.assertFalse(
            PatientVaccinationSchedule.objects.filter(patient=self.unaffected_patient).exists()
        )

        status_response = self.client.get(
            f'/api/v1/vaccines/schedules/{self.version.id}/regeneration-status/'
        )

        self.assertEqual(status_response.status_code, 200)
        self.assertEqual(status_response.data['status'], ScheduleRegenerationJob.Status.COMPLETED)

    def test_pho_cannot_start_bulk_regeneration(self):
        self.authenticate(self.pho)

        response = self.client.post(f'/api/v1/vaccines/schedules/{self.version.id}/regenerate-all/')

        self.assertEqual(response.status_code, 403)
