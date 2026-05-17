from rest_framework import serializers

from notifications.models import MessageTemplate, NotificationAttempt, SmsNotification


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = [
            'id', 'template_code', 'channel', 'message_type',
            'language_code', 'template_body', 'is_active',
        ]
        read_only_fields = ['id']


class NotificationAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationAttempt
        fields = [
            'id', 'attempt_number', 'attempted_at',
            'gateway_status_code', 'gateway_response', 'attempt_status',
        ]
        read_only_fields = fields


class SmsNotificationSerializer(serializers.ModelSerializer):
    attempts = NotificationAttemptSerializer(many=True, read_only=True)

    class Meta:
        model = SmsNotification
        fields = [
            'id', 'notification_type', 'phone_number', 'language_code',
            'message_body', 'priority', 'status',
            'caregiver', 'patient', 'schedule_slot', 'outbreak_alert',
            'gateway_message_id', 'retry_count', 'last_error',
            'scheduled_for', 'sent_at', 'delivered_at', 'created_at',
            'attempts',
        ]
        read_only_fields = [
            'id', 'status', 'retry_count', 'last_error',
            'gateway_message_id', 'sent_at', 'delivered_at', 'created_at',
        ]


class SmsNotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view (no nested attempts)."""
    class Meta:
        model = SmsNotification
        fields = [
            'id', 'notification_type', 'phone_number', 'status',
            'caregiver', 'patient', 'message_body', 'priority',
            'scheduled_for', 'sent_at', 'delivered_at', 'created_at',
            'last_error', 'retry_count',
        ]


class SmsNotificationCreateSerializer(serializers.Serializer):
    caregiver_id = serializers.UUIDField()
    patient_id = serializers.UUIDField(required=False, allow_null=True)
    schedule_slot_id = serializers.UUIDField(required=False, allow_null=True)
    notification_type = serializers.ChoiceField(choices=SmsNotification.NotificationType.choices)
    message_body = serializers.CharField()
    language_code = serializers.CharField(max_length=12, default='en')
    priority = serializers.IntegerField(default=1, min_value=1, max_value=5)
    scheduled_for = serializers.DateTimeField(required=False, allow_null=True)


class DeliveryStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            SmsNotification.DeliveryStatus.SENT,
            SmsNotification.DeliveryStatus.DELIVERED,
            SmsNotification.DeliveryStatus.FAILED,
            SmsNotification.DeliveryStatus.CANCELLED,
        ]
    )
    gateway_message_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_error = serializers.CharField(required=False, allow_blank=True, allow_null=True)
