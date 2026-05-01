from django.urls import path

from analytics.views import VaccineCoverageByRegionView, VaccineCoverageView

urlpatterns = [
    path('coverage/', VaccineCoverageView.as_view(), name='vaccine-coverage'),
    path('coverage/by-region/', VaccineCoverageByRegionView.as_view(), name='vaccine-coverage-by-region'),
]
