from rest_framework import serializers

from environmental.models import MeteorologicalObservation
from geography.models import AdministrativeUnit


class MeteorologicalObservationSerializer(serializers.ModelSerializer):
    unit_id = serializers.PrimaryKeyRelatedField(
        queryset=AdministrativeUnit.objects.all(),
        source='unit',
        write_only=True,
    )
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    level = serializers.CharField(source='unit.level', read_only=True)
    source = serializers.CharField(max_length=80, required=False, default='manual')
    raw_payload = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = MeteorologicalObservation
        fields = [
            'id',
            'unit_id',
            'unit_name',
            'level',
            'observation_date',
            'rainfall_mm',
            'temperature_c',
            'source',
            'raw_payload',
            'recorded_at',
        ]
        read_only_fields = ['id', 'unit_name', 'level', 'recorded_at']
