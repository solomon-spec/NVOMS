"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import { getVaccineCoverage } from "@/services/analytics";
import { listPatients } from "@/services/patients";
import { listSurveillanceReports, listOutbreakAlerts } from "@/services/surveillance";
import { MetricCard, ProgressRing, SkeletonCard, AlertBanner, StatusPill } from "@/shared/workspace-ui";
import { formatRole } from "@/shared/format";

// ── Module cards ──────────────────────────────────────────────────────────────

const allModules = [
  {
    label: "Patient Registry",
    href: "/patients",
    description: "Register patients and manage operational records with minimum necessary identifiers.",
    icon: "👤",
    access: ["ADMIN", "HEALTH_WORKER"],
    color: "from-brand-500 to-brand-700",
  },
  {
    label: "Immunization",
    href: "/immunizations",
    description: "Review due and overdue schedule slots, then record vaccine doses for selected records.",
    icon: "💉",
    access: ["ADMIN", "HEALTH_WORKER"],
    color: "from-success-500 to-success-700",
  },
  {
    label: "Surveillance",
    href: "/surveillance",
    description: "Submit surveillance reports, manage follow-up actions, and verify outbreak alerts.",
    icon: "🔬",
    access: ["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"],
    color: "from-warning-500 to-warning-700",
  },
  {
    label: "Analytics",
    href: "/analytics",
    description: "View coverage rates, regional comparisons, and vaccination performance indicators.",
    icon: "📊",
    access: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
    color: "from-purple-500 to-purple-700",
  },
  {
    label: "Reports",
    href: "/reports",
    description: "Queue coverage, defaulter, and AEFI reports and download them as PDF or CSV.",
    icon: "📄",
    access: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
    color: "from-indigo-500 to-indigo-700",
  },
  {
    label: "Offline Sync",
    href: "/sync",
    description: "Register your device, submit data batches collected offline, and resolve conflicts.",
    icon: "🔄",
    access: ["HEALTH_WORKER"],
    color: "from-teal-500 to-teal-700",
  },
  {
    label: "My Vaccination Record",
    href: "/my-patient",
    description: "View your personal vaccination history, upcoming appointments, and overdue alerts.",
    icon: "🗂️",
    access: ["PATIENT"],
    color: "from-pink-500 to-pink-700",
  },
  {
    label: "Admin Console",
    href: "/admin",
    description: "Manage users, roles, facilities, and administrative unit configurations.",
    icon: "⚙️",
    access: ["ADMIN"],
    color: "from-gray-600 to-gray-800",
  },
];

// ── Dashboard Home ────────────────────────────────────────────────────────────

export function DashboardHome() {
  const session = useAuthSession();
  const role = session?.user.role ?? "";
  const token = session?.tokens.accessToken ?? "";

  const visibleModules = allModules.filter((m) => m.access.includes(role));

  // Live KPI state
  const [coveragePct, setCoveragePct] = useState<number | null>(null);
  const [totalScheduled, setTotalScheduled] = useState<number | null>(null);
  const [totalAdministered, setTotalAdministered] = useState<number | null>(null);
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [confirmedAlertCount, setConfirmedAlertCount] = useState(0);
  const [recentReports, setRecentReports] = useState<Array<{ id: string; condition_type: string; status: string; onset_date: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);

  useEffect(() => {
    setOnlineStatus(navigator.onLine);
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function loadDashboard() {
      setIsLoading(true);
      try {
        const loads: Promise<void>[] = [];

        if (["ADMIN", "PUBLIC_HEALTH_OFFICIAL"].includes(role)) {
          loads.push(
            getVaccineCoverage(token).then((data) => {
              if (!active) return;
              setCoveragePct(data.summary.overall_coverage_pct);
              setTotalScheduled(data.summary.total_scheduled);
              setTotalAdministered(data.summary.total_administered);
            }).catch(() => {/* graceful — KPIs just won't show */}),
          );
          loads.push(
            listOutbreakAlerts(token, {}).then((data) => {
              if (!active) return;
              setAlertCount(data.length);
              setConfirmedAlertCount(data.filter((a) => a.status === "confirmed").length);
            }).catch(() => {}),
          );
        }

        if (["ADMIN", "HEALTH_WORKER"].includes(role)) {
          loads.push(
            listPatients(token).then((data) => {
              if (!active) return;
              setPatientCount(data.length);
            }).catch(() => {}),
          );
        }

        if (["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"].includes(role)) {
          loads.push(
            listSurveillanceReports(token, {}).then((data) => {
              if (!active) return;
              setRecentReports(
                data
                  .filter((r) => r.status !== "closed")
                  .slice(0, 5)
                  .map((r) => ({
                    id: r.id,
                    condition_type: r.condition_type,
                    status: r.status,
                    onset_date: r.onset_date,
                  })),
              );
            }).catch(() => {}),
          );
        }

        await Promise.allSettled(loads);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => { active = false; };
  }, [token, role]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">

      {/* ── Hero header ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-8 shadow-lg md:px-10 md:py-10">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-12 right-32 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-200">{today}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Welcome back,{" "}
              <span className="text-brand-100">
                {session?.user.displayName ?? "NVOMS User"}
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-200">
              {role
                ? `${formatRole(role)} access${session?.user.facilityCode ? ` · ${session.user.facilityCode}` : ""}`
                : "Loading workspace…"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Online / offline pill */}
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                onlineStatus
                  ? "bg-success-500/20 text-success-100"
                  : "bg-error-500/20 text-error-100"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${onlineStatus ? "bg-success-400" : "bg-error-400"}`} />
              {onlineStatus ? "Online" : "Offline"}
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              Authenticated
            </div>
          </div>
        </div>
      </section>

      {/* ── Confirmed outbreak alert banner ── */}
      {confirmedAlertCount > 0 && (
        <AlertBanner tone="error" count={confirmedAlertCount}>
          <strong>{confirmedAlertCount} confirmed outbreak alert{confirmedAlertCount > 1 ? "s" : ""}</strong>{" "}
          require immediate attention.{" "}
          <Link href="/surveillance" className="underline underline-offset-2 hover:no-underline">
            Review in Surveillance →
          </Link>
        </AlertBanner>
      )}

      {/* ── KPI tiles ── */}
      {(["ADMIN", "PUBLIC_HEALTH_OFFICIAL"].includes(role) || ["ADMIN", "HEALTH_WORKER"].includes(role)) && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Live Statistics
          </h2>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Coverage ring — PHO/Admin only */}
              {coveragePct !== null && (
                <div className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
                  <ProgressRing
                    value={coveragePct}
                    tone={coveragePct >= 90 ? "success" : coveragePct >= 70 ? "warning" : "error"}
                    size={72}
                    strokeWidth={7}
                  />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Overall Coverage</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {totalAdministered?.toLocaleString() ?? "—"} administered
                    </p>
                  </div>
                </div>
              )}
              {totalScheduled !== null && (
                <MetricCard
                  label="Scheduled Slots"
                  value={totalScheduled.toLocaleString()}
                  icon="📅"
                  tone="brand"
                />
              )}
              {patientCount !== null && (
                <MetricCard
                  label="Registered Patients"
                  value={patientCount.toLocaleString()}
                  icon="👤"
                  tone="success"
                />
              )}
              {alertCount !== null && (
                <MetricCard
                  label="Outbreak Alerts"
                  value={alertCount.toLocaleString()}
                  icon="🚨"
                  tone={alertCount > 0 ? "error" : "success"}
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Module grid ── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Your Workspace
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleModules.map((module) => (
            <Link
              key={module.label}
              href={module.href}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/30"
            >
              {/* Gradient accent */}
              <div
                className={`absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity ${module.color}`}
              />
              <div className="relative">
                <span className="text-3xl">{module.icon}</span>
                <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                  {module.label}
                </h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {module.description}
                </p>
                <span className="mt-4 inline-flex text-xs font-semibold text-brand-600 group-hover:text-brand-700 dark:text-brand-400">
                  Open module →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent surveillance activity ── */}
      {recentReports.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Recent Open Surveillance Reports
            </h2>
            <Link
              href="/surveillance"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View all →
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentReports.map((report, index) => (
                <li key={report.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {report.condition_type}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Onset {report.onset_date}
                    </p>
                  </div>
                  <StatusPill
                    label={formatRole(report.status)}
                    tone={
                      report.status === "closed"
                        ? "gray"
                        : report.status === "under_follow_up"
                          ? "warning"
                          : "brand"
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

    </div>
  );
}
