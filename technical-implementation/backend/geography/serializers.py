from rest_framework import serializers

from geography.models import AdministrativeUnit


class AdministrativeUnitSerializer(serializers.ModelSerializer):
    parent = serializers.SerializerMethodField()
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=AdministrativeUnit.objects.all(),
        source='parent',
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = AdministrativeUnit
        fields = [
            'id', 'code', 'name', 'level',
            'parent', 'parent_id',
            'latitude', 'longitude',
            'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_parent(self, obj):
        if obj.parent:
            return {'id': str(obj.parent.id), 'code': obj.parent.code, 'name': obj.parent.name}
        return None
