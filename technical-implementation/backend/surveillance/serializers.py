from rest_framework import serializers

from surveillance.models import FollowUpAction, OutbreakAlert, SurveillanceReport, SurveillanceSymptom


class SurveillanceSymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveillanceSymptom
        fields = ['id', 'symptom_code', 'symptom_label', 'is_present', 'observation_value']
        read_only_fields = ['id']


class SurveillanceReportSerializer(serializers.ModelSerializer):
    symptoms = SurveillanceSymptomSerializer(many=True, read_only=True)

    class Meta:
        model = SurveillanceReport
        fields = [
            'id', 'patient', 'facility', 'reported_by',
            'surveillance_category', 'condition_type', 'disease_suspected',
            'onset_date', 'body_temperature_c', 'severity',
            'follow_up_required', 'status',
            'fhir_observation_id', 'notes',
            'symptoms', 'created_at',
        ]
        read_only_fields = ['id', 'reported_by', 'created_at']


class SurveillanceReportCreateSerializer(serializers.ModelSerializer):
    symptoms = SurveillanceSymptomSerializer(many=True, required=False)

    class Meta:
        model = SurveillanceReport
        fields = [
            'patient', 'facility',
            'surveillance_category', 'condition_type', 'disease_suspected',
            'onset_date', 'body_temperature_c', 'severity',
            'follow_up_required', 'notes', 'symptoms',
        ]

    def create(self, validated_data):
        symptoms_data = validated_data.pop('symptoms', [])
        report = SurveillanceReport.objects.create(**validated_data)
        for s in symptoms_data:
            SurveillanceSymptom.objects.create(report=report, **s)
        return report


class SurveillanceReportUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveillanceReport
        fields = [
            'condition_type', 'disease_suspected',
            'onset_date', 'body_temperature_c', 'severity',
            'follow_up_required', 'status', 'notes',
        ]


class FollowUpActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpAction
        fields = [
            'id', 'action_taken', 'assigned_to', 'status',
            'due_date', 'closed_at', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'closed_at', 'created_at']


class FollowUpActionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpAction
        fields = ['action_taken', 'assigned_to', 'due_date']


class OutbreakAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = OutbreakAlert
        fields = [
            'id', 'unit', 'disease_code',
            'surveillance_report', 'alert_source',
            'risk_probability', 'status',
            'triggered_at', 'verified_by', 'verified_at', 'notes',
        ]
        read_only_fields = ['id', 'triggered_at', 'verified_by', 'verified_at']


class AlertStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OutbreakAlert.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
