from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from users.models import HealthFacility, Role, User


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'role_code', 'role_name', 'description']


class FacilityBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthFacility
        fields = ['id', 'facility_code', 'facility_name']


class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthFacility
        fields = ['id', 'facility_code', 'facility_name']
        read_only_fields = ['id']


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    assigned_facility = FacilityBriefSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'phone_number', 'role',
            'assigned_facility', 'status', 'must_change_password',
            'preferred_language', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=160)
    email = serializers.EmailField(
        max_length=160, required=False, allow_null=True, allow_blank=True
    )
    phone_number = serializers.CharField(
        max_length=24, required=False, allow_null=True, allow_blank=True
    )
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())
    facility_id = serializers.PrimaryKeyRelatedField(
        queryset=HealthFacility.objects.all(), required=False, allow_null=True
    )
    status = serializers.ChoiceField(choices=User.Status.choices, default=User.Status.INACTIVE)
    preferred_language = serializers.CharField(max_length=12, default='en', required=False)

    def validate_email(self, value):
        return value or None

    def validate_phone_number(self, value):
        return value or None

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if not attrs.get('email') and not attrs.get('phone_number'):
            raise serializers.ValidationError(
                'At least one of email or phone_number is required.'
            )
        return attrs

    def create(self, validated_data):
        role = validated_data.pop('role_id')
        facility = validated_data.pop('facility_id', None)
        password = validated_data.pop('password')
        user = User(role=role, assigned_facility=facility, **validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    facility_id = serializers.PrimaryKeyRelatedField(
        queryset=HealthFacility.objects.all(),
        source='assigned_facility',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = ['full_name', 'email', 'phone_number', 'preferred_language', 'facility_id']

    def validate(self, attrs):
        instance = self.instance
        email = attrs.get('email', getattr(instance, 'email', None))
        phone = attrs.get('phone_number', getattr(instance, 'phone_number', None))
        if not email and not phone:
            raise serializers.ValidationError(
                'At least one of email or phone_number is required.'
            )
        return attrs


class UserStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=User.Status.choices)


class UserRoleAssignSerializer(serializers.Serializer):
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())
