from django.utils import timezone


def create_alert_from_report(report, unit, disease_code, risk_probability=None, notes=None):
    from surveillance.models import OutbreakAlert
    return OutbreakAlert.objects.create(
        unit=unit,
        disease_code=disease_code,
        surveillance_report=report,
        alert_source=OutbreakAlert.AlertSource.SURVEILLANCE,
        risk_probability=risk_probability,
        notes=notes,
    )


VALID_TRANSITIONS = {
    'potential': {'under_review', 'dismissed'},
    'under_review': {'confirmed', 'dismissed', 'false_alarm'},
    'confirmed': {'closed'},
    'dismissed': set(),
    'false_alarm': set(),
}


def transition_alert_status(alert, new_status, verified_by=None, notes=None):
    allowed = VALID_TRANSITIONS.get(alert.status, set())
    if new_status not in allowed:
        raise ValueError(
            f'Cannot transition alert from "{alert.status}" to "{new_status}".'
        )
    alert.status = new_status
    if new_status in ('confirmed', 'dismissed', 'false_alarm'):
        alert.verified_by = verified_by
        alert.verified_at = timezone.now()
    if notes:
        alert.notes = notes
    alert.save()
    return alert
