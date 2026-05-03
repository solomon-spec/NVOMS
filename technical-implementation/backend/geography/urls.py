from django.urls import path

from geography.views import AdministrativeUnitDetailView, AdministrativeUnitListView

urlpatterns = [
    path('', AdministrativeUnitListView.as_view(), name='administrative-unit-list'),
    path('<uuid:pk>/', AdministrativeUnitDetailView.as_view(), name='administrative-unit-detail-slash'),
    path('<uuid:pk>', AdministrativeUnitDetailView.as_view(), name='administrative-unit-detail'),
]
