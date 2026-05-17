from django.utils import timezone

from immunizations.models import ImmunizationEvent, PatientDiseaseSchedule, SupportedDisease


DISEASE_KEYWORDS = {
    SupportedDisease.MEASLES: ('measles', 'mr', 'mcv'),
    SupportedDisease.POLIO: ('polio', 'opv', 'ipv'),
    SupportedDisease.CHOLERA: ('cholera', 'ocv'),
}


def infer_supported_disease(vaccine):
    if not vaccine:
        return None

    antigen = getattr(vaccine, 'antigen', None)
    searchable = ' '.join(
        value
        for value in [
            getattr(vaccine, 'vaccine_name', '') or '',
            getattr(vaccine, 'vaccine_code', '') or '',
            getattr(antigen, 'name', '') or '',
            getattr(antigen, 'code', '') or '',
        ]
        if value
    ).lower()

    for disease, keywords in DISEASE_KEYWORDS.items():
        if any(keyword in searchable for keyword in keywords):
            return disease
    return None


def ensure_patient_disease_schedules(patient):
    for disease, _ in SupportedDisease.choices:
        PatientDiseaseSchedule.objects.get_or_create(
            patient=patient,
            disease=disease,
            defaults={'status': PatientDiseaseSchedule.DiseaseStatus.NOT_STARTED},
        )


def apply_outcome_to_disease_schedule(event):
    disease = event.disease or infer_supported_disease(event.vaccine)
    if not disease:
        return None

    schedule, _ = PatientDiseaseSchedule.objects.get_or_create(
        patient=event.patient,
        disease=disease,
        defaults={'status': PatientDiseaseSchedule.DiseaseStatus.NOT_STARTED},
    )

    schedule.last_outcome_event = event
    schedule.status_reason = event.notes

    if event.disease_completed:
        schedule.is_complete = True
        schedule.completed_at = timezone.now()
        schedule.current_due_date = None
        schedule.status = PatientDiseaseSchedule.DiseaseStatus.COMPLETED
    elif event.next_due_date:
        schedule.is_complete = False
        schedule.completed_at = None
        schedule.current_due_date = event.next_due_date
        schedule.status = PatientDiseaseSchedule.DiseaseStatus.SCHEDULED
    elif event.event_status == ImmunizationEvent.EventStatus.ADMINISTERED:
        schedule.status = PatientDiseaseSchedule.DiseaseStatus.PROTECTED
    elif event.event_status == ImmunizationEvent.EventStatus.REFUSED:
        schedule.status = PatientDiseaseSchedule.DiseaseStatus.REFUSED
    elif event.event_status == ImmunizationEvent.EventStatus.CONTRAINDICATED:
        schedule.status = PatientDiseaseSchedule.DiseaseStatus.CONTRAINDICATED

    schedule.save(
        update_fields=[
            'last_outcome_event',
            'status_reason',
            'is_complete',
            'completed_at',
            'current_due_date',
            'status',
            'updated_at',
        ]
    )
    return schedule
