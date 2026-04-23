from django.urls import path

from authentication.views import (
    ChangePasswordAPIView,
    LoginAPIView,
    LogoutAllAPIView,
    LogoutAPIView,
    MeAPIView,
    RefreshAPIView,
)

urlpatterns = [
    path("login", LoginAPIView.as_view(), name="auth-login"),
    path("refresh", RefreshAPIView.as_view(), name="auth-refresh"),
    path("logout", LogoutAPIView.as_view(), name="auth-logout"),
    path("logout-all", LogoutAllAPIView.as_view(), name="auth-logout-all"),
    path("me", MeAPIView.as_view(), name="auth-me"),
    path("change-password", ChangePasswordAPIView.as_view(), name="auth-change-password"),
]
