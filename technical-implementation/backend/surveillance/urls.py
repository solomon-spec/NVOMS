from django.urls import path

from surveillance.views import FollowUpListView, SurveillanceReportDetailView, SurveillanceReportListView

urlpatterns = [
    path('', SurveillanceReportListView.as_view(), name='surveillance-list'),
    path('<uuid:pk>/', SurveillanceReportDetailView.as_view(), name='surveillance-detail'),
    path('<uuid:pk>/follow-ups', FollowUpListView.as_view(), name='surveillance-followups'),
]
