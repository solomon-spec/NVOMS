from django.urls import path

from users.views import RoleDetailView, RoleListView

urlpatterns = [
    path('', RoleListView.as_view(), name='role-list'),
    path('<uuid:pk>', RoleDetailView.as_view(), name='role-detail'),
]
