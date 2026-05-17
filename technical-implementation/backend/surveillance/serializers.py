from rest_framework import serializers

from surveillance.models import FollowUpAction, OutbreakAlert, SurveillanceReport, SurveillanceSymptom
from vaccines.models import VaccineBatch, VaccineDefinition


from patients.serializers import PatientSerializer
from vaccines.serializers import VaccineBatchBriefSerializer, VaccineBriefSerializer


class ImmunizationEventCaseLinkSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    administered_at = serializers.DateTimeField(read_only=True)
    event_status = serializers.CharField(read_only=True)
    vaccine = VaccineBriefSerializer(read_only=True)
    vaccine_batch = VaccineBatchBriefSerializer(read_only=True)

class SurveillanceSymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveillanceSymptom
        fields = ['id', 'symptom_code', 'symptom_label', 'is_present', 'observation_value']
        read_only_fields = ['id']


class SurveillanceReportSerializer(serializers.ModelSerializer):
    symptoms = SurveillanceSymptomSerializer(many=True, read_only=True)
    patient_details = PatientSerializer(source='patient', read_only=True)
    aefi_vaccine = VaccineBriefSerializer(read_only=True)
    aefi_vaccine_batch = VaccineBatchBriefSerializer(read_only=True)
    aefi_immunization_event = ImmunizationEventCaseLinkSerializer(read_only=True)
    aefi_vaccine_id = serializers.PrimaryKeyRelatedField(
        queryset=VaccineDefinition.objects.all(),
        source='aefi_vaccine',
        required=False,
        allow_null=True,
        write_only=True,
    )
    aefi_vaccine_batch_id = serializers.PrimaryKeyRelatedField(
        queryset=VaccineBatch.objects.all(),
        source='aefi_vaccine_batch',
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = SurveillanceReport
        fields = [
            'id', 'patient', 'facility', 'reported_by',
            'surveillance_category', 'condition_type', 'disease_suspected',
            'onset_date', 'body_temperature_c', 'severity',
            'follow_up_required', 'status',
            'aefi_immunization_event', 'aefi_vaccine', 'aefi_vaccine_batch',
            'aefi_vaccine_id', 'aefi_vaccine_batch_id',
            'vaccine_dose_label', 'vaccination_date',
            'lab_sample_taken', 'specimen_status', 'specimen_type',
            'specimen_collection_date', 'lab_test_type',
            'lab_result_status', 'lab_result_date', 'lab_result_notes',
            'clinical_outcome', 'clinical_outcome_date',
            'outcome_notes', 'next_follow_up_date',
            'fhir_observation_id', 'fhir_resource_id',
            'local_client_record_id', 'notes',
            'symptoms', 'patient_details', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reported_by', 'created_at', 'updated_at']


class SurveillanceReportCreateSerializer(serializers.ModelSerializer):
    symptoms = SurveillanceSymptomSerializer(many=True, required=False)

    class Meta:
        model = SurveillanceReport
        fields = [
            'patient', 'facility',
            'surveillance_category', 'condition_type', 'disease_suspected',
            'onset_date', 'body_temperature_c', 'severity',
            'follow_up_required',
            'aefi_immunization_event', 'aefi_vaccine', 'aefi_vaccine_batch',
            'vaccine_dose_label', 'vaccination_date',
            'lab_sample_taken', 'specimen_status', 'specimen_type',
            'specimen_collection_date', 'lab_test_type',
            'lab_result_status', 'lab_result_date', 'lab_result_notes',
            'clinical_outcome', 'clinical_outcome_date',
            'outcome_notes', 'next_follow_up_date',
            'notes', 'symptoms',
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
            'follow_up_required', 'status', 'lab_sample_taken', 
            'aefi_immunization_event', 'aefi_vaccine', 'aefi_vaccine_batch',
            'vaccine_dose_label', 'vaccination_date',
            'specimen_status', 'specimen_type', 'specimen_collection_date',
            'lab_test_type', 'lab_result_status', 'lab_result_date',
            'lab_result_notes', 'clinical_outcome', 'clinical_outcome_date',
            'outcome_notes', 'next_follow_up_date', 'notes',
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
