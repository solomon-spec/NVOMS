from django.urls import path

from integrations.views import FHIRImmunizationView, FHIRObservationView, FHIRPatientView

urlpatterns = [
    path('Patient/<uuid:pk>', FHIRPatientView.as_view(), name='fhir-patient'),
    path('Immunization/<uuid:pk>', FHIRImmunizationView.as_view(), name='fhir-immunization'),
    path('Observation/<uuid:pk>', FHIRObservationView.as_view(), name='fhir-observation'),
]
