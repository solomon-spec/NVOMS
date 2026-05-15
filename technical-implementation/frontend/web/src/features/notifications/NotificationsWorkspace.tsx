"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";
import type { AppNotification } from "@/services/notifications";
import { listNotifications, markAllRead, markNotificationRead } from "@/services/notifications";
import { SkeletonCard, useToast } from "@/shared/workspace-ui";

const typeIcons: Record<string, string> = {
  outbreak_confirmed: "🚨",
  vaccination_reminder: "💉",
  defaulter_alert: "⚠️",
  account_created: "👤",
  report_ready: "📄",
  system: "🔔",
};

export function NotificationsWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    listNotifications(token)
      .then((d) => { if (active) setNotifications(d.results ?? []); })
      .catch(() => {})
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function handleMarkRead(id: string) {
    try {
      const updated = await markNotificationRead(token, id);
      setNotifications((prev) => prev.map((n) => n.id === id ? updated : n));
    } catch { /* silent */ }
  }

  async function handleMarkAll() {
    setIsMarkingAll(true);
    try {
      await markAllRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      addToast("All notifications marked as read.", "success");
    } catch {
      addToast("Failed to mark all as read.", "error");
    } finally {
      setIsMarkingAll(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">Notifications</p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-3 inline-flex items-center rounded-full bg-error-100 px-2.5 py-0.5 text-xs font-semibold text-error-700 dark:bg-error-500/20 dark:text-error-300">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Vaccination reminders, outbreak alerts, and system updates.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isMarkingAll}
              onClick={handleMarkAll}
            >
              {isMarkingAll ? "Marking…" : "Mark all read"}
            </button>
          )}
        </div>
      </section>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-white/[0.02]">
          <span className="text-4xl">🔔</span>
          <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">No notifications yet</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Outbreak alerts, vaccination reminders, and system events will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex gap-4 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-white/[0.02] ${!n.is_read ? "bg-brand-25 dark:bg-brand-500/5" : ""}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl dark:bg-gray-800">
                  {typeIcons[n.type] ?? "🔔"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm ${n.is_read ? "text-gray-700 dark:text-gray-300" : "font-semibold text-gray-900 dark:text-white"}`}>
                      {n.title}
                    </p>
                    <time className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(n.created_at).toLocaleDateString()}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{n.body}</p>
                  {!n.is_read && (
                    <button
                      className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                      onClick={() => handleMarkRead(n.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
                {!n.is_read && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
