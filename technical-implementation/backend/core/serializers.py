from rest_framework import serializers

from core.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_user_id = serializers.UUIDField(source='actor_user.id', read_only=True)
    actor_email = serializers.EmailField(source='actor_user.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor_user_id', 'actor_email',
            'action', 'entity_type', 'entity_id',
            'detail', 'ip_address', 'timestamp',
        ]
        read_only_fields = fields
