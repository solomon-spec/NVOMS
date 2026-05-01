from rest_framework import serializers

from vaccines.models import Antigen, EpiScheduleRule, EpiScheduleVersion, VaccineBatch, VaccineDefinition


class AntigenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Antigen
        fields = ['id', 'code', 'name', 'description', 'is_active']
        read_only_fields = ['id']


class AntigenBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Antigen
        fields = ['id', 'code', 'name']


class VaccineSerializer(serializers.ModelSerializer):
    antigen = AntigenBriefSerializer(read_only=True)
    antigen_id = serializers.PrimaryKeyRelatedField(
        queryset=Antigen.objects.all(),
        source='antigen',
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = VaccineDefinition
        fields = [
            'id', 'vaccine_code', 'vaccine_name',
            'antigen', 'antigen_id', 'dose_sequence',
            'default_route', 'default_site',
            'is_active',
        ]
        read_only_fields = ['id']


class VaccineBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccineDefinition
        fields = ['id', 'vaccine_code', 'vaccine_name']


# ── Vaccine Batches ───────────────────────────────────────────────────────────

class VaccineBatchSerializer(serializers.ModelSerializer):
    vaccine = VaccineBriefSerializer(read_only=True)
    vaccine_id = serializers.PrimaryKeyRelatedField(
        queryset=VaccineDefinition.objects.all(),
        source='vaccine',
        write_only=True,
    )

    class Meta:
        model = VaccineBatch
        fields = [
            'id', 'vaccine', 'vaccine_id',
            'batch_number', 'manufacturer_name',
            'expiry_date', 'source_system',
            'is_valid', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class VaccineBatchBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccineBatch
        fields = ['id', 'batch_number', 'expiry_date', 'is_valid']


# ── EPI Schedule ──────────────────────────────────────────────────────────────

class EpiScheduleRuleSerializer(serializers.ModelSerializer):
    vaccine = VaccineBriefSerializer(read_only=True)
    vaccine_id = serializers.PrimaryKeyRelatedField(
        queryset=VaccineDefinition.objects.all(),
        source='vaccine',
        write_only=True,
    )

    class Meta:
        model = EpiScheduleRule
        fields = [
            'id', 'vaccine', 'vaccine_id', 'dose_label',
            'recommended_age_days', 'grace_period_days',
            'defaulter_threshold_days', 'medical_exception_rule',
            'is_birth_dose', 'is_active',
        ]
        read_only_fields = ['id']


class EpiScheduleVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EpiScheduleVersion
        fields = [
            'id', 'version_name', 'effective_from', 'effective_to',
            'status', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class EpiScheduleVersionDetailSerializer(serializers.ModelSerializer):
    rules = EpiScheduleRuleSerializer(many=True, read_only=True)

    class Meta:
        model = EpiScheduleVersion
        fields = [
            'id', 'version_name', 'effective_from', 'effective_to',
            'status', 'notes', 'created_at', 'rules',
        ]
        read_only_fields = ['id', 'created_at']
