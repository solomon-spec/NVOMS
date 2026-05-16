export type UserRole =
  | "ADMIN"
  | "HEALTH_WORKER"
  | "PUBLIC_HEALTH_OFFICIAL"
  | "PATIENT"
  | "CAREGIVER"
  | string;

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  facilityCode: string | null;
  mustChangePassword: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer" | string;
  expiresIn: number;
};

export type AuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type LoginResponse = AuthSession;

export type ChangePasswordResponse = {
  message: string;
  tokens: AuthTokens;
};

export type MeResponse = {
  user: AuthUser;
  profile: unknown;
};

export type ApiErrorPayload = {
  errorCode?: string;
  message?: string;
  detail?: string;
  details?: Record<string, unknown>;
  non_field_errors?: string[];
};
