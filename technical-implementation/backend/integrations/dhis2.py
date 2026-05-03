import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from immunizations.models import ImmunizationEvent
from integrations.models import SyncLog

logger = logging.getLogger(__name__)


def build_dhis2_payload(event):
    return {
        'event': str(event.id),
        'program': getattr(settings, 'DHIS2_PROGRAM_ID', ''),
        'orgUnit': event.facility.facility_code if event.facility else '',
        'eventDate': event.administered_at.date().isoformat(),
        'trackedEntityInstance': event.patient.uid,
        'dataValues': [
            {'dataElement': 'vaccine', 'value': event.vaccine.vaccine_code},
            {'dataElement': 'doseStatus', 'value': event.event_status},
            {'dataElement': 'sourceChannel', 'value': event.source_channel},
        ],
    }


def sync_immunization_events_to_dhis2(triggered_by=None, limit=500):
    started_at = timezone.now()
    events = list(
        ImmunizationEvent.objects
        .filter(dhis2_synced_at__isnull=True)
        .select_related('patient', 'vaccine', 'facility')
        .order_by('created_at')[:limit]
    )
    payload = {'events': [build_dhis2_payload(event) for event in events]}
    errors = []
    synced_ids = []

    dry_run = getattr(settings, 'DHIS2_DRY_RUN', True)
    base_url = getattr(settings, 'DHIS2_BASE_URL', '')
    username = getattr(settings, 'DHIS2_USERNAME', '')
    password = getattr(settings, 'DHIS2_PASSWORD', '')

    try:
        if events and not dry_run:
            import requests

            if not all([base_url, username, password]):
                raise ValueError('DHIS2_BASE_URL, DHIS2_USERNAME, and DHIS2_PASSWORD are required')
            response = requests.post(
                f'{base_url.rstrip("/")}/api/events',
                json=payload,
                auth=(username, password),
                timeout=30,
            )
            response.raise_for_status()
        synced_ids = [event.id for event in events]
        status = SyncLog.Status.SUCCESS
    except Exception as exc:
        logger.warning('DHIS2 sync failed: %s', exc)
        status = SyncLog.Status.FAILED
        errors.append(str(exc))

    with transaction.atomic():
        if synced_ids:
            ImmunizationEvent.objects.filter(id__in=synced_ids).update(dhis2_synced_at=timezone.now())
        log = SyncLog.objects.create(
            integration_type=SyncLog.IntegrationType.DHIS2,
            status=status,
            records_attempted=len(events),
            records_synced=len(synced_ids),
            errors=errors,
            triggered_by=triggered_by,
            started_at=started_at,
            completed_at=timezone.now(),
        )
    return log
