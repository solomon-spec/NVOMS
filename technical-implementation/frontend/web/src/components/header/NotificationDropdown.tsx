"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type { AppNotification } from "@/services/notifications";
import { listNotifications } from "@/services/notifications";
import { formatRole } from "@/shared/format";

import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

const attentionStatuses = new Set(["queued", "pending_retry", "failed"]);

export default function NotificationDropdown() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;

    listNotifications(token)
      .then((rows) => {
        if (active) setNotifications(rows.slice(0, 8));
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
  }, [token]);

  const needsAttention = useMemo(
    () => notifications.filter((item) => attentionStatuses.has(item.status)).length,
    [notifications],
  );

  function toggleDropdown() {
    setIsOpen((current) => !current);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        aria-label="Open notifications"
        className="dropdown-toggle relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {needsAttention > 0 ? (
          <span className="absolute -right-1 -top-1 z-10 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">
            {needsAttention > 9 ? "9+" : needsAttention}
          </span>
        ) : null}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-4 flex max-h-[520px] w-[350px] flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[380px] lg:right-0"
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <div>
            <h5 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Notification Delivery
            </h5>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              SMS reminders and operational messages
            </p>
          </div>
          <button
            aria-label="Close notifications"
            className="dropdown-toggle text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={toggleDropdown}
          >
            <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading delivery activity...
            </li>
          ) : notifications.length === 0 ? (
            <li className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No messages yet</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Reminder and SMS delivery activity will appear here.
              </p>
            </li>
          ) : (
            notifications.map((notification) => (
              <li key={notification.id}>
                <DropdownItem
                  tag="a"
                  href="/notifications"
                  onItemClick={closeDropdown}
                  className="flex gap-3 rounded-lg border-b border-gray-100 px-4 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <span className={`mt-1 block h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(notification.status)}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                      {formatRole(notification.notification_type)}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                      {notification.message_body ?? `Message to ${notification.phone_number}`}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatRole(notification.status)}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-400" />
                      <span>{formatDateTime(notification.created_at)}</span>
                    </span>
                  </span>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>

        <Link
          href="/notifications"
          className="mt-3 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={closeDropdown}
        >
          View notification center
        </Link>
      </Dropdown>
    </div>
  );
}

function statusDot(status: string) {
  if (status === "delivered" || status === "sent") return "bg-success-500";
  if (status === "failed" || status === "cancelled") return "bg-error-500";
  if (status === "pending_retry" || status === "queued") return "bg-warning-500";
  return "bg-gray-400";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
