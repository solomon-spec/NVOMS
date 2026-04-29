from django.urls import path

from surveillance.views import OutbreakAlertListView, OutbreakAlertStatusView

urlpatterns = [
    path('', OutbreakAlertListView.as_view(), name='alert-list'),
    path('<uuid:pk>/status', OutbreakAlertStatusView.as_view(), name='alert-status'),
]
