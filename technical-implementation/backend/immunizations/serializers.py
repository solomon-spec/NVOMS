from rest_framework import serializers

from immunizations.models import (
    ImmunizationEvent,
    PatientDiseaseSchedule,
    PatientVaccinationSchedule,
    SupportedDisease,
)
from vaccines.models import VaccineBatch, VaccineDefinition
from vaccines.serializers import VaccineBatchBriefSerializer, VaccineBriefSerializer


class ScheduleSlotSerializer(serializers.ModelSerializer):
    vaccine = VaccineBriefSerializer(read_only=True)

    class Meta:
        model = PatientVaccinationSchedule
        fields = [
            'id', 'vaccine', 'due_date', 'status',
            'status_reason', 'generated_at', 'status_changed_at',
        ]
        read_only_fields = ['id', 'vaccine', 'generated_at']


class ScheduleSlotStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientVaccinationSchedule
        fields = ['status', 'status_reason']


class PatientDiseaseScheduleSerializer(serializers.ModelSerializer):
    disease_label = serializers.CharField(source='get_disease_display', read_only=True)
    last_outcome_event_id = serializers.UUIDField(source='last_outcome_event.id', read_only=True)

    class Meta:
        model = PatientDiseaseSchedule
        fields = [
            'id', 'disease', 'disease_label',
            'current_due_date', 'status', 'is_complete',
            'completed_at', 'last_outcome_event_id',
            'status_reason', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DiseaseDueDateInputSerializer(serializers.Serializer):
    disease = serializers.ChoiceField(choices=SupportedDisease.choices)
    due_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=PatientDiseaseSchedule.DiseaseStatus.choices,
        default=PatientDiseaseSchedule.DiseaseStatus.SCHEDULED,
        required=False,
    )
    is_complete = serializers.BooleanField(default=False, required=False)
    status_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ImmunizationEventSerializer(serializers.ModelSerializer):
    vaccine = VaccineBriefSerializer(read_only=True)
    vaccine_batch = VaccineBatchBriefSerializer(read_only=True)

    class Meta:
        model = ImmunizationEvent
        fields = [
            'id', 'disease', 'vaccine', 'vaccine_batch',
            'schedule_slot', 'facility',
            'administered_at', 'administration_route', 'administration_site',
            'event_status', 'next_due_date', 'disease_completed', 'source_channel',
            'local_client_record_id', 'dhis2_synced_at', 'fhir_resource_id',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ImmunizationHistorySummarySerializer(serializers.ModelSerializer):
    vaccine_name = serializers.CharField(source='vaccine.vaccine_name', read_only=True)
    vaccine_code = serializers.CharField(source='vaccine.vaccine_code', read_only=True)
    batch_number = serializers.CharField(source='vaccine_batch.batch_number', read_only=True)

    class Meta:
        model = ImmunizationEvent
        fields = [
            'id', 'disease', 'vaccine_name', 'vaccine_code', 'batch_number',
            'administered_at', 'event_status', 'next_due_date',
            'disease_completed', 'created_at',
        ]


class ImmunizationEventCreateSerializer(serializers.Serializer):
    disease = serializers.ChoiceField(choices=SupportedDisease.choices, required=False, allow_null=True)
    vaccine_id = serializers.PrimaryKeyRelatedField(queryset=VaccineDefinition.objects.all())
    vaccine_batch_id = serializers.PrimaryKeyRelatedField(
        queryset=VaccineBatch.objects.all(), required=False, allow_null=True
    )
    schedule_slot_id = serializers.PrimaryKeyRelatedField(
        queryset=PatientVaccinationSchedule.objects.all(), required=False, allow_null=True
    )
    facility_id = serializers.UUIDField(required=False, allow_null=True)
    administered_at = serializers.DateTimeField()
    administration_route = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)
    administration_site = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)
    event_status = serializers.ChoiceField(
        choices=ImmunizationEvent.EventStatus.choices,
        default=ImmunizationEvent.EventStatus.ADMINISTERED,
        required=False,
    )
    next_due_date = serializers.DateField(required=False, allow_null=True)
    disease_completed = serializers.BooleanField(default=False, required=False)
    source_channel = serializers.ChoiceField(
        choices=ImmunizationEvent.SourceChannel.choices,
        default=ImmunizationEvent.SourceChannel.ONLINE,
        required=False,
    )
    local_client_record_id = serializers.CharField(
        max_length=120, required=False, allow_blank=True, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def create(self, validated_data):
        from users.models import HealthFacility
        facility = None
        facility_id = validated_data.get('facility_id')
        if facility_id:
            try:
                facility = HealthFacility.objects.get(pk=facility_id)
            except HealthFacility.DoesNotExist:
                pass

        return ImmunizationEvent.objects.create(
            patient=validated_data['patient'],
            disease=validated_data.get('disease'),
            vaccine=validated_data['vaccine_id'],
            vaccine_batch=validated_data.get('vaccine_batch_id'),
            schedule_slot=validated_data.get('schedule_slot_id'),
            administered_by=validated_data.get('administered_by'),
            facility=facility,
            administered_at=validated_data['administered_at'],
            administration_route=validated_data.get('administration_route'),
            administration_site=validated_data.get('administration_site'),
            event_status=validated_data.get('event_status', ImmunizationEvent.EventStatus.ADMINISTERED),
            next_due_date=validated_data.get('next_due_date'),
            disease_completed=validated_data.get('disease_completed', False),
            source_channel=validated_data.get('source_channel', ImmunizationEvent.SourceChannel.ONLINE),
            local_client_record_id=validated_data.get('local_client_record_id'),
            notes=validated_data.get('notes'),
        )
