from rest_framework import serializers

from offline.models import DeviceRegistration, SyncBatch, SyncBatchItem


class DeviceRegistrationSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)

    class Meta:
        model = DeviceRegistration
        fields = [
            'id', 'user_id', 'device_label', 'platform',
            'app_version', 'last_seen_at', 'status',
        ]
        read_only_fields = ['id', 'user_id', 'last_seen_at']


class DeviceRegistrationCreateSerializer(serializers.Serializer):
    device_label = serializers.CharField(max_length=120)
    platform = serializers.CharField(max_length=40)
    app_version = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)

    def create(self, validated_data):
        return DeviceRegistration.objects.create(**validated_data)


class SyncBatchItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncBatchItem
        fields = [
            'id', 'entity_type', 'operation_type',
            'client_record_id', 'server_record_id',
            'item_status', 'conflict_reason',
            'payload_checksum', 'payload',
        ]
        read_only_fields = ['id', 'server_record_id', 'item_status', 'conflict_reason']


class SyncBatchItemInputSerializer(serializers.Serializer):
    entity_type = serializers.ChoiceField(choices=SyncBatchItem.EntityType.choices)
    operation_type = serializers.ChoiceField(choices=SyncBatchItem.OperationType.choices)
    client_record_id = serializers.CharField(max_length=120)
    payload_checksum = serializers.CharField(max_length=128, required=False, allow_null=True)
    payload = serializers.JSONField()


class SyncBatchSerializer(serializers.ModelSerializer):
    device_id = serializers.UUIDField(source='device.id', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)

    class Meta:
        model = SyncBatch
        fields = [
            'id', 'device_id', 'user_id',
            'status', 'submitted_at', 'acknowledged_at',
            'record_count', 'conflict_count',
        ]
        read_only_fields = fields


class SyncBatchSubmitSerializer(serializers.Serializer):
    device_id = serializers.UUIDField()
    items = SyncBatchItemInputSerializer(many=True, min_length=1)


class ConflictResolveSerializer(serializers.Serializer):
    resolution = serializers.ChoiceField(choices=['keep_server', 'keep_client'])
    override_payload = serializers.JSONField(required=False, allow_null=True)
