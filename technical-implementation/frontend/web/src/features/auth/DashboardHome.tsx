"use client";

import Link from "next/link";

import { useAuthSession } from "@/features/auth/useAuthSession";
import { formatRole } from "@/shared/format";

const operationalCards = [
  {
    label: "Patient Registry",
    href: "/patients",
    value: "Register and search patient records",
    access: ["ADMIN", "HEALTH_WORKER"],
  },
  {
    label: "My Patient Record",
    href: "/my-patient",
    value: "View your immunization summary, schedule, and dose history",
    access: ["PATIENT"],
  },
  {
    label: "Immunization",
    href: "/immunizations",
    value: "Review schedules and record doses",
    access: ["ADMIN", "HEALTH_WORKER"],
  },
  {
    label: "Surveillance",
    href: "/surveillance",
    value: "Monitor reports and outbreak alerts",
    access: ["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    value: "Track coverage and risk signals",
    access: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    label: "Reports",
    href: "/reports",
    value: "Queue coverage, defaulter, and AEFI reports",
    access: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
  },
];

export function DashboardHome() {
  const session = useAuthSession();
  const visibleCards = operationalCards.filter((card) =>
    card.access.includes(session?.user.role ?? ""),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Workspace
        </p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-3xl">
              Welcome back, {session?.user.displayName ?? "NVOMS user"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              {session
                ? `${formatRole(session.user.role)} access${
                    session.user.facilityCode
                      ? ` for ${session.user.facilityCode}`
                      : ""
                  }.`
                : "Loading workspace access."}
            </p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
            Authenticated session
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((card) => (
          <Link
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/30"
            href={card.href}
            key={card.label}
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {card.label}
            </p>
            <p className="mt-3 min-h-12 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {card.value}
            </p>
            <span className="mt-5 inline-flex text-sm font-semibold text-brand-600 group-hover:text-brand-700 dark:text-brand-400">
              Open module
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
