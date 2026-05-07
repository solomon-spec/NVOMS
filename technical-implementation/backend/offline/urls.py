from django.urls import path

from offline.views import (
    DeviceDetailView,
    DeviceListView,
    SyncBatchDetailView,
    SyncBatchItemListView,
    SyncBatchItemResolveView,
    SyncBatchSubmitView,
    SyncConfigView,
    SyncReferenceDataView,
)

urlpatterns = [
    # Device registration
    path('devices', DeviceListView.as_view(), name='device-list'),
    path('devices/<uuid:pk>', DeviceDetailView.as_view(), name='device-detail'),
    # Sync batch submission and status
    path('sync/batches/', SyncBatchSubmitView.as_view(), name='sync-batch-submit-slash'),
    path('sync/batches', SyncBatchSubmitView.as_view(), name='sync-batch-submit'),
    path('sync/batches/<uuid:pk>/', SyncBatchDetailView.as_view(), name='sync-batch-detail'),
    path('sync/batches/<uuid:pk>/items', SyncBatchItemListView.as_view(), name='sync-batch-items'),
    path('sync/batches/<uuid:pk>/items/<uuid:item_id>/resolve', SyncBatchItemResolveView.as_view(), name='sync-item-resolve'),
    # Sync configuration and reference data
    path('sync/config', SyncConfigView.as_view(), name='sync-config'),
    path('sync/reference-data', SyncReferenceDataView.as_view(), name='sync-reference-data'),
]
