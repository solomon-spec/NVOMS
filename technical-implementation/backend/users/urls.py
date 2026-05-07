from django.urls import path

from users.views import (
    UserDetailView,
    UserListView,
    UserRoleAssignView,
    UserStatusView,
    UserUnlockView,
)

urlpatterns = [
    path('', UserListView.as_view(), name='user-list'),
    path('<uuid:pk>', UserDetailView.as_view(), name='user-detail'),
    path('<uuid:pk>/status', UserStatusView.as_view(), name='user-status'),
    path('<uuid:pk>/roles', UserRoleAssignView.as_view(), name='user-roles'),
    path('<uuid:pk>/unlock/', UserUnlockView.as_view(), name='user-unlock-slash'),
    path('<uuid:pk>/unlock', UserUnlockView.as_view(), name='user-unlock'),
]
