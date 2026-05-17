import { apiRequest } from "@/services/api";

export interface AppNotification {
  id: string;
  notification_type: string;
  phone_number: string;
  status: "queued" | "sent" | "delivered" | "pending_retry" | "failed" | "cancelled" | string;
  caregiver: string;
  patient: string | null;
  message_body?: string;
  priority?: number;
  language_code?: string;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at?: string | null;
  created_at: string;
  last_error?: string | null;
  retry_count?: number;
  attempts?: Array<{
    id: string;
    attempt_number: number;
    attempted_at: string;
    gateway_status_code: number | null;
    gateway_response: unknown;
    attempt_status: string;
  }>;
}

function withQuery(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function listNotifications(
  token: string,
  filters: { status?: string; notification_type?: string; patient?: string } = {},
): Promise<AppNotification[]> {
  return apiRequest<AppNotification[]>(
    withQuery("/notifications/", {
      status: filters.status,
      notification_type: filters.notification_type,
      patient: filters.patient,
    }),
    { method: "GET", token },
  );
}

export function getNotification(token: string, id: string): Promise<AppNotification> {
  return apiRequest<AppNotification>(`/notifications/${id}/`, { method: "GET", token });
}

export function updateNotificationStatus(
  token: string,
  id: string,
  payload: { status: AppNotification["status"]; gateway_message_id?: string | null; last_error?: string | null },
): Promise<AppNotification> {
  return apiRequest<AppNotification>(`/notifications/${id}/status/`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}
