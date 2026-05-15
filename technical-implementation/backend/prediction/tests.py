from datetime import date

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from geography.models import AdministrativeUnit
from immunizations.models import PatientVaccinationSchedule
from patients.models import Caregiver, Patient
from prediction.models import OutbreakRiskScore
from users.models import Role, User
from vaccines.models import Antigen, EpiScheduleRule, EpiScheduleVersion, VaccineDefinition


class PredictionEndpointTests(TestCase):
    def setUp(self):
        self.pho_role = Role.objects.create(
            role_code='PUBLIC_HEALTH_OFFICIAL',
            role_name='Public Health Official',
        )
        self.user = User.objects.create_user(
            email='pho-risk@example.com',
            password='password123',
            full_name='PHO User',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        self.unit = AdministrativeUnit.objects.create(
            code='WOR-RISK',
            name='Risk Woreda',
            level=AdministrativeUnit.Level.WOREDA,
        )
        caregiver = Caregiver.objects.create(
            full_name='Care Giver',
            phone_number='+251911111111',
            relationship_to_patient='mother',
        )
        self.patient = Patient.objects.create(
            first_name='Kid',
            sex=Patient.Sex.FEMALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
            residence_unit=self.unit,
        )
        antigen = Antigen.objects.create(code='measles', name='Measles')
        vaccine = VaccineDefinition.objects.create(
            vaccine_code='MCV1',
            vaccine_name='Measles 1',
            antigen=antigen,
        )
        version = EpiScheduleVersion.objects.create(
            version_name='2026',
            effective_from=date(2026, 1, 1),
        )
        rule = EpiScheduleRule.objects.create(
            schedule_version=version,
            vaccine=vaccine,
            dose_label='Dose 1',
            recommended_age_days=270,
        )
        PatientVaccinationSchedule.objects.create(
            patient=self.patient,
            schedule_rule=rule,
            vaccine=vaccine,
            due_date=date(2024, 9, 1),
            status=PatientVaccinationSchedule.SlotStatus.OVERDUE,
        )
        self.client = APIClient()
        self.authenticate(self.user)

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_risk_scores_endpoint_returns_existing_scores(self):
        OutbreakRiskScore.objects.create(
            unit=self.unit,
            disease='measles',
            risk_score='0.8700',
            computed_at=timezone.now(),
        )

        response = self.client.get('/api/v1/prediction/risk-scores/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['unit_id'], str(self.unit.id))
        self.assertEqual(response.data[0]['unit_name'], self.unit.name)
        self.assertEqual(response.data[0]['disease'], 'measles')
        self.assertEqual(response.data[0]['risk_score'], 0.87)

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True, PREDICTION_DISEASES='measles')
    def test_run_endpoint_computes_scores(self):
        response = self.client.post('/api/v1/prediction/run/', {})

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data['status'], 'completed')
        self.assertEqual(response.data['computed'], 1)
        score = OutbreakRiskScore.objects.get(unit=self.unit, disease='measles')
        self.assertGreater(float(score.risk_score), 0.5)
