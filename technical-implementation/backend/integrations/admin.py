from django.contrib import admin

from integrations.models import SyncLog


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ('integration_type', 'status', 'records_synced', 'records_attempted', 'completed_at')
    list_filter = ('integration_type', 'status')
    search_fields = ('id',)
