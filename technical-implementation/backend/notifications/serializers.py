from rest_framework import serializers

from notifications.models import Notification, SmsLog


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient_user', 'type', 'title', 'body',
            'is_read', 'created_at', 'linked_object_id',
        ]
        read_only_fields = fields


class SmsLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsLog
        fields = ['id', 'recipient_phone', 'message', 'status', 'sent_at', 'error_message']
        read_only_fields = fields
