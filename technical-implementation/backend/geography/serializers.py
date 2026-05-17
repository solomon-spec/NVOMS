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
            'name_alt', 'source', 'source_dataset',
            'area_sqkm', 'latitude', 'longitude',
            'bbox', 'boundary_geojson',
            'valid_on', 'valid_to', 'data_version',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        include_geometry = (
            request
            and request.query_params.get('include_geometry', '').lower() == 'true'
        )
        if not include_geometry:
            fields.pop('boundary_geojson', None)
        return fields

    def get_parent(self, obj):
        if obj.parent:
            return {'id': str(obj.parent.id), 'code': obj.parent.code, 'name': obj.parent.name}
        return None
