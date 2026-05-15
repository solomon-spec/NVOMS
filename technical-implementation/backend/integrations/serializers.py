from rest_framework import serializers

from integrations.models import SyncLog


class SyncLogSerializer(serializers.ModelSerializer):
    triggered_by_user_id = serializers.UUIDField(source='triggered_by.id', read_only=True)

    class Meta:
        model = SyncLog
        fields = [
            'id',
            'integration_type',
            'status',
            'records_attempted',
            'records_synced',
            'errors',
            'triggered_by_user_id',
            'started_at',
            'completed_at',
        ]
