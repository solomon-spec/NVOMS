from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.serializers import issue_tokens_for_user
from reports.models import GeneratedReport, ReportDefinition
from users.models import Role, User


class ReportHistoryAndDownloadTests(TestCase):
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
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='password123',
            full_name='Other PHO',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        self.definition = ReportDefinition.objects.create(
            report_code='COVERAGE',
            report_name='Coverage Report',
            report_scope=ReportDefinition.Scope.WOREDA,
        )
        self.client = APIClient()
        self.tempdir = TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def make_report(self, requested_by, generation_status, file_uri=None):
        return GeneratedReport.objects.create(
            report_definition=self.definition,
            requested_by=requested_by,
            output_format=GeneratedReport.OutputFormat.PDF,
            generation_status=generation_status,
            file_uri=file_uri,
            completed_at=timezone.now()
            if generation_status == GeneratedReport.GenerationStatus.COMPLETED
            else None,
        )

    def test_report_list_returns_only_authenticated_users_reports(self):
        completed_file = Path(self.tempdir.name) / 'coverage.pdf'
        completed_file.write_bytes(b'%PDF-1.4 test')
        own_report = self.make_report(
            self.user,
            GeneratedReport.GenerationStatus.COMPLETED,
            str(completed_file),
        )
        self.make_report(self.other_user, GeneratedReport.GenerationStatus.COMPLETED)
        self.authenticate(self.user)

        response = self.client.get('/api/v1/reports/', {'status': 'completed'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['items'][0]['id'], str(own_report.id))
        self.assertIsNotNone(response.data['items'][0]['download_url'])

    def test_report_download_streams_completed_file(self):
        completed_file = Path(self.tempdir.name) / 'coverage.pdf'
        completed_file.write_bytes(b'%PDF-1.4 test')
        report = self.make_report(
            self.user,
            GeneratedReport.GenerationStatus.COMPLETED,
            str(completed_file),
        )
        self.authenticate(self.user)

        response = self.client.get(f'/api/v1/reports/{report.id}/download/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment;', response['Content-Disposition'])
        self.assertEqual(b''.join(response.streaming_content), b'%PDF-1.4 test')

    def test_report_download_returns_404_when_file_not_ready(self):
        report = self.make_report(self.user, GeneratedReport.GenerationStatus.PROCESSING)
        self.authenticate(self.user)

        response = self.client.get(f'/api/v1/reports/{report.id}/download/')

        self.assertEqual(response.status_code, 404)
