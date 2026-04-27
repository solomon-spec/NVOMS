from django.urls import path

from patients.views import CaregiverDetailView, CaregiverListView

urlpatterns = [
    path('', CaregiverListView.as_view(), name='caregiver-list'),
    path('<uuid:pk>', CaregiverDetailView.as_view(), name='caregiver-detail'),
]
