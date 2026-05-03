from django.contrib import admin

from notifications.models import Notification, SmsLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'recipient_user', 'type', 'title', 'is_read']
    list_filter = ['type', 'is_read', 'created_at']
    search_fields = ['recipient_user__email', 'title', 'body']


@admin.register(SmsLog)
class SmsLogAdmin(admin.ModelAdmin):
    list_display = ['sent_at', 'recipient_phone', 'status']
    list_filter = ['status', 'sent_at']
    search_fields = ['recipient_phone', 'message']
