"""
Notification API views.

GET  /notifications/                – list SmsNotifications (filterable)
POST /notifications/                – create and queue a manual notification
GET  /notifications/<pk>/           – retrieve single notification with attempts
PUT  /notifications/<pk>/status/    – update delivery status (gateway webhook)
GET  /notifications/templates/      – list MessageTemplates
"""

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import MessageTemplate, SmsNotification
from notifications.serializers import (
    DeliveryStatusUpdateSerializer,
    MessageTemplateSerializer,
    SmsNotificationCreateSerializer,
    SmsNotificationListSerializer,
    SmsNotificationSerializer,
)
from users.permissions import IsAdmin, IsHealthWorker

logger = logging.getLogger('nvoms.notifications')


class NotificationListView(APIView):
    """
    GET  – list notifications (supports ?status=, ?patient=, ?notification_type= filters)
    POST – create and queue a manual SMS notification
    """
    permission_classes = [IsHealthWorker]

    def get(self, request):
        qs = SmsNotification.objects.select_related('caregiver', 'patient').order_by('-created_at')

        # Simple query-param filters
        status_filter = request.query_params.get('status')
        patient_filter = request.query_params.get('patient')
        notification_type = request.query_params.get('notification_type')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if patient_filter:
            qs = qs.filter(patient_id=patient_filter)
        if notification_type:
            qs = qs.filter(notification_type=notification_type)

        serializer = SmsNotificationListSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SmsNotificationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        from patients.models import Caregiver, Patient
        try:
            caregiver = Caregiver.objects.get(pk=data['caregiver_id'])
        except Caregiver.DoesNotExist:
            return Response({'caregiver_id': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        patient = None
        if data.get('patient_id'):
            try:
                patient = Patient.objects.get(pk=data['patient_id'])
            except Patient.DoesNotExist:
                return Response({'patient_id': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        slot = None
        if data.get('schedule_slot_id'):
            from immunizations.models import PatientVaccinationSchedule
            try:
                slot = PatientVaccinationSchedule.objects.get(pk=data['schedule_slot_id'])
            except PatientVaccinationSchedule.DoesNotExist:
                return Response({'schedule_slot_id': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        notification = SmsNotification.objects.create(
            caregiver=caregiver,
            patient=patient,
            schedule_slot=slot,
            notification_type=data['notification_type'],
            phone_number=caregiver.phone_number,
            language_code=data.get('language_code', 'en'),
            message_body=data['message_body'],
            priority=data.get('priority', 1),
            scheduled_for=data.get('scheduled_for'),
        )
        logger.info('Manual notification created: %s by user=%s', notification.id, request.user.id)
        return Response(SmsNotificationSerializer(notification).data, status=status.HTTP_201_CREATED)


class SmsLogListView(NotificationListView):
    """Backward-compatible list view for the legacy sms-logs route."""


class NotificationDetailView(APIView):
    """GET – retrieve a single SmsNotification with its delivery attempt history."""
    permission_classes = [IsHealthWorker]

    def get(self, request, pk):
        notification = get_object_or_404(
            SmsNotification.objects.prefetch_related('attempts'), pk=pk
        )
        return Response(SmsNotificationSerializer(notification).data)


class NotificationStatusView(APIView):
    """
    PUT – update delivery status of a notification.
    Used by the SMS gateway webhook callback or manual admin override.
    """
    permission_classes = [IsAdmin]

    def put(self, request, pk):
        notification = get_object_or_404(SmsNotification, pk=pk)
        serializer = DeliveryStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        notification.status = data['status']
        if data.get('gateway_message_id'):
            notification.gateway_message_id = data['gateway_message_id']
        if data.get('last_error') is not None:
            notification.last_error = data['last_error']

        from django.utils import timezone
        if data['status'] == SmsNotification.DeliveryStatus.DELIVERED:
            notification.delivered_at = timezone.now()
        elif data['status'] == SmsNotification.DeliveryStatus.SENT:
            notification.sent_at = timezone.now()

        notification.save()
        logger.info(
            'Notification %s status updated to %s by user=%s',
            notification.id, notification.status, request.user.id,
        )
        return Response(SmsNotificationSerializer(notification).data)


class TemplateListView(APIView):
    """GET – list all active MessageTemplates (supports ?message_type= and ?language_code= filters)."""
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = MessageTemplate.objects.filter(is_active=True).order_by('template_code')

        message_type = request.query_params.get('message_type')
        language_code = request.query_params.get('language_code')
        if message_type:
            qs = qs.filter(message_type=message_type)
        if language_code:
            qs = qs.filter(language_code=language_code)

        return Response(MessageTemplateSerializer(qs, many=True).data)
