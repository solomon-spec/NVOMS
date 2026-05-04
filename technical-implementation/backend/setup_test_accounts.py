import os
import django

# Initialize Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nvoms.settings')
django.setup()

from users.models import User, Role, HealthFacility

def run_seed():
    print("Seeding database with test accounts and roles...")

    # 1. Create Roles
    roles_data = [
        {"role_code": "ADMIN", "role_name": "Administrator"},
        {"role_code": "HEALTH_WORKER", "role_name": "Health Worker"},
        {"role_code": "PUBLIC_HEALTH_OFFICIAL", "role_name": "Public Health Official"},
        {"role_code": "PATIENT", "role_name": "Patient / Caregiver"}
    ]

    roles = {}
    for data in roles_data:
        role, created = Role.objects.get_or_create(
            role_code=data["role_code"],
            defaults={"role_name": data["role_name"]}
        )
        roles[data["role_code"]] = role
        if created:
            print(f"Created role: {data['role_code']}")

    # 2. Create a default Facility
    facility, created = HealthFacility.objects.get_or_create(
        facility_code="FAC-001",
        defaults={"facility_name": "Addis Ababa General Hospital"}
    )
    if created:
        print(f"Created facility: {facility.facility_name}")

    # 3. Create Test Users
    test_users = [
        {
            "email": "admin@nvoms.local",
            "full_name": "Admin User",
            "role": roles["ADMIN"],
            "assigned_facility": None,
            "is_staff": True,
            "is_superuser": True
        },
        {
            "email": "hw@nvoms.local",
            "full_name": "Health Worker",
            "role": roles["HEALTH_WORKER"],
            "assigned_facility": facility,
            "is_staff": False,
            "is_superuser": False
        },
        {
            "email": "pho@nvoms.local",
            "full_name": "Public Health Officer",
            "role": roles["PUBLIC_HEALTH_OFFICIAL"],
            "assigned_facility": None,
            "is_staff": False,
            "is_superuser": False
        },
        {
            "email": "patient@nvoms.local",
            "full_name": "Test Patient",
            "role": roles["PATIENT"],
            "assigned_facility": facility,
            "is_staff": False,
            "is_superuser": False
        }
    ]

    for data in test_users:
        user_email = data["email"]
        if not User.objects.filter(email=user_email).exists():
            user = User.objects.create_user(
                email=user_email,
                password="password123",
                full_name=data["full_name"],
                role=data["role"],
                assigned_facility=data["assigned_facility"],
                is_staff=data["is_staff"],
                is_superuser=data["is_superuser"],
                status=User.Status.ACTIVE,
                must_change_password=False
            )
            print(f"Created user: {user_email} (Role: {data['role'].role_code})")
        else:
            print(f"User already exists: {user_email}")

    print("\n✅ Setup complete! You can now log into the frontend using:")
    print(" - admin@nvoms.local / password123")
    print(" - hw@nvoms.local / password123")
    print(" - pho@nvoms.local / password123")
    print(" - patient@nvoms.local / password123")

if __name__ == '__main__':
    run_seed()
