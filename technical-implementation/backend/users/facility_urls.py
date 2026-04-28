from django.urls import path

from users.views import FacilityDetailView, FacilityListView

urlpatterns = [
    path('', FacilityListView.as_view(), name='facility-list'),
    path('<uuid:pk>', FacilityDetailView.as_view(), name='facility-detail'),
]
