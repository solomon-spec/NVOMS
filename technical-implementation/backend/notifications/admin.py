from django.contrib import admin

from notifications.models import MessageTemplate, NotificationAttempt, SmsNotification


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ['template_code', 'message_type', 'language_code', 'channel', 'is_active']
    list_filter = ['message_type', 'language_code', 'is_active']
    search_fields = ['template_code', 'template_body']


@admin.register(SmsNotification)
class SmsNotificationAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'phone_number', 'status', 'priority', 'scheduled_for', 'sent_at', 'created_at']
    list_filter = ['status', 'notification_type', 'created_at']
    search_fields = ['phone_number', 'message_body']
    readonly_fields = ['id', 'status', 'retry_count', 'last_error', 'gateway_message_id', 'sent_at', 'delivered_at', 'created_at']


@admin.register(NotificationAttempt)
class NotificationAttemptAdmin(admin.ModelAdmin):
    list_display = ['notification', 'attempt_number', 'attempt_status', 'attempted_at', 'gateway_status_code']
    list_filter = ['attempt_status', 'attempted_at']
    readonly_fields = ['id', 'notification', 'attempt_number', 'attempted_at', 'gateway_status_code', 'gateway_response', 'attempt_status']
