import type { ApiErrorPayload } from "@/features/auth/types";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

type ApiRequestOptions = RequestInit & {
  token?: string;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | unknown;

  constructor(status: number, payload: ApiErrorPayload | unknown) {
    super(readErrorMessage(payload) ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const error = payload as ApiErrorPayload;
  if (
    error.details &&
    typeof error.details === "object" &&
    "message" in error.details &&
    typeof error.details.message === "string"
  ) {
    return error.details.message;
  }

  if (error.message) {
    return error.message;
  }

  if (error.detail) {
    return error.detail;
  }

  if (Array.isArray(error.non_field_errors) && error.non_field_errors[0]) {
    return error.non_field_errors[0];
  }

  return undefined;
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function apiRequest<T>(
  path: string,
  { token, headers, body, ...options }: ApiRequestOptions = {},
) {
  const response = await fetch(buildUrl(path), {
    ...options,
    body,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
