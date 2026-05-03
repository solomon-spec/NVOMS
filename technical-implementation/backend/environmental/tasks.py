from datetime import date, timedelta
from decimal import Decimal

from celery import shared_task
from django.conf import settings

from environmental.models import MeteorologicalObservation
from geography.models import AdministrativeUnit


@shared_task
def fetch_open_meteo_observations_task(unit_ids=None, start_date=None, end_date=None):
    if not getattr(settings, 'OPEN_METEO_ENABLED', False):
        return {'stored': 0, 'skipped': 'OPEN_METEO_ENABLED is false'}

    start = date.fromisoformat(start_date) if start_date else date.today() - timedelta(days=1)
    end = date.fromisoformat(end_date) if end_date else start
    units = AdministrativeUnit.objects.filter(latitude__isnull=False, longitude__isnull=False)
    if unit_ids:
        units = units.filter(id__in=unit_ids)

    stored = 0
    for unit in units:
        import requests

        response = requests.get(
            'https://archive-api.open-meteo.com/v1/archive',
            params={
                'latitude': unit.latitude,
                'longitude': unit.longitude,
                'start_date': start.isoformat(),
                'end_date': end.isoformat(),
                'daily': 'rain_sum,temperature_2m_mean',
                'timezone': 'UTC',
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        daily = payload.get('daily', {})
        dates = daily.get('time', [])
        rainfall = daily.get('rain_sum', [])
        temperatures = daily.get('temperature_2m_mean', [])
        for index, observed_on in enumerate(dates):
            _, created = MeteorologicalObservation.objects.update_or_create(
                unit=unit,
                observation_date=observed_on,
                source='open-meteo',
                defaults={
                    'rainfall_mm': _decimal_or_none(rainfall, index),
                    'temperature_c': _decimal_or_none(temperatures, index),
                    'raw_payload': payload,
                },
            )
            if created:
                stored += 1
    return {'stored': stored}


def _decimal_or_none(values, index):
    try:
        value = values[index]
    except (IndexError, TypeError):
        return None
    return Decimal(str(value)) if value is not None else None
