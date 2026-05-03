from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Count
from django.utils import timezone

from geography.models import AdministrativeUnit
from immunizations.models import PatientVaccinationSchedule
from patients.models import Patient
from prediction.models import OutbreakRiskScore
from surveillance.models import SurveillanceReport


def _configured_diseases():
    raw = getattr(settings, 'PREDICTION_DISEASES', 'measles')
    return [item.strip() for item in raw.split(',') if item.strip()]


def _unit_queryset():
    return (
        AdministrativeUnit.objects
        .filter(is_active=True)
        .filter(level__in=[
            AdministrativeUnit.Level.REGION,
            AdministrativeUnit.Level.ZONE,
            AdministrativeUnit.Level.WOREDA,
            AdministrativeUnit.Level.KEBELE,
        ])
        .order_by('name')
    )


def compute_outbreak_risk_scores(diseases=None):
    """
    Computes durable risk-score rows using the current NVOMS data.

    The scoring surface is deliberately isolated so a trained model can replace the
    heuristic without changing the API contract expected by the frontend.
    """
    diseases = diseases or _configured_diseases()
    now = timezone.now()
    since = now - timedelta(days=30)
    written = []

    for unit in _unit_queryset():
        patient_qs = Patient.objects.filter(
            residence_unit=unit,
            status=Patient.Status.REGISTERED,
        )
        patient_count = patient_qs.count()
        defaulter_count = (
            PatientVaccinationSchedule.objects
            .filter(
                patient__residence_unit=unit,
                status__in=[
                    PatientVaccinationSchedule.SlotStatus.OVERDUE,
                    PatientVaccinationSchedule.SlotStatus.DEFAULTER,
                ],
            )
            .values('patient_id')
            .distinct()
            .count()
        )
        report_counts = dict(
            SurveillanceReport.objects
            .filter(
                patient__residence_unit=unit,
                created_at__gte=since,
            )
            .values('disease_suspected')
            .annotate(total=Count('id'))
            .values_list('disease_suspected', 'total')
        )

        for disease in diseases:
            recent_reports = report_counts.get(disease, 0) or 0
            defaulter_rate = defaulter_count / patient_count if patient_count else 0
            score = min(
                0.99,
                0.05 + (defaulter_rate * 0.65) + min(recent_reports, 5) * 0.06,
            )
            score_decimal = Decimal(str(round(score, 4)))
            obj, _ = OutbreakRiskScore.objects.update_or_create(
                unit=unit,
                disease=disease,
                defaults={
                    'risk_score': score_decimal,
                    'computed_at': now,
                    'model_version': 'heuristic-v1',
                    'factors': {
                        'patient_count': patient_count,
                        'defaulter_count': defaulter_count,
                        'recent_surveillance_reports': recent_reports,
                    },
                },
            )
            written.append(obj)

    return written
