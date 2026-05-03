from django.utils import timezone

from immunizations.models import ImmunizationEvent
from patients.models import Patient
from surveillance.models import SurveillanceReport


def patient_to_fhir(patient: Patient):
    given = [part for part in [patient.first_name, patient.middle_name] if part]
    return {
        'resourceType': 'Patient',
        'id': str(patient.id),
        'identifier': [
            {'system': 'urn:nvoms:patient-uid', 'value': patient.uid},
        ],
        'name': [
            {
                'use': 'official',
                'family': patient.last_name or '',
                'given': given,
            }
        ],
        'gender': patient.sex,
        'birthDate': patient.date_of_birth.isoformat(),
    }


def immunization_to_fhir(event: ImmunizationEvent):
    resource_id = event.fhir_resource_id or f'Immunization-{event.id}'
    if event.fhir_resource_id != resource_id:
        event.fhir_resource_id = resource_id
        event.save(update_fields=['fhir_resource_id'])

    return {
        'resourceType': 'Immunization',
        'id': resource_id,
        'status': _immunization_status(event.event_status),
        'vaccineCode': {
            'coding': [
                {'system': 'urn:nvoms:vaccine-code', 'code': event.vaccine.vaccine_code},
            ],
            'text': event.vaccine.vaccine_name,
        },
        'patient': {'reference': f'Patient/{event.patient_id}'},
        'occurrenceDateTime': event.administered_at.isoformat(),
        'recorded': event.created_at.isoformat(),
        'primarySource': True,
        'lotNumber': event.vaccine_batch.batch_number if event.vaccine_batch else None,
    }


def observation_to_fhir(report: SurveillanceReport):
    resource_id = report.fhir_resource_id or report.fhir_observation_id or f'Observation-{report.id}'
    if report.fhir_resource_id != resource_id or report.fhir_observation_id != resource_id:
        report.fhir_resource_id = resource_id
        report.fhir_observation_id = resource_id
        report.save(update_fields=['fhir_resource_id', 'fhir_observation_id'])

    components = []
    if report.body_temperature_c is not None:
        components.append({
            'code': {'text': 'Body temperature'},
            'valueQuantity': {
                'value': float(report.body_temperature_c),
                'unit': 'Cel',
                'system': 'http://unitsofmeasure.org',
                'code': 'Cel',
            },
        })

    return {
        'resourceType': 'Observation',
        'id': resource_id,
        'status': 'final' if report.status == SurveillanceReport.Status.CLOSED else 'preliminary',
        'code': {
            'coding': [
                {'system': 'urn:nvoms:surveillance-category', 'code': report.surveillance_category},
            ],
            'text': report.disease_suspected or report.condition_type,
        },
        'subject': {'reference': f'Patient/{report.patient_id}'},
        'effectiveDateTime': timezone.make_aware(
            timezone.datetime.combine(report.onset_date, timezone.datetime.min.time())
        ).isoformat(),
        'issued': report.created_at.isoformat(),
        'valueString': report.severity,
        'component': components,
    }


def _immunization_status(status):
    if status == ImmunizationEvent.EventStatus.ADMINISTERED:
        return 'completed'
    if status == ImmunizationEvent.EventStatus.REFUSED:
        return 'not-done'
    return 'entered-in-error'
