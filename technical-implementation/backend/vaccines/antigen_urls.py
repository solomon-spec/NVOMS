from django.urls import path

from vaccines.views import AntigenDetailView, AntigenListView

urlpatterns = [
    path('', AntigenListView.as_view(), name='antigen-list'),
    path('<uuid:pk>', AntigenDetailView.as_view(), name='antigen-detail'),
]
