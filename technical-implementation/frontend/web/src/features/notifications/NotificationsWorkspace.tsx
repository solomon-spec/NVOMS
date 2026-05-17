"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type { AppNotification } from "@/services/notifications";
import { listNotifications } from "@/services/notifications";
import { formatRole } from "@/shared/format";
import { EmptyState, MetricCard, SkeletonCard, StatusPill } from "@/shared/workspace-ui";

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Queued", value: "queued" },
  { label: "Sent", value: "sent" },
  { label: "Delivered", value: "delivered" },
  { label: "Retry", value: "pending_retry" },
  { label: "Failed", value: "failed" },
];

export function NotificationsWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [status, setStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let active = true;

    listNotifications(token, { status })
      .then((rows) => {
        if (active) setNotifications(rows);
      })
      .catch(() => {
        if (active) setNotifications([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, status]);

  const metrics = useMemo(() => {
    const delivered = notifications.filter((item) => item.status === "delivered").length;
    const active = notifications.filter((item) => ["queued", "pending_retry"].includes(item.status)).length;
    const failed = notifications.filter((item) => item.status === "failed").length;
    return { delivered, active, failed };
  }, [notifications]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Notification Center
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              SMS Delivery Activity
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Review vaccination reminders, manual follow-up messages, and SMS gateway delivery status.
            </p>
          </div>
          <label className="block min-w-44">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
            </span>
            <select
              className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              value={status}
              onChange={(event) => {
                setIsLoading(true);
                setStatus(event.target.value);
              }}
            >
              {statusFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Visible Messages" value={String(notifications.length)} icon="SMS" tone="brand" />
        <MetricCard label="Delivered" value={String(metrics.delivered)} icon="OK" tone="success" />
        <MetricCard label="Queued or Retry" value={String(metrics.active)} icon="WAIT" tone="warning" />
        <MetricCard label="Failed" value={String(metrics.failed)} icon="ERR" tone={metrics.failed ? "error" : "success"} />
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonCard key={item} lines={2} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="SMS">
          No notification delivery records match the selected filter.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notification) => (
              <li key={notification.id} className="px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatRole(notification.notification_type)}
                      </p>
                      <StatusPill label={formatRole(notification.status)} tone={statusTone(notification.status)} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {notification.message_body ?? "Message body not available in list response."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>Phone: {notification.phone_number}</span>
                      <span>Created: {formatDateTime(notification.created_at)}</span>
                      {notification.scheduled_for ? <span>Scheduled: {formatDateTime(notification.scheduled_for)}</span> : null}
                      {notification.sent_at ? <span>Sent: {formatDateTime(notification.sent_at)}</span> : null}
                    </div>
                    {notification.last_error ? (
                      <p className="mt-2 rounded-lg bg-error-50 px-3 py-2 text-xs text-error-700 dark:bg-error-500/10 dark:text-error-200">
                        {notification.last_error}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function statusTone(status: string): "success" | "warning" | "error" | "gray" | "brand" {
  if (status === "delivered" || status === "sent") return "success";
  if (status === "queued" || status === "pending_retry") return "warning";
  if (status === "failed" || status === "cancelled") return "error";
  return "gray";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
