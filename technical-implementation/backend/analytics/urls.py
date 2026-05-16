from django.urls import path

from analytics.views import (
    AdminDashboardView,
    CoverageTrendView,
    DailyVaccinationReportView,
    DefaulterClusterView,
    HwDashboardView,
    PhoDashboardView,
    ReportingGapView,
    VaccineCoverageByRegionView,
    VaccineCoverageView,
)

urlpatterns = [
    path('coverage/', VaccineCoverageView.as_view(), name='vaccine-coverage'),
    path('coverage/by-region/', VaccineCoverageByRegionView.as_view(), name='vaccine-coverage-by-region'),
    path('coverage/trend/', CoverageTrendView.as_view(), name='vaccine-coverage-trend'),
    path('defaulters/by-cluster/', DefaulterClusterView.as_view(), name='defaulters-by-cluster'),
    path('reporting-gaps/', ReportingGapView.as_view(), name='reporting-gaps'),
    path('admin-dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('hw-dashboard/', HwDashboardView.as_view(), name='hw-dashboard'),
    path('pho-dashboard/', PhoDashboardView.as_view(), name='pho-dashboard'),
    path('daily-report/', DailyVaccinationReportView.as_view(), name='daily-vaccination-report'),
]
