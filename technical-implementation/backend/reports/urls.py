from django.urls import path

from reports.views import (
    AefiReportView,
    CoverageReportView,
    DefaulterReportView,
    ReportDownloadView,
    ReportListView,
)

urlpatterns = [
    path('', ReportListView.as_view(), name='report-list'),
    path('defaulters', DefaulterReportView.as_view(), name='report-defaulters'),
    path('coverage', CoverageReportView.as_view(), name='report-coverage'),
    path('aefi', AefiReportView.as_view(), name='report-aefi'),
    path('<uuid:job_id>/download/', ReportDownloadView.as_view(), name='report-download-slash'),
    path('<uuid:job_id>/download', ReportDownloadView.as_view(), name='report-download'),
]
