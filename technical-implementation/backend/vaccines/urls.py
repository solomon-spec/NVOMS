from django.urls import path

from vaccines.views import (
    EpiScheduleRuleDetailView,
    EpiScheduleRuleListView,
    EpiScheduleRegenerateAllView,
    EpiScheduleRegenerationStatusView,
    EpiScheduleVersionDetailView,
    EpiScheduleVersionListView,
    VaccineBatchDetailView,
    VaccineBatchListView,
    VaccineDetailView,
    VaccineListView,
)

urlpatterns = [
    # Vaccine definitions
    path('', VaccineListView.as_view(), name='vaccine-list'),

    # Vaccine batches
    path('batches/', VaccineBatchListView.as_view(), name='vaccine-batch-list'),
    path('batches/<uuid:pk>', VaccineBatchDetailView.as_view(), name='vaccine-batch-detail'),

    # EPI schedule versions
    path('schedules/', EpiScheduleVersionListView.as_view(), name='epi-schedule-version-list'),
    path(
        'schedules/<uuid:version_pk>/regenerate-all/',
        EpiScheduleRegenerateAllView.as_view(),
        name='epi-schedule-regenerate-all',
    ),
    path(
        'schedules/<uuid:version_pk>/regeneration-status/',
        EpiScheduleRegenerationStatusView.as_view(),
        name='epi-schedule-regeneration-status',
    ),
    path('schedules/<uuid:pk>', EpiScheduleVersionDetailView.as_view(), name='epi-schedule-version-detail'),

    # EPI schedule rules (nested under version)
    path('schedules/<uuid:version_pk>/rules/', EpiScheduleRuleListView.as_view(), name='epi-schedule-rule-list'),
    path('schedules/<uuid:version_pk>/rules/<uuid:pk>', EpiScheduleRuleDetailView.as_view(), name='epi-schedule-rule-detail'),

    # Vaccine detail — must come after fixed string paths
    path('<uuid:pk>', VaccineDetailView.as_view(), name='vaccine-detail'),
]
