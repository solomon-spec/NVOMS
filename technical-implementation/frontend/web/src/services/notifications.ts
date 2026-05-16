import { apiRequest } from "@/services/api";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  linked_object_id: string | null;
}

export function listNotifications(token: string): Promise<{ results: AppNotification[]; count: number }> {
  return apiRequest("/notifications/", { method: "GET", token });
}

export function markNotificationRead(token: string, id: string): Promise<AppNotification> {
  return apiRequest(`/notifications/${id}/read/`, { method: "PATCH", token });
}

export function markAllRead(token: string): Promise<{ updated: number }> {
  return apiRequest("/notifications/mark-all-read/", { method: "POST", token });
}
