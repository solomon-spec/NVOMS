from django.urls import path

from patients.caregiver_me_views import (
    CaregiverMePatientDosesView,
    CaregiverMePatientScheduleView,
    CaregiverMePatientsView,
)
from patients.views import CaregiverDetailView, CaregiverListView

urlpatterns = [
    # Caregiver self-service (must appear before <uuid:pk>)
    path('me/patients', CaregiverMePatientsView.as_view(), name='caregiver-me-patients'),
    path('me/patients/<uuid:patient_id>/schedule', CaregiverMePatientScheduleView.as_view(), name='caregiver-me-patient-schedule'),
    path('me/patients/<uuid:patient_id>/doses', CaregiverMePatientDosesView.as_view(), name='caregiver-me-patient-doses'),
    # Staff-managed caregiver endpoints
    path('', CaregiverListView.as_view(), name='caregiver-list'),
    path('<uuid:pk>', CaregiverDetailView.as_view(), name='caregiver-detail'),
]
