import re

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from authentication.models import PasswordResetToken
from notifications.models import SmsLog
from users.models import Role, User


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PasswordResetTests(TestCase):
    def setUp(self):
        self.role = Role.objects.create(role_code='PATIENT', role_name='Patient')
        self.user = User.objects.create_user(
            email='patient@example.com',
            phone_number='+251911000001',
            password='old-password-123',
            full_name='Patient User',
            role=self.role,
            status=User.Status.ACTIVE,
        )
        self.client = APIClient()

    def test_email_password_reset_sends_token_and_confirm_resets_password(self):
        request_response = self.client.post(
            '/api/v1/auth/password-reset/',
            {'email': self.user.email},
            format='json',
        )

        self.assertEqual(request_response.status_code, 202)
        self.assertEqual(PasswordResetToken.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        token = re.search(r'token=([A-Za-z0-9_\\-]+)', mail.outbox[0].body).group(1)

        confirm_response = self.client.post(
            '/api/v1/auth/password-reset/confirm/',
            {'token': token, 'new_password': 'new-password-123'},
            format='json',
        )

        self.assertEqual(confirm_response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('new-password-123'))
        self.assertFalse(self.user.must_change_password)
        self.assertIsNotNone(PasswordResetToken.objects.get().used_at)

    def test_phone_password_reset_sends_sms_token(self):
        response = self.client.post(
            '/api/v1/auth/password-reset/',
            {'phone_number': self.user.phone_number},
            format='json',
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(SmsLog.objects.count(), 1)
        self.assertEqual(SmsLog.objects.get().status, SmsLog.Status.SENT)

    def test_password_reset_rate_limit_returns_429(self):
        for _ in range(3):
            response = self.client.post(
                '/api/v1/auth/password-reset/',
                {'email': self.user.email},
                format='json',
            )
            self.assertEqual(response.status_code, 202)

        limited = self.client.post(
            '/api/v1/auth/password-reset/',
            {'email': self.user.email},
            format='json',
        )

        self.assertEqual(limited.status_code, 429)
