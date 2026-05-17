from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from vaccines.models import (
    Antigen,
    EpiScheduleRule,
    EpiScheduleVersion,
    VaccineBatch,
    VaccineDefinition,
)


SUPPORTED_PRODUCTS = [
    {
        'antigen_code': 'measles',
        'antigen_name': 'Measles',
        'vaccine_code': 'MCV1',
        'vaccine_name': 'Measles-Rubella Vaccine Dose 1',
        'dose_sequence': 1,
        'route': 'SC',
        'site': 'Left upper arm',
        'recommended_age_days': 270,
        'batches': [
            ('MR-ADD-2026-041', 'Bio Farma', 730),
            ('MR-ADD-2026-072', 'Serum Institute of India', 540),
        ],
    },
    {
        'antigen_code': 'polio',
        'antigen_name': 'Polio',
        'vaccine_code': 'OPV3',
        'vaccine_name': 'Bivalent Oral Polio Vaccine Dose 3',
        'dose_sequence': 3,
        'route': 'Oral',
        'site': 'Mouth',
        'recommended_age_days': 98,
        'batches': [
            ('BOPV-ADD-2026-118', 'PT Bio Farma', 640),
            ('BOPV-ADD-2026-204', 'Sanofi Pasteur', 425),
        ],
    },
    {
        'antigen_code': 'cholera',
        'antigen_name': 'Cholera',
        'vaccine_code': 'OCV1',
        'vaccine_name': 'Oral Cholera Vaccine Dose 1',
        'dose_sequence': 1,
        'route': 'Oral',
        'site': 'Mouth',
        'recommended_age_days': 365,
        'batches': [
            ('OCV-ADD-2026-015', 'EuBiologics', 690),
            ('OCV-ADD-2026-033', 'Bharat Biotech', 510),
        ],
    },
]

OLD_LOW_QUALITY_BATCHES = [
    'SAMPLE-MCV1-001',
    'SAMPLE-OPV3-001',
    'SAMPLE-OCV1-001',
]

OLD_DEMO_PRODUCT_CODES = [
    'DEMO-MCV1',
    'DEMO-OPV3',
    'DEMO-PENTA3',
]


class Command(BaseCommand):
    help = 'Create sample vaccine products, batches, and schedule rules for the three supported diseases.'

    def handle(self, *args, **options):
        today = timezone.localdate()
        self._cleanup_old_sample_rows()
        version, _ = EpiScheduleVersion.objects.update_or_create(
            version_name='NVOMS Supported Disease Sample Schedule',
            defaults={
                'effective_from': today,
                'effective_to': None,
                'status': EpiScheduleVersion.Status.ACTIVE,
                'notes': 'Sample products for Measles, Polio, and Cholera outcome recording.',
            },
        )

        created_or_updated = []
        for spec in SUPPORTED_PRODUCTS:
            antigen, _ = Antigen.objects.update_or_create(
                code=spec['antigen_code'],
                defaults={
                    'name': spec['antigen_name'],
                    'description': 'Supported by the disease-focused immunization workflow.',
                    'is_active': True,
                },
            )
            vaccine, _ = VaccineDefinition.objects.update_or_create(
                vaccine_code=spec['vaccine_code'],
                defaults={
                    'vaccine_name': spec['vaccine_name'],
                    'antigen': antigen,
                    'dose_sequence': spec['dose_sequence'],
                    'default_route': spec['route'],
                    'default_site': spec['site'],
                    'is_active': True,
                },
            )
            for batch_number, manufacturer, valid_days in spec['batches']:
                VaccineBatch.objects.update_or_create(
                    batch_number=batch_number,
                    defaults={
                        'vaccine': vaccine,
                        'manufacturer_name': manufacturer,
                        'expiry_date': today + timedelta(days=valid_days),
                        'source_system': 'supported-vaccine-seed',
                        'is_valid': True,
                    },
                )
            EpiScheduleRule.objects.update_or_create(
                schedule_version=version,
                vaccine=vaccine,
                dose_label=spec['vaccine_code'],
                defaults={
                    'recommended_age_days': spec['recommended_age_days'],
                    'grace_period_days': 7,
                    'defaulter_threshold_days': 14,
                    'medical_exception_rule': None,
                    'is_birth_dose': False,
                    'is_active': True,
                },
            )
            created_or_updated.append(spec['vaccine_code'])

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded supported vaccine products: {", ".join(created_or_updated)}.'
            )
        )

    def _cleanup_old_sample_rows(self):
        removed_batches = 0
        for batch_number in OLD_LOW_QUALITY_BATCHES:
            batch = VaccineBatch.objects.filter(batch_number=batch_number).first()
            if not batch:
                continue
            if batch.immunization_events.exists():
                continue
            batch.delete()
            removed_batches += 1

        removed_products = 0
        for vaccine_code in OLD_DEMO_PRODUCT_CODES:
            vaccine = VaccineDefinition.objects.filter(vaccine_code=vaccine_code).first()
            if not vaccine:
                continue
            if vaccine.immunization_events.exists() or vaccine.schedule_slots.exists():
                continue
            EpiScheduleRule.objects.filter(vaccine=vaccine).delete()
            VaccineBatch.objects.filter(vaccine=vaccine, immunization_events__isnull=True).delete()
            vaccine.delete()
            removed_products += 1

        if removed_batches or removed_products:
            self.stdout.write(
                f'Removed old sample rows: {removed_batches} batch(es), {removed_products} product(s).'
            )
