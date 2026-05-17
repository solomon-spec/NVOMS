"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import {
  getAdminDashboard,
  getDailyVaccinationReport,
  getHealthWorkerDashboard,
  getPublicHealthDashboard,
  getVaccineCoverage,
} from "@/services/analytics";
import { listSurveillanceReports, listOutbreakAlerts } from "@/services/outbreaks";
import { MetricCard, ProgressRing, SkeletonCard, AlertBanner, StatusPill } from "@/shared/workspace-ui";
import { formatRole } from "@/shared/format";

// ── Module cards ──────────────────────────────────────────────────────────────

const allModules = [
  {
    label: "Patient Registry",
    href: "/patients",
    description: "Register patients and manage operational records with minimum necessary identifiers.",
    icon: "PR",
    access: ["ADMIN", "HEALTH_WORKER"],
    color: "from-brand-500 to-brand-700",
  },
  {
    label: "Immunization",
    href: "/immunizations",
    description: "Review due and overdue schedule slots, then record vaccine doses for selected records.",
    icon: "IM",
    access: ["ADMIN", "HEALTH_WORKER"],
    color: "from-success-500 to-success-700",
  },
  {
    label: "Case Reports",
    href: "/outbreaks",
    description: "Submit case reports, manage follow-up actions, and review public health alerts.",
    icon: "OR",
    access: ["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"],
    color: "from-warning-500 to-warning-700",
  },
  {
    label: "Analytics",
    href: "/analytics",
    description: "View coverage rates, regional comparisons, and vaccination performance indicators.",
    icon: "AN",
    access: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
    color: "from-purple-500 to-purple-700",
  },
  {
    label: "Reports",
    href: "/reports",
    description: "Queue coverage, missed follow-up, and AEFI reports and download them as PDF or CSV.",
    icon: "RP",
    access: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
    color: "from-indigo-500 to-indigo-700",
  },
  {
    label: "Offline Sync",
    href: "/sync",
    description: "Register your device, submit data batches collected offline, and resolve conflicts.",
    icon: "OS",
    access: ["HEALTH_WORKER"],
    color: "from-teal-500 to-teal-700",
  },
  {
    label: "My Vaccination Record",
    href: "/my-patient",
    description: "View your personal vaccination history, upcoming appointments, and overdue alerts.",
    icon: "VC",
    access: ["PATIENT"],
    color: "from-pink-500 to-pink-700",
  },
  {
    label: "Admin Console",
    href: "/admin",
    description: "Manage users, roles, facilities, and administrative unit configurations.",
    icon: "AD",
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
  const [activeDefaulters, setActiveDefaulters] = useState<number | null>(null);
  const [dailyDoses, setDailyDoses] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [zeroDoseChildren, setZeroDoseChildren] = useState<number | null>(null);
  const [dashboardFacility, setDashboardFacility] = useState<string | null>(null);
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

        if (role === "ADMIN") {
          loads.push(
            getAdminDashboard(token).then((data) => {
              if (!active) return;
              setPatientCount(data.total_patients);
              setTotalUsers(data.total_users);
              setActiveDefaulters(data.active_defaulters);
            }).catch(() => {}),
          );
        }

        if (role === "HEALTH_WORKER") {
          loads.push(
            getHealthWorkerDashboard(token).then((data) => {
              if (!active) return;
              setPatientCount(data.total_patients);
              setDailyDoses(data.daily_doses_administered);
              setActiveDefaulters(data.defaulter_count);
              setDashboardFacility(data.facility_name);
            }).catch(() => {}),
          );
        }

        if (role === "PUBLIC_HEALTH_OFFICIAL") {
          loads.push(
            getPublicHealthDashboard(token).then((data) => {
              if (!active) return;
              setPatientCount(data.total_patients);
              setTotalAdministered(data.total_doses_administered);
              setActiveDefaulters(data.active_defaulters);
              setZeroDoseChildren(data.zero_dose_children);
            }).catch(() => {}),
          );
        }

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
            getDailyVaccinationReport(token).then((data) => {
              if (!active) return;
              setDailyDoses(data.total_doses);
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

      <section className="border border-[var(--nv-border)] bg-[var(--nv-surface)] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nv-muted)]">{today}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--nv-heading)] md:text-3xl">
              Welcome back,{" "}
              <span>
                {session?.user.displayName ?? "NVOMS User"}
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--nv-muted)]">
              {role
                ? `${formatRole(role)} access${session?.user.facilityCode ? ` · ${session.user.facilityCode}` : ""}`
                : "Loading workspace..."}
              {dashboardFacility ? ` · ${dashboardFacility}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${
                onlineStatus
                  ? "border-success-100 bg-success-50 text-success-700"
                  : "border-error-200 bg-error-50 text-error-700"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${onlineStatus ? "bg-success-600" : "bg-error-600"}`} />
              {onlineStatus ? "Online" : "Offline"}
            </div>
            <div className="rounded border border-[var(--nv-border)] bg-[var(--nv-panel)] px-3 py-2 text-sm font-semibold text-[var(--nv-heading)]">
              Authenticated
            </div>
          </div>
        </div>
      </section>

      {/* ── Confirmed outbreak alert banner ── */}
      {confirmedAlertCount > 0 && (
        <AlertBanner tone="error" count={confirmedAlertCount}>
          <strong>{confirmedAlertCount} confirmed public health alert{confirmedAlertCount > 1 ? "s" : ""}</strong>{" "}
          require immediate attention.{" "}
          <Link href="/outbreaks" className="underline underline-offset-2 hover:no-underline">
            Review in Case Reports
          </Link>
        </AlertBanner>
      )}

      {/* ── KPI tiles ── */}
      {(["ADMIN", "PUBLIC_HEALTH_OFFICIAL"].includes(role) || ["ADMIN", "HEALTH_WORKER"].includes(role)) && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--nv-muted)]">
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
                <div className="flex items-center gap-5 rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-4">
                  <ProgressRing
                    value={coveragePct}
                    tone={coveragePct >= 90 ? "success" : coveragePct >= 70 ? "warning" : "error"}
                    size={72}
                    strokeWidth={7}
                  />
                  <div>
                    <p className="text-sm text-[var(--nv-muted)]">Overall Coverage</p>
                    <p className="mt-1 text-xs text-[var(--nv-subtle)]">
                      {totalAdministered?.toLocaleString() ?? "—"} administered
                    </p>
                  </div>
                </div>
              )}
              {totalScheduled !== null && (
                <MetricCard
                  label="Scheduled Slots"
                  value={totalScheduled.toLocaleString()}
                  icon="SC"
                  tone="brand"
                />
              )}
              {patientCount !== null && (
                <MetricCard
                  label="Registered Patients"
                  value={patientCount.toLocaleString()}
                  icon="PT"
                  tone="success"
                />
              )}
              {totalUsers !== null && (
                <MetricCard
                  label="System Users"
                  value={totalUsers.toLocaleString()}
                  icon="US"
                  tone="brand"
                />
              )}
              {dailyDoses !== null && (
                <MetricCard
                  label="Doses Today"
                  value={dailyDoses.toLocaleString()}
                  icon="DO"
                  tone={dailyDoses > 0 ? "success" : "warning"}
                />
              )}
              {activeDefaulters !== null && (
                <MetricCard
                  label="Missed Follow-ups"
                  value={activeDefaulters.toLocaleString()}
                  icon="MF"
                  tone={activeDefaulters > 0 ? "warning" : "success"}
                />
              )}
              {zeroDoseChildren !== null && (
                <MetricCard
                  label="Zero-dose Children"
                  value={zeroDoseChildren.toLocaleString()}
                  icon="ZD"
                  tone={zeroDoseChildren > 0 ? "warning" : "success"}
                />
              )}
              {alertCount !== null && (
                <MetricCard
                  label="Public Health Alerts"
                  value={alertCount.toLocaleString()}
                  icon="AL"
                  tone={alertCount > 0 ? "error" : "success"}
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Module grid ── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--nv-muted)]">
          Your Workspace
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleModules.map((module) => (
            <Link
              key={module.label}
              href={module.href}
              className="group relative overflow-hidden rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-4 transition-colors hover:border-[var(--nv-primary)] hover:bg-[var(--nv-table-hover)]"
            >
              <div>
                <span className="inline-grid h-9 w-9 place-items-center rounded border border-[var(--nv-border)] bg-[var(--nv-panel)] text-xs font-bold text-[var(--nv-heading)]">
                  {module.icon}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-[var(--nv-heading)]">
                  {module.label}
                </h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-[var(--nv-muted)]">
                  {module.description}
                </p>
                <span className="mt-4 inline-flex text-xs font-semibold text-[var(--nv-primary)] group-hover:text-[var(--nv-primary-hover)]">
                  Open module
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--nv-muted)]">
              Recent Open Case Reports
            </h2>
            <Link
              href="/outbreaks"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View all
            </Link>
          </div>
          <div className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)]">
            <ul className="divide-y divide-[var(--nv-border-soft)]">
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
