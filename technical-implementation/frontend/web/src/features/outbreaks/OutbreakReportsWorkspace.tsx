"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type { AdministrativeUnitBrief, Patient } from "@/features/registry/types";
import type {
  AlertStatus,
  OutbreakAlert,
  SurveillanceCategory,
  SurveillanceReport,
  SurveillanceReportStatus,
  SurveillanceSeverity,
} from "@/features/outbreaks/types";
import { ApiError } from "@/services/api";
import {
  listAdministrativeUnits,
  listPatients,
} from "@/services/patients";
import {
  listOutbreakAlerts,
  listSurveillanceReports,
} from "@/services/outbreaks";
import { formatRole } from "@/shared/format";
import {
  AlertBanner,
  EmptyState,
  InlineError,
  MetricCard,
  StatusPill,
} from "@/shared/workspace-ui";

const categoryOptions: Array<{
  label: string;
  value: SurveillanceCategory | "all";
}> = [
  { label: "All categories", value: "all" },
  { label: "AEFI", value: "aefi" },
  { label: "Suspected disease", value: "symptom" },
  { label: "Lab follow-up", value: "lab_follow_up" },
];

const reportStatusOptions: Array<{
  label: string;
  value: SurveillanceReportStatus | "all";
}> = [
  { label: "All statuses", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Queued", value: "queued" },
  { label: "Under follow-up", value: "under_follow_up" },
  { label: "Closed", value: "closed" },
];

const alertStatusOptions: Array<{ label: string; value: AlertStatus | "all" }> =
  [
    { label: "All alert statuses", value: "all" },
    { label: "Potential", value: "potential" },
    { label: "Under review", value: "under_review" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Dismissed", value: "dismissed" },
    { label: "False alarm", value: "false_alarm" },
  ];

export function OutbreakReportsWorkspace() {
  const session = useAuthSession();
  const router = useRouter();
  const role = session?.user.role ?? "";
  const canManageReports = role === "ADMIN" || role === "HEALTH_WORKER";
  const token = session?.tokens.accessToken ?? "";

  const [reports, setReports] = useState<SurveillanceReport[]>([]);
  const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [units, setUnits] = useState<AdministrativeUnitBrief[]>([]);
  
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SurveillanceCategory | "all">("all");
  const [status, setStatus] = useState<SurveillanceReportStatus | "all">("all");
  const [alertStatus, setAlertStatus] = useState<AlertStatus | "all">("all");
  const [alertDisease, setAlertDisease] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  
  const unitMap = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );

  useEffect(() => {
    let isActive = true;

    async function loadWorkspace() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      try {
        const [reportRows, alertRows, unitRows, patientRows] = await Promise.all([
          listSurveillanceReports(token, {
            search,
            category,
            status,
          }),
          listOutbreakAlerts(token, {
            status: alertStatus,
            disease: alertDisease,
          }),
          listAdministrativeUnits(token),
          canManageReports ? listPatients(token) : Promise.resolve([]),
        ]);

        if (!isActive) {
          return;
        }

        setReports(reportRows);
        setAlerts(alertRows);
        setUnits(unitRows);
        setPatients(patientRows);
        setError("");
      } catch (caughtError) {
        if (isActive) {
          setError(readApiError(caughtError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadWorkspace, 180);
    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [
    alertDisease,
    alertStatus,
    canManageReports,
    category,
    reloadKey,
    search,
    status,
    token,
  ]);

  const metrics = useMemo(() => {
    const activeCases = reports.filter((report) => report.status !== "closed").length;
    const highSeverity = reports.filter((report) =>
      ["high", "critical"].includes(report.severity ?? ""),
    ).length;
    const followUpRequired = reports.filter(
      (report) => report.follow_up_required,
    ).length;
    const confirmedAlerts = alerts.filter(
      (alert) => alert.status === "confirmed",
    ).length;

    return [
      { label: "Reports", value: String(reports.length) },
      { label: "Active cases", value: String(activeCases) },
      { label: "Needs follow-up", value: String(followUpRequired) },
      { label: "High severity", value: String(highSeverity) },
      { label: "Visible alerts", value: String(alerts.length) },
      { label: "Confirmed alerts", value: String(confirmedAlerts) },
    ];
  }, [alerts, reports]);

  async function refreshWorkspace() {
    setReloadKey((current) => current + 1);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Case Reports
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Manage case reports and follow-up actions
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Review AEFI and suspected vaccine-preventable disease cases,
              track follow-up work, and keep case status clear.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isLoading}
              type="button"
              onClick={refreshWorkspace}
            >
              Refresh
            </button>
            {canManageReports ? (
              <Link
                href="/outbreaks/new"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700"
              >
                New report
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </section>

      {/* Confirmed outbreak alert banner */}
      {alerts.filter((a) => a.status === "confirmed").length > 0 && (
        <AlertBanner
          tone="error"
          count={alerts.filter((a) => a.status === "confirmed").length}
        >
          <strong>
            {alerts.filter((a) => a.status === "confirmed").length} confirmed public health alert
            {alerts.filter((a) => a.status === "confirmed").length > 1 ? "s" : ""}
          </strong>{" "}
          — immediate public health action is required. Review the alerts below.
        </AlertBanner>
      )}

      {error ? <InlineError message={error} /> : null}

      <section className="grid gap-6 xl:grid-cols-2">
        {/* Reports Queue */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active reports
            </h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <input
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Search condition, disease, or patient name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as SurveillanceCategory | "all")
                }
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as SurveillanceReportStatus | "all")
                }
              >
                {reportStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto p-3">
            {isLoading ? (
              <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                Loading case reports...
              </p>
            ) : reports.length ? (
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    className={`w-full rounded-xl border border-l-4 border-gray-200 bg-white p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:bg-brand-500/10 ${severityBorderClass(report.severity)}`}
                    key={report.id}
                    type="button"
                    onClick={() => router.push(`/outbreaks/${report.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {report.condition_type}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {patientLabel(report.patient, patientMap)} - onset{" "}
                          {report.onset_date}
                        </p>
                      </div>
                      <StatusPill
                        label={formatRole(report.status)}
                        tone={reportStatusTone(report.status)}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill label={formatRole(report.surveillance_category)} />
                      {report.severity ? (
                        <StatusPill
                          label={formatRole(report.severity)}
                          tone={severityTone(report.severity)}
                        />
                      ) : null}
                      {report.follow_up_required ? (
                        <StatusPill label="Follow-up" tone="warning" />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState>No case reports match the current filters.</EmptyState>
            )}
          </div>
        </div>

        {/* Alerts Queue */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Public health alerts
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <input
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Disease filter"
                value={alertDisease}
                onChange={(e) => setAlertDisease(e.target.value)}
              />
              <select
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={alertStatus}
                onChange={(event) =>
                  setAlertStatus(event.target.value as AlertStatus | "all")
                }
              >
                {alertStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto p-3">
            {isLoading ? (
              <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                Loading alerts...
              </p>
            ) : alerts.length ? (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left dark:border-gray-800 dark:bg-white/[0.02]"
                    key={alert.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {alert.disease_code}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {unitLabel(alert.unit, unitMap)} -{" "}
                          {formatDateTime(alert.triggered_at)}
                        </p>
                      </div>
                      <StatusPill
                        label={formatRole(alert.status)}
                        tone={alertStatusTone(alert.status)}
                      />
                    </div>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      Source {formatRole(alert.alert_source)} - risk{" "}
                      {formatRisk(alert.risk_probability)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No public health alerts match the current filters.</EmptyState>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// Helpers
function patientLabel(patientId: string, patientMap: Map<string, Patient>) {
  const patient = patientMap.get(patientId);
  return patient ? patient.full_name : `Patient ${shortId(patientId)}`;
}

function unitLabel(unitId: string, unitMap: Map<string, AdministrativeUnitBrief>) {
  const unit = unitMap.get(unitId);
  return unit ? `${unit.name} (${unit.code})` : `Unit ${shortId(unitId)}`;
}

function reportStatusTone(status: SurveillanceReportStatus) {
  if (status === "closed") return "success";
  if (status === "under_follow_up") return "warning";
  return "brand";
}

function severityTone(severity: SurveillanceSeverity) {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "moderate") return "warning";
  return "success";
}

function severityBorderClass(severity: SurveillanceSeverity | null | undefined): string {
  if (severity === "critical") return "border-l-error-600";
  if (severity === "high") return "border-l-orange-500";
  if (severity === "moderate") return "border-l-warning-400";
  return "border-l-transparent";
}

function alertStatusTone(status: AlertStatus) {
  if (status === "confirmed") return "error";
  if (status === "dismissed" || status === "false_alarm") return "success";
  if (status === "under_review") return "warning";
  return "brand";
}

function formatRisk(value: string | null) {
  if (!value) return "Not scored";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  return `${Math.round(numeric * 100)}%`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function readApiError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Could not reach the backend. Confirm the API is running on port 8000.";
}
