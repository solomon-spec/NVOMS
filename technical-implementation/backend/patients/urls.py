from django.urls import path

from immunizations.views import (
    PatientDoseListView,
    PatientDiseaseScheduleListView,
    PatientOutcomeListView,
    PatientScheduleListView,
    PatientScheduleRegenerateView,
    PatientScheduleSlotDetailView,
    PatientVaccinationHistoryView,
)
from patients.me_views import PatientMeDosesView, PatientMeScheduleView, PatientMeView
from patients.views import (
    DefaulterListView,
    PatientDetailView,
    PatientListView,
    PatientSendReminderView,
    PatientSummaryView,
)

urlpatterns = [
    # Patient self-service (must appear before <uuid:pk>)
    path('me/', PatientMeView.as_view(), name='patient-me'),
    path('me/schedule/', PatientMeScheduleView.as_view(), name='patient-me-schedule-slash'),
    path('me/schedule', PatientMeScheduleView.as_view(), name='patient-me-schedule'),
    path('me/doses/', PatientMeDosesView.as_view(), name='patient-me-doses-slash'),
    path('me/doses', PatientMeDosesView.as_view(), name='patient-me-doses'),
    # Staff-managed patient endpoints
    path('', PatientListView.as_view(), name='patient-list'),
    path('defaulters/', DefaulterListView.as_view(), name='patient-defaulter-list'),
    path('<uuid:pk>', PatientDetailView.as_view(), name='patient-detail'),
    path('<uuid:pk>/summary', PatientSummaryView.as_view(), name='patient-summary'),
    path('<uuid:pk>/send-reminder/', PatientSendReminderView.as_view(), name='patient-send-reminder'),
    # schedule
    path('<uuid:pk>/schedule', PatientScheduleListView.as_view(), name='patient-schedule-list'),
    path('<uuid:pk>/schedule/regenerate', PatientScheduleRegenerateView.as_view(), name='patient-schedule-regenerate'),
    path('<uuid:pk>/schedule/<uuid:slot_id>', PatientScheduleSlotDetailView.as_view(), name='patient-schedule-slot'),
    path('<uuid:pk>/disease-schedules', PatientDiseaseScheduleListView.as_view(), name='patient-disease-schedule-list'),
    # doses
    path('<uuid:pk>/doses', PatientDoseListView.as_view(), name='patient-dose-list'),
    path('<uuid:pk>/outcomes', PatientOutcomeListView.as_view(), name='patient-outcome-list'),
    path('<uuid:pk>/vaccination-history', PatientVaccinationHistoryView.as_view(), name='patient-vaccination-history'),
]
