from django.urls import path

from immunizations.views import (
    PatientDoseListView,
    PatientScheduleListView,
    PatientScheduleRegenerateView,
    PatientScheduleSlotDetailView,
)
from patients.views import PatientDetailView, PatientListView, PatientSummaryView

urlpatterns = [
    path('', PatientListView.as_view(), name='patient-list'),
    path('<uuid:pk>', PatientDetailView.as_view(), name='patient-detail'),
    path('<uuid:pk>/summary', PatientSummaryView.as_view(), name='patient-summary'),
    # schedule
    path('<uuid:pk>/schedule', PatientScheduleListView.as_view(), name='patient-schedule-list'),
    path('<uuid:pk>/schedule/regenerate', PatientScheduleRegenerateView.as_view(), name='patient-schedule-regenerate'),
    path('<uuid:pk>/schedule/<uuid:slot_id>', PatientScheduleSlotDetailView.as_view(), name='patient-schedule-slot'),
    # doses
    path('<uuid:pk>/doses', PatientDoseListView.as_view(), name='patient-dose-list'),
]
