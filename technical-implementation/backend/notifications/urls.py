from django.urls import path

from notifications.views import (
    NotificationDetailView,
    NotificationListView,
    NotificationStatusView,
    TemplateListView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<uuid:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('<uuid:pk>/status/', NotificationStatusView.as_view(), name='notification-status'),
    path('templates/', TemplateListView.as_view(), name='notification-templates'),
]
