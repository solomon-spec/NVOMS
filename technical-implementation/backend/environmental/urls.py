from django.urls import path

from environmental.views import MeteorologicalObservationListCreateView

urlpatterns = [
    path('observations/', MeteorologicalObservationListCreateView.as_view(), name='environmental-observations'),
]
