from django.urls import path

from core.views import AuditLogListView

urlpatterns = [
    path('', AuditLogListView.as_view(), name='audit-log-list'),
]
