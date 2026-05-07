from django.urls import path

from notifications.views import SmsLogListView

urlpatterns = [
    path('', SmsLogListView.as_view(), name='sms-log-list'),
]
