from datetime import date

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from geography.models import AdministrativeUnit
from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule
from patients.models import Caregiver, Patient
from users.models import Role, User
from vaccines.models import Antigen, EpiScheduleRule, EpiScheduleVersion, VaccineDefinition


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


class AnalyticsEndpointTests(TestCase):
    def setUp(self):
        self.pho_role = Role.objects.create(
            role_code='PUBLIC_HEALTH_OFFICIAL',
            role_name='Public Health Official',
        )
        self.user = User.objects.create_user(
            email='pho@example.com',
            password='password123',
            full_name='PHO User',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        self.unit = AdministrativeUnit.objects.create(
            code='WOR-1',
            name='Woreda 1',
            level=AdministrativeUnit.Level.WOREDA,
        )
        self.other_unit = AdministrativeUnit.objects.create(
            code='WOR-2',
            name='Woreda 2',
            level=AdministrativeUnit.Level.WOREDA,
        )
        caregiver = Caregiver.objects.create(
            full_name='Care Giver',
            phone_number='+251911000000',
            relationship_to_patient='mother',
        )
        self.patient = Patient.objects.create(
            first_name='Kid One',
            sex=Patient.Sex.FEMALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
            residence_unit=self.unit,
        )
        self.other_patient = Patient.objects.create(
            first_name='Kid Two',
            sex=Patient.Sex.MALE,
            date_of_birth=date(2024, 1, 2),
            primary_caregiver=caregiver,
            residence_unit=self.other_unit,
        )
        antigen = Antigen.objects.create(code='measles', name='Measles')
        self.bcg = VaccineDefinition.objects.create(
            vaccine_code='BCG',
            vaccine_name='BCG',
            antigen=antigen,
        )
        self.opv = VaccineDefinition.objects.create(
            vaccine_code='OPV',
            vaccine_name='OPV',
            antigen=antigen,
        )
        version = EpiScheduleVersion.objects.create(
            version_name='2024',
            effective_from=date(2024, 1, 1),
        )
        self.bcg_rule = EpiScheduleRule.objects.create(
            schedule_version=version,
            vaccine=self.bcg,
            dose_label='Birth',
            recommended_age_days=0,
        )
        self.opv_rule = EpiScheduleRule.objects.create(
            schedule_version=version,
            vaccine=self.opv,
            dose_label='Dose 1',
            recommended_age_days=42,
        )
        self.client = APIClient()
        self.authenticate(self.user)

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def create_slot(self, patient, vaccine, rule, due_date, slot_status):
        return PatientVaccinationSchedule.objects.create(
            patient=patient,
            vaccine=vaccine,
            schedule_rule=rule,
            due_date=due_date,
            status=slot_status,
        )

    def test_defaulter_clusters_return_units_with_missing_vaccines(self):
        self.create_slot(
            self.patient,
            self.bcg,
            self.bcg_rule,
            date(2024, 1, 1),
            PatientVaccinationSchedule.SlotStatus.ADMINISTERED,
        )
        self.create_slot(
            self.patient,
            self.opv,
            self.opv_rule,
            date(2024, 1, 8),
            PatientVaccinationSchedule.SlotStatus.OVERDUE,
        )
        self.create_slot(
            self.other_patient,
            self.bcg,
            self.bcg_rule,
            date(2024, 1, 1),
            PatientVaccinationSchedule.SlotStatus.ADMINISTERED,
        )

        response = self.client.get('/api/v1/analytics/defaulters/by-cluster/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['unit_id'], str(self.unit.id))
        self.assertEqual(response.data[0]['unit_name'], self.unit.name)
        self.assertEqual(response.data[0]['level'], AdministrativeUnit.Level.WOREDA)
        self.assertEqual(response.data[0]['defaulter_count'], 1)
        self.assertEqual(response.data[0]['coverage_pct'], 50.0)
        self.assertEqual(response.data[0]['vaccines_missing'], ['OPV'])

    def test_coverage_trend_groups_by_month_and_filters_unit(self):
        self.create_slot(
            self.patient,
            self.bcg,
            self.bcg_rule,
            date(2024, 1, 1),
            PatientVaccinationSchedule.SlotStatus.ADMINISTERED,
        )
        self.create_slot(
            self.patient,
            self.opv,
            self.opv_rule,
            date(2024, 1, 8),
            PatientVaccinationSchedule.SlotStatus.OVERDUE,
        )
        self.create_slot(
            self.other_patient,
            self.bcg,
            self.bcg_rule,
            date(2024, 2, 1),
            PatientVaccinationSchedule.SlotStatus.ADMINISTERED,
        )

        response = self.client.get(
            '/api/v1/analytics/coverage/trend/',
            {'unit_id': str(self.unit.id), 'granularity': 'month'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [
            {
                'date': '2024-01-01',
                'overall_coverage_pct': 50.0,
                'administered': 1,
            }
        ])

    def test_coverage_trend_rejects_invalid_granularity(self):
        response = self.client.get(
            '/api/v1/analytics/coverage/trend/',
            {'granularity': 'quarter'},
        )

        self.assertEqual(response.status_code, 400)

    def test_reporting_gaps_returns_silent_units(self):
        ImmunizationEvent.objects.create(
            patient=self.other_patient,
            vaccine=self.bcg,
            administered_at=timezone.now(),
        )

        response = self.client.get(
            '/api/v1/analytics/reporting-gaps/',
            {'threshold_days': 14},
        )

        self.assertEqual(response.status_code, 200)
        returned_ids = {item['unit_id'] for item in response.data}
        self.assertIn(str(self.unit.id), returned_ids)
        self.assertNotIn(str(self.other_unit.id), returned_ids)
        silent = next(item for item in response.data if item['unit_id'] == str(self.unit.id))
        self.assertEqual(silent['days_since_last_report'], 15)
