from django.urls import path

from integrations.views import Dhis2SyncView

urlpatterns = [
    path('sync/', Dhis2SyncView.as_view(), name='dhis2-sync'),
]
