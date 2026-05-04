import type {
  AuthSession,
  ChangePasswordResponse,
  LoginResponse,
  MeResponse,
} from "@/features/auth/types";
import { apiRequest } from "@/services/api";

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function changePassword(params: {
  currentPassword: string;
  newPassword: string;
  accessToken: string;
}) {
  return apiRequest<ChangePasswordResponse>("/auth/change-password", {
    method: "POST",
    token: params.accessToken,
    body: JSON.stringify({
      currentPassword: params.currentPassword,
      newPassword: params.newPassword,
    }),
  });
}

export function fetchMe(accessToken: string) {
  return apiRequest<MeResponse>("/auth/me", {
    method: "GET",
    token: accessToken,
  });
}

export function logout(session: AuthSession) {
  return apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
    token: session.tokens.accessToken,
    body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<{ detail: string }>("/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function confirmPasswordReset(token: string, new_password: string) {
  return apiRequest<{ detail: string }>("/auth/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });
}
