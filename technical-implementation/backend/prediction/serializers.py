from rest_framework import serializers

from prediction.models import OutbreakRiskScore


class OutbreakRiskScoreSerializer(serializers.ModelSerializer):
    unit_id = serializers.UUIDField(source='unit.id', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    risk_score = serializers.FloatField()

    class Meta:
        model = OutbreakRiskScore
        fields = [
            'unit_id',
            'unit_name',
            'risk_score',
            'disease',
            'computed_at',
        ]
