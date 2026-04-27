from rest_framework import serializers

from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule
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


class ImmunizationEventSerializer(serializers.ModelSerializer):
    vaccine = VaccineBriefSerializer(read_only=True)
    vaccine_batch = VaccineBatchBriefSerializer(read_only=True)

    class Meta:
        model = ImmunizationEvent
        fields = [
            'id', 'vaccine', 'vaccine_batch',
            'schedule_slot', 'facility',
            'administered_at', 'administration_route', 'administration_site',
            'event_status', 'source_channel',
            'local_client_record_id', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ImmunizationEventCreateSerializer(serializers.Serializer):
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
            vaccine=validated_data['vaccine_id'],
            vaccine_batch=validated_data.get('vaccine_batch_id'),
            schedule_slot=validated_data.get('schedule_slot_id'),
            administered_by=validated_data.get('administered_by'),
            facility=facility,
            administered_at=validated_data['administered_at'],
            administration_route=validated_data.get('administration_route'),
            administration_site=validated_data.get('administration_site'),
            event_status=validated_data.get('event_status', ImmunizationEvent.EventStatus.ADMINISTERED),
            source_channel=validated_data.get('source_channel', ImmunizationEvent.SourceChannel.ONLINE),
            local_client_record_id=validated_data.get('local_client_record_id'),
            notes=validated_data.get('notes'),
        )
