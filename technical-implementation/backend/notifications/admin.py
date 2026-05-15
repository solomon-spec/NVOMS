from django.contrib import admin

from notifications.models import MessageTemplate, NotificationAttempt, SmsNotification


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ['template_code', 'channel', 'message_type', 'language_code', 'is_active']
    list_filter = ['channel', 'message_type', 'is_active']
    search_fields = ['template_code', 'template_body']


@admin.register(SmsNotification)
class SmsNotificationAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'notification_type', 'phone_number', 'status', 'scheduled_for']
    list_filter = ['notification_type', 'status', 'created_at']
    search_fields = ['phone_number', 'message_body']


@admin.register(NotificationAttempt)
class NotificationAttemptAdmin(admin.ModelAdmin):
    list_display = ['attempted_at', 'notification', 'attempt_number', 'attempt_status']
    list_filter = ['attempt_status', 'attempted_at']
    search_fields = ['notification__phone_number', 'gateway_message_id']
