from rest_framework import serializers

from geography.models import AdministrativeUnit
from patients.models import Caregiver, Patient, PatientImmunizationStatus
from users.models import HealthFacility


class AdministrativeUnitBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdministrativeUnit
        fields = ['id', 'code', 'name', 'level']


class CaregiverSerializer(serializers.ModelSerializer):
    residence_unit = AdministrativeUnitBriefSerializer(read_only=True)
    residence_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=AdministrativeUnit.objects.all(),
        source='residence_unit',
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = Caregiver
        fields = [
            'id', 'full_name', 'phone_number', 'alternate_phone_number',
            'relationship_to_patient', 'preferred_language',
            'residence_unit', 'residence_unit_id',
            'address_line', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class CaregiverBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caregiver
        fields = ['id', 'full_name', 'phone_number', 'relationship_to_patient']


class PatientImmunizationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientImmunizationStatus
        fields = [
            'current_status', 'next_due_date',
            'due_count', 'overdue_count', 'administered_count',
            'is_zero_dose', 'last_evaluated_at',
        ]


class PatientSerializer(serializers.ModelSerializer):
    primary_caregiver = CaregiverBriefSerializer(read_only=True)
    residence_unit = AdministrativeUnitBriefSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'uid', 'full_name',
            'first_name', 'middle_name', 'last_name',
            'sex', 'date_of_birth',
            'primary_caregiver', 'residence_unit',
            'registered_facility', 'registered_by',
            'medical_exception_flag', 'duplicate_review_status',
            'status', 'qr_code_value',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'uid', 'registered_by', 'created_at', 'updated_at']


class PatientCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=80)
    middle_name = serializers.CharField(max_length=80, required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(max_length=80, required=False, allow_blank=True, allow_null=True)
    sex = serializers.ChoiceField(choices=Patient.Sex.choices)
    date_of_birth = serializers.DateField()
    primary_caregiver_id = serializers.PrimaryKeyRelatedField(queryset=Caregiver.objects.all())
    residence_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=AdministrativeUnit.objects.all(), required=False, allow_null=True
    )
    registered_facility_id = serializers.PrimaryKeyRelatedField(
        queryset=HealthFacility.objects.all(), required=False, allow_null=True
    )
    medical_exception_flag = serializers.BooleanField(default=False, required=False)
    status = serializers.ChoiceField(
        choices=Patient.Status.choices, default=Patient.Status.REGISTERED, required=False
    )

    def create(self, validated_data):
        return Patient.objects.create(
            first_name=validated_data['first_name'],
            middle_name=validated_data.get('middle_name'),
            last_name=validated_data.get('last_name'),
            sex=validated_data['sex'],
            date_of_birth=validated_data['date_of_birth'],
            primary_caregiver=validated_data['primary_caregiver_id'],
            residence_unit=validated_data.get('residence_unit_id'),
            registered_facility=validated_data.get('registered_facility_id'),
            registered_by=validated_data.get('registered_by'),
            medical_exception_flag=validated_data.get('medical_exception_flag', False),
            status=validated_data.get('status', Patient.Status.REGISTERED),
        )


class PatientUpdateSerializer(serializers.ModelSerializer):
    residence_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=AdministrativeUnit.objects.all(),
        source='residence_unit',
        required=False,
        allow_null=True,
    )
    registered_facility_id = serializers.PrimaryKeyRelatedField(
        queryset=HealthFacility.objects.all(),
        source='registered_facility',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Patient
        fields = [
            'first_name', 'middle_name', 'last_name',
            'sex', 'date_of_birth',
            'residence_unit_id', 'registered_facility_id',
            'medical_exception_flag', 'status', 'qr_code_value',
        ]
