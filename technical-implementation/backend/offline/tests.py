from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from geography.models import AdministrativeUnit
from immunizations.models import ImmunizationEvent
from offline.models import DeviceRegistration, SyncBatch, SyncBatchItem
from patients.models import Caregiver, Patient
from surveillance.models import SurveillanceReport
from users.models import HealthFacility, Role, User
from vaccines.models import Antigen, VaccineDefinition


class SyncBatchListScopeTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.worker_role = Role.objects.create(
            role_code='HEALTH_WORKER',
            role_name='Health Worker',
        )
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
        self.other_worker = User.objects.create_user(
            email='other@example.com',
            password='password123',
            full_name='Other Worker',
            role=self.worker_role,
            status=User.Status.ACTIVE,
        )
        self.worker_device = DeviceRegistration.objects.create(
            user=self.worker,
            device_label='Worker phone',
            platform='android',
        )
        self.other_device = DeviceRegistration.objects.create(
            user=self.other_worker,
            device_label='Other phone',
            platform='android',
        )
        self.worker_batch = SyncBatch.objects.create(
            user=self.worker,
            device=self.worker_device,
            record_count=1,
        )
        self.other_batch = SyncBatch.objects.create(
            user=self.other_worker,
            device=self.other_device,
            record_count=1,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_health_worker_sees_only_own_device_batches(self):
        self.authenticate(self.worker)

        response = self.client.get('/api/v1/offline/sync/batches/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [str(self.worker_batch.id)])

    def test_admin_can_filter_batches_by_user_id(self):
        self.authenticate(self.admin)

        response = self.client.get(
            '/api/v1/offline/sync/batches/',
            {'user_id': str(self.other_worker.id)},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [str(self.other_batch.id)])


class OfflineSyncWriteTests(TestCase):
    def setUp(self):
        self.worker_role = Role.objects.create(
            role_code='HEALTH_WORKER',
            role_name='Health Worker',
        )
        self.worker = User.objects.create_user(
            email='sync-worker@example.com',
            password='password123',
            full_name='Worker User',
            role=self.worker_role,
            status=User.Status.ACTIVE,
        )
        self.device = DeviceRegistration.objects.create(
            user=self.worker,
            device_label='Worker phone',
            platform='android',
        )
        self.unit = AdministrativeUnit.objects.create(
            code='SYNC-WOR',
            name='Sync Woreda',
            level=AdministrativeUnit.Level.WOREDA,
        )
        self.facility = HealthFacility.objects.create(
            facility_code='SYNC-HF',
            facility_name='Sync Health Facility',
        )
        antigen = Antigen.objects.create(code='bcg-sync', name='BCG')
        self.vaccine = VaccineDefinition.objects.create(
            vaccine_code='BCG-SYNC',
            vaccine_name='BCG',
            antigen=antigen,
        )
        self.client = APIClient()
        self.authenticate(self.worker)

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_sync_batch_writes_all_supported_entity_types(self):
        response = self.client.post(
            '/api/v1/offline/sync/batches/',
            {
                'device_id': str(self.device.id),
                'items': [
                    {
                        'entity_type': 'caregiver',
                        'operation_type': 'insert',
                        'client_record_id': 'cg-1',
                        'payload': {
                            'full_name': 'Offline Caregiver',
                            'phone_number': '+251933333333',
                            'relationship_to_patient': 'mother',
                            'residence_unit_id': str(self.unit.id),
                        },
                    },
                    {
                        'entity_type': 'patient',
                        'operation_type': 'insert',
                        'client_record_id': 'pt-1',
                        'payload': {
                            'first_name': 'Offline',
                            'last_name': 'Patient',
                            'sex': Patient.Sex.FEMALE,
                            'date_of_birth': '2024-01-01',
                            'primary_caregiver_client_record_id': 'cg-1',
                            'residence_unit_id': str(self.unit.id),
                            'registered_facility_id': str(self.facility.id),
                        },
                    },
                    {
                        'entity_type': 'surveillance_report',
                        'operation_type': 'insert',
                        'client_record_id': 'sr-1',
                        'payload': {
                            'patient_client_record_id': 'pt-1',
                            'facility_id': str(self.facility.id),
                            'surveillance_category': SurveillanceReport.Category.SYMPTOM,
                            'condition_type': 'rash',
                            'disease_suspected': 'measles',
                            'onset_date': '2026-05-01',
                            'severity': SurveillanceReport.Severity.MODERATE,
                        },
                    },
                    {
                        'entity_type': 'immunization_event',
                        'operation_type': 'insert',
                        'client_record_id': 'im-1',
                        'payload': {
                            'patient_client_record_id': 'pt-1',
                            'vaccine_id': str(self.vaccine.id),
                            'facility_id': str(self.facility.id),
                            'administered_at': timezone.now().isoformat(),
                        },
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(all(item['item_status'] == SyncBatchItem.ItemStatus.APPLIED for item in response.data['items']))
        self.assertEqual(Caregiver.objects.get(local_client_record_id='cg-1').full_name, 'Offline Caregiver')
        patient = Patient.objects.get(local_client_record_id='pt-1')
        self.assertEqual(patient.registered_by, self.worker)
        self.assertEqual(SurveillanceReport.objects.get(local_client_record_id='sr-1').patient, patient)
        event = ImmunizationEvent.objects.get(local_client_record_id='im-1')
        self.assertEqual(event.patient, patient)
        self.assertEqual(event.source_channel, ImmunizationEvent.SourceChannel.SYNCED)

    def test_existing_patient_is_updated_by_client_record_id(self):
        caregiver = Caregiver.objects.create(
            full_name='Caregiver',
            phone_number='+251944444444',
            relationship_to_patient='father',
            local_client_record_id='cg-update',
        )
        patient = Patient.objects.create(
            first_name='Before',
            sex=Patient.Sex.MALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
            local_client_record_id='pt-update',
        )

        response = self.client.post(
            '/api/v1/offline/sync/batches/',
            {
                'device_id': str(self.device.id),
                'items': [
                    {
                        'entity_type': 'patient',
                        'operation_type': 'update',
                        'client_record_id': 'pt-update',
                        'payload': {
                            'first_name': 'After',
                            'server_updated_at': patient.updated_at.isoformat(),
                        },
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['items'][0]['item_status'], SyncBatchItem.ItemStatus.APPLIED)
        patient.refresh_from_db()
        self.assertEqual(patient.first_name, 'After')

    def test_server_newer_than_offline_snapshot_returns_conflict(self):
        caregiver = Caregiver.objects.create(
            full_name='Caregiver',
            phone_number='+251955555555',
            relationship_to_patient='father',
        )
        patient = Patient.objects.create(
            first_name='Server',
            sex=Patient.Sex.MALE,
            date_of_birth=date(2024, 1, 1),
            primary_caregiver=caregiver,
            local_client_record_id='pt-conflict',
        )
        stale_snapshot = (patient.updated_at - timedelta(minutes=5)).isoformat()

        response = self.client.post(
            '/api/v1/offline/sync/batches/',
            {
                'device_id': str(self.device.id),
                'items': [
                    {
                        'entity_type': 'patient',
                        'operation_type': 'update',
                        'client_record_id': 'pt-conflict',
                        'payload': {
                            'first_name': 'Client',
                            'server_updated_at': stale_snapshot,
                        },
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['items'][0]['item_status'], SyncBatchItem.ItemStatus.CONFLICT)
        patient.refresh_from_db()
        self.assertEqual(patient.first_name, 'Server')
