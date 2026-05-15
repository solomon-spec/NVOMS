from datetime import date

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from geography.models import AdministrativeUnit
from immunizations.models import PatientVaccinationSchedule
from notifications.models import MessageTemplate, SmsNotification
from patients.models import Caregiver, Patient
from surveillance.models import OutbreakAlert
from users.models import Role, User
from vaccines.models import Antigen, EpiScheduleRule, EpiScheduleVersion, VaccineDefinition


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', CELERY_TASK_ALWAYS_EAGER=True)
class NotificationWorkflowTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.worker_role = Role.objects.create(role_code='HEALTH_WORKER', role_name='Health Worker')
        self.pho_role = Role.objects.create(
            role_code='PUBLIC_HEALTH_OFFICIAL',
            role_name='Public Health Official',
        )
        self.patient_role = Role.objects.create(role_code='PATIENT', role_name='Patient')
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
        self.pho = User.objects.create_user(
            email='pho@example.com',
            phone_number='+251911000002',
            password='password123',
            full_name='PHO User',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_notification_list_mark_read_and_mark_all_read(self):
        first = Notification.objects.create(
            recipient_user=self.pho,
            type=Notification.Type.SURVEILLANCE_REPORT,
            title='First',
            body='First body',
        )
        Notification.objects.create(
            recipient_user=self.pho,
            type=Notification.Type.OUTBREAK_ALERT,
            title='Second',
            body='Second body',
        )
        self.authenticate(self.pho)

        listing = self.client.get('/api/v1/notifications/')
        read_response = self.client.patch(f'/api/v1/notifications/{first.id}/read/')
        mark_all = self.client.post('/api/v1/notifications/mark-all-read/')

        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data['total'], 2)
        self.assertEqual(read_response.status_code, 200)
        self.assertTrue(read_response.data['is_read'])
        self.assertEqual(mark_all.status_code, 200)
        self.assertEqual(self.pho.notifications.filter(is_read=False).count(), 0)

    def test_admin_can_read_sms_logs(self):
        SmsLog.objects.create(
            recipient_phone='+251911000003',
            message='Test',
            status=SmsLog.Status.SENT,
        )
        self.authenticate(self.admin)

        response = self.client.get('/api/v1/sms-logs/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)

    def test_user_creation_dispatches_welcome_notification_and_sms(self):
        self.authenticate(self.admin)

        response = self.client.post(
            '/api/v1/users/',
            {
                'full_name': 'New User',
                'email': 'new@example.com',
                'phone_number': '+251911000004',
                'password': 'TempPass123!',
                'role_id': str(self.worker_role.id),
                'status': User.Status.ACTIVE,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='new@example.com')
        self.assertTrue(user.notifications.filter(type=Notification.Type.WELCOME).exists())
        self.assertTrue(SmsLog.objects.filter(recipient_phone='+251911000004').exists())

    def test_outbreak_confirmation_creates_notification_and_sms(self):
        unit = AdministrativeUnit.objects.create(
            code='WOR-1',
            name='Woreda 1',
            level=AdministrativeUnit.Level.WOREDA,
        )
        alert = OutbreakAlert.objects.create(
            unit=unit,
            disease_code='measles',
            alert_source=OutbreakAlert.AlertSource.MANUAL,
            status=OutbreakAlert.Status.UNDER_REVIEW,
        )
        self.authenticate(self.pho)

        response = self.client.post(
            f'/api/v1/alerts/{alert.id}/status',
            {'status': OutbreakAlert.Status.CONFIRMED},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.pho.notifications.filter(type=Notification.Type.OUTBREAK_ALERT).exists())
        self.assertTrue(SmsLog.objects.filter(recipient_phone=self.pho.phone_number).exists())

    def test_overdue_schedule_status_sends_sms_reminder(self):
        unit = AdministrativeUnit.objects.create(
            code='WOR-2',
            name='Woreda 2',
            level=AdministrativeUnit.Level.WOREDA,
        )
        caregiver = Caregiver.objects.create(
            full_name='Care Giver',
            phone_number='+251911000005',
            relationship_to_patient='mother',
        )
        patient = Patient.objects.create(
            first_name='Kid',
            sex=Patient.Sex.FEMALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
            residence_unit=unit,
        )
        antigen = Antigen.objects.create(code='bcg', name='BCG')
        vaccine = VaccineDefinition.objects.create(
            vaccine_code='BCG',
            vaccine_name='BCG',
            antigen=antigen,
        )
        version = EpiScheduleVersion.objects.create(
            version_name='2024',
            effective_from=date(2024, 1, 1),
        )
        rule = EpiScheduleRule.objects.create(
            schedule_version=version,
            vaccine=vaccine,
            dose_label='Birth',
            recommended_age_days=0,
        )
        slot = PatientVaccinationSchedule.objects.create(
            patient=patient,
            schedule_rule=rule,
            vaccine=vaccine,
            due_date=timezone.now().date(),
            status=PatientVaccinationSchedule.SlotStatus.SCHEDULED,
        )
        self.authenticate(self.worker)

        response = self.client.put(
            f'/api/v1/patients/{patient.id}/schedule/{slot.id}',
            {'status': PatientVaccinationSchedule.SlotStatus.OVERDUE},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(SmsLog.objects.filter(recipient_phone=caregiver.phone_number).exists())
