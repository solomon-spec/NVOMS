from django.urls import path

from analytics.views import (
    CoverageTrendView,
    DefaulterClusterView,
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
]
