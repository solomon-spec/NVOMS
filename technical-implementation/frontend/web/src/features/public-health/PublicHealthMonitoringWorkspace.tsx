"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { PageHeader } from "@/components/layout/PageHeader";
import type {
  DefaulterClusterRow,
  ReportingGapRow,
  RiskScoreRow,
} from "@/features/analytics/types";
import type { AdministrativeUnitBrief } from "@/features/registry/types";
import type { OutbreakAlert } from "@/features/surveillance/types";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { AlertIcon, ArrowRightIcon, CheckCircleIcon, GroupIcon, PieChartIcon, TaskIcon } from "@/icons";
import { getDefaulterClusters, getReportingGaps, getRiskScores, runPrediction } from "@/services/analytics";
import { listAdministrativeUnits } from "@/services/patients";
import { listOutbreakAlerts } from "@/services/surveillance";
import { formatRole } from "@/shared/format";
import {
  AlertBanner,
  EmptyState,
  InlineError,
  MetricCard,
  SelectInput,
  SkeletonCard,
  StatusPill,
  TextInput,
  useToast,
} from "@/shared/workspace-ui";

type MonitoringLoadState = {
  riskScores: RiskScoreRow[];
  gaps: ReportingGapRow[];
  alerts: OutbreakAlert[];
  units: AdministrativeUnitBrief[];
};

type RiskFilters = {
  unit_id: string;
  disease: string;
  threshold_days: string;
};

type DefaulterFilters = {
  unit_id: string;
  min_defaulters: string;
};

const riskFilterDefaults: RiskFilters = {
  unit_id: "",
  disease: "",
  threshold_days: "14",
};

const defaulterFilterDefaults: DefaulterFilters = {
  unit_id: "",
  min_defaulters: "1",
};

function fmt(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function scorePercent(value: number) {
  const normalized = value > 1 ? value : value * 100;
  return Math.round(normalized);
}

function riskTone(value: number): "success" | "warning" | "error" {
  const percent = scorePercent(value);
  if (percent >= 70) return "error";
  if (percent >= 40) return "warning";
  return "success";
}

function coverageTone(value: number): "success" | "warning" | "error" {
  if (value >= 90) return "success";
  if (value >= 70) return "warning";
  return "error";
}

function alertTone(status: OutbreakAlert["status"]): "brand" | "success" | "warning" | "error" | "gray" {
  if (status === "confirmed") return "error";
  if (status === "under_review" || status === "potential") return "warning";
  if (status === "dismissed" || status === "false_alarm") return "gray";
  return "brand";
}

function unitLabel(unitId: string, unitMap: Map<string, AdministrativeUnitBrief>) {
  const unit = unitMap.get(unitId);
  return unit ? `${unit.name} (${formatRole(unit.level)})` : unitId;
}

function normalizeThreshold(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 14;
}

function normalizeMinDefaulters(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "1";
}

function ButtonIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current [&>svg]:h-5 [&>svg]:w-5">
      {children}
    </span>
  );
}

export function RiskMapWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const { addToast } = useToast();

  const [data, setData] = useState<MonitoringLoadState>({
    alerts: [],
    gaps: [],
    riskScores: [],
    units: [],
  });
  const [filters, setFilters] = useState<RiskFilters>(riskFilterDefaults);
  const [appliedFilters, setAppliedFilters] = useState<RiskFilters>(riskFilterDefaults);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningPrediction, setIsRunningPrediction] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;

    let active = true;

    Promise.allSettled([
      getRiskScores(token, {
        unit_id: appliedFilters.unit_id || undefined,
        disease: appliedFilters.disease || undefined,
      }),
      getReportingGaps(token, normalizeThreshold(appliedFilters.threshold_days)),
      listOutbreakAlerts(token, {}),
      listAdministrativeUnits(token),
    ])
      .then(([riskScores, gaps, alerts, units]) => {
        if (!active) return;

        setData((current) => ({
          riskScores: riskScores.status === "fulfilled" ? riskScores.value : current.riskScores,
          gaps: gaps.status === "fulfilled" ? gaps.value : current.gaps,
          alerts: alerts.status === "fulfilled" ? alerts.value : current.alerts,
          units: units.status === "fulfilled" ? units.value : current.units,
        }));

        const rejected = [riskScores, gaps, alerts, units].find((result) => result.status === "rejected");
        if (rejected?.status === "rejected") {
          setError("Some monitoring data could not be loaded. Refresh after confirming the backend is running.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters, reloadKey, token]);

  const unitMap = useMemo(
    () => new Map(data.units.map((unit) => [unit.id, unit])),
    [data.units],
  );

  const sortedRisks = useMemo(
    () => [...data.riskScores].sort((a, b) => b.risk_score - a.risk_score),
    [data.riskScores],
  );

  const highRiskScores = sortedRisks.filter((row) => scorePercent(row.risk_score) >= 70);
  const confirmedAlerts = data.alerts.filter((alert) => alert.status === "confirmed");
  const criticalGaps = data.gaps.filter((gap) => gap.days_since_last_report > 14);
  const selectedUnit =
    appliedFilters.unit_id && data.units.find((unit) => unit.id === appliedFilters.unit_id);

  const metrics = [
    {
      label: "High-risk areas",
      value: fmt(highRiskScores.length),
      detail: `${fmt(sortedRisks.length)} scored areas`,
      icon: <AlertIcon />,
      tone: highRiskScores.length ? "error" : "success",
    },
    {
      label: "Silent districts",
      value: fmt(criticalGaps.length),
      detail: `${normalizeThreshold(appliedFilters.threshold_days)} day threshold`,
      icon: <PieChartIcon />,
      tone: criticalGaps.length ? "warning" : "success",
    },
    {
      label: "Confirmed alerts",
      value: fmt(confirmedAlerts.length),
      detail: `${fmt(data.alerts.length)} visible alerts`,
      icon: <TaskIcon />,
      tone: confirmedAlerts.length ? "error" : "success",
    },
    {
      label: "Monitoring scope",
      value: selectedUnit ? selectedUnit.name : "National",
      detail: selectedUnit ? formatRole(selectedUnit.level) : `${fmt(data.units.length)} active units`,
      icon: <GroupIcon />,
      tone: "brand",
    },
  ] as const;

  async function handleRunPrediction() {
    if (!token) return;

    setIsRunningPrediction(true);
    try {
      await runPrediction(token);
      addToast("Prediction run completed or queued.", "success");
      setIsLoading(true);
      setReloadKey((key) => key + 1);
    } catch {
      addToast("Prediction run could not be started.", "error");
    } finally {
      setIsRunningPrediction(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PUBLIC_HEALTH_OFFICIAL"]}>
      <div className="space-y-6">
        <PageHeader
          title="Risk Map"
          description="Monitor outbreak risk scores, silent districts, and active alerts across reporting units."
          actions={
            <>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                disabled={isLoading}
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setError("");
                  setReloadKey((key) => key + 1);
                }}
              >
                Refresh
              </button>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-700 disabled:opacity-60"
                disabled={isRunningPrediction}
                type="button"
                onClick={handleRunPrediction}
              >
                <ButtonIcon>
                  <PieChartIcon />
                </ButtonIcon>
                {isRunningPrediction ? "Running..." : "Run prediction"}
              </button>
            </>
          }
        />

        {confirmedAlerts.length > 0 ? (
          <AlertBanner tone="error" count={confirmedAlerts.length}>
            <strong>{confirmedAlerts.length} confirmed outbreak alert{confirmedAlerts.length === 1 ? "" : "s"}</strong>{" "}
            need public health review. Open Surveillance to verify linked reports and response status.
          </AlertBanner>
        ) : null}

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <form
            className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_220px_auto]"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              setIsLoading(true);
              setError("");
              setAppliedFilters(filters);
            }}
          >
            <SelectInput
              label="Administrative unit"
              value={filters.unit_id}
              options={[
                { label: "National view", value: "" },
                ...data.units.map((unit) => ({
                  label: `${unit.name} (${formatRole(unit.level)})`,
                  value: unit.id,
                })),
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, unit_id: value }))}
            />
            <TextInput
              label="Disease"
              placeholder="Measles, cholera..."
              value={filters.disease}
              onChange={(value) => setFilters((current) => ({ ...current, disease: value }))}
            />
            <TextInput
              label="Silent after days"
              type="number"
              value={filters.threshold_days}
              onChange={(value) => setFilters((current) => ({ ...current, threshold_days: value }))}
            />
            <div className="flex items-end gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                type="submit"
              >
                Apply
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setError("");
                  setFilters(riskFilterDefaults);
                  setAppliedFilters(riskFilterDefaults);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        {error ? <InlineError message={error} /> : null}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <SkeletonCard key={item} lines={2} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                detail={metric.detail}
                icon={<ButtonIcon>{metric.icon}</ButtonIcon>}
                label={metric.label}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Operational risk board</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Scores are sorted by highest outbreak probability for field prioritization.
                </p>
              </div>
              <StatusPill label={`${sortedRisks.length} scored`} tone="brand" />
            </div>

            {isLoading ? (
              <SkeletonCard lines={6} />
            ) : sortedRisks.length === 0 ? (
              <EmptyState icon="!">No risk scores are available. Run prediction or seed demo monitoring data.</EmptyState>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {sortedRisks.slice(0, 18).map((row) => {
                  const percent = scorePercent(row.risk_score);
                  const tone = riskTone(row.risk_score);
                  return (
                    <article
                      key={`${row.unit_id}-${row.disease}-${row.computed_at}`}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {row.unit_name}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {formatRole(row.disease)}
                          </p>
                        </div>
                        <StatusPill label={`${percent}%`} tone={tone} />
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-800">
                        <div
                          className={
                            tone === "error"
                              ? "h-full rounded-full bg-error-500"
                              : tone === "warning"
                                ? "h-full rounded-full bg-warning-500"
                                : "h-full rounded-full bg-success-500"
                          }
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{unitLabel(row.unit_id, unitMap)}</span>
                        <span>{formatDate(row.computed_at)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <MonitoringList
              emptyText="All districts are reporting within the selected threshold."
              heading="Silent districts"
              rows={criticalGaps.slice(0, 8).map((gap) => ({
                key: gap.unit_id,
                label: gap.unit_name,
                meta: `${formatRole(gap.level)} - ${gap.days_since_last_report} days silent`,
                tone: gap.days_since_last_report > 21 ? "error" : "warning",
                badge: `${gap.days_since_last_report}d`,
              }))}
            />
            <MonitoringList
              emptyText="No active outbreak alerts match the current backend data."
              heading="Active alerts"
              rows={data.alerts.slice(0, 8).map((alert) => ({
                key: alert.id,
                label: `${formatRole(alert.disease_code)} in ${unitLabel(alert.unit, unitMap)}`,
                meta: `${formatRole(alert.alert_source)} - ${formatDate(alert.triggered_at)}`,
                tone: alertTone(alert.status),
                badge: formatRole(alert.status),
              }))}
            />
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Response handoff</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Surveillance remains the operational queue for reviewing reports and confirming alert status.
              </p>
            </div>
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              href="/surveillance"
            >
              Open Surveillance
              <ButtonIcon>
                <ArrowRightIcon />
              </ButtonIcon>
            </Link>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}

export function DefaulterClustersWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";

  const [clusters, setClusters] = useState<DefaulterClusterRow[]>([]);
  const [units, setUnits] = useState<AdministrativeUnitBrief[]>([]);
  const [filters, setFilters] = useState<DefaulterFilters>(defaulterFilterDefaults);
  const [appliedFilters, setAppliedFilters] = useState<DefaulterFilters>(defaulterFilterDefaults);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;

    let active = true;

    Promise.allSettled([
      getDefaulterClusters(token, {
        unit_id: appliedFilters.unit_id || undefined,
        min_defaulters: normalizeMinDefaulters(appliedFilters.min_defaulters),
      }),
      listAdministrativeUnits(token),
    ])
      .then(([clusterResult, unitResult]) => {
        if (!active) return;

        if (clusterResult.status === "fulfilled") setClusters(clusterResult.value);
        if (unitResult.status === "fulfilled") setUnits(unitResult.value);

        if (clusterResult.status === "rejected" || unitResult.status === "rejected") {
          setError("Defaulter cluster data could not be loaded. Confirm the backend analytics endpoints are available.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters, reloadKey, token]);

  const sortedClusters = useMemo(
    () => [...clusters].sort((a, b) => b.defaulter_count - a.defaulter_count),
    [clusters],
  );
  const totalDefaulters = sortedClusters.reduce((total, row) => total + row.defaulter_count, 0);
  const lowCoverage = sortedClusters.filter((row) => row.coverage_pct < 70);
  const topCluster = sortedClusters[0] ?? null;

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PUBLIC_HEALTH_OFFICIAL"]}>
      <div className="space-y-6">
        <PageHeader
          title="Defaulter Clusters"
          description="Prioritize outreach by residence unit, missed vaccine group, and coverage risk."
          actions={
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isLoading}
              type="button"
              onClick={() => {
                setIsLoading(true);
                setError("");
                setReloadKey((key) => key + 1);
              }}
            >
              Refresh
            </button>
          }
        />

        {lowCoverage.length > 0 ? (
          <AlertBanner tone="warning" count={lowCoverage.length}>
            <strong>{lowCoverage.length} cluster{lowCoverage.length === 1 ? "" : "s"}</strong>{" "}
            are below 70% coverage and should be reviewed for outreach planning.
          </AlertBanner>
        ) : null}

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <form
            className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px_auto]"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              setIsLoading(true);
              setError("");
              setAppliedFilters(filters);
            }}
          >
            <SelectInput
              label="Administrative unit"
              value={filters.unit_id}
              options={[
                { label: "All reporting units", value: "" },
                ...units.map((unit) => ({
                  label: `${unit.name} (${formatRole(unit.level)})`,
                  value: unit.id,
                })),
              ]}
              onChange={(value) => setFilters((current) => ({ ...current, unit_id: value }))}
            />
            <TextInput
              label="Minimum defaulters"
              type="number"
              value={filters.min_defaulters}
              onChange={(value) => setFilters((current) => ({ ...current, min_defaulters: value }))}
            />
            <div className="flex items-end gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                type="submit"
              >
                Apply
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setError("");
                  setFilters(defaulterFilterDefaults);
                  setAppliedFilters(defaulterFilterDefaults);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        {error ? <InlineError message={error} /> : null}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <SkeletonCard key={item} lines={2} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              detail={`${fmt(sortedClusters.length)} clusters`}
              icon="!"
              label="Total defaulters"
              tone={totalDefaulters ? "warning" : "success"}
              value={fmt(totalDefaulters)}
            />
            <MetricCard
              detail={topCluster ? `${topCluster.defaulter_count} defaulters` : "No active cluster"}
              icon="✓"
              label="Top cluster"
              tone={topCluster ? "error" : "success"}
              value={topCluster?.unit_name ?? "Clear"}
            />
            <MetricCard
              detail="Below 70% coverage"
              icon="%"
              label="Low coverage"
              tone={lowCoverage.length ? "error" : "success"}
              value={fmt(lowCoverage.length)}
            />
            <MetricCard
              detail={`${normalizeMinDefaulters(appliedFilters.min_defaulters)} minimum defaulters`}
              icon="#"
              label="Threshold"
              tone="brand"
              value={appliedFilters.unit_id ? "Filtered" : "National"}
            />
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cluster worklist</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sorted by defaulter count so outreach teams can start where the gap is largest.
              </p>
            </div>
            <StatusPill label={`${sortedClusters.length} clusters`} tone={sortedClusters.length ? "warning" : "success"} />
          </div>

          {isLoading ? (
            <SkeletonCard lines={8} />
          ) : sortedClusters.length === 0 ? (
            <EmptyState icon="✓">No defaulter clusters meet the selected threshold.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Defaulters</th>
                    <th className="px-4 py-3">Coverage</th>
                    <th className="px-4 py-3">Missing vaccines</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sortedClusters.map((cluster) => (
                    <tr key={cluster.unit_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{cluster.unit_name}</div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Unit ID {cluster.unit_id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{formatRole(cluster.level)}</td>
                      <td className="px-4 py-4">
                        <span className="text-base font-semibold text-error-600 dark:text-error-400">
                          {fmt(cluster.defaulter_count)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-32 items-center gap-3">
                          <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-800">
                            <div
                              className={
                                coverageTone(cluster.coverage_pct) === "success"
                                  ? "h-full rounded-full bg-success-500"
                                  : coverageTone(cluster.coverage_pct) === "warning"
                                    ? "h-full rounded-full bg-warning-500"
                                    : "h-full rounded-full bg-error-500"
                              }
                              style={{ width: `${Math.min(cluster.coverage_pct, 100)}%` }}
                            />
                          </div>
                          <StatusPill label={`${cluster.coverage_pct}%`} tone={coverageTone(cluster.coverage_pct)} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-md flex-wrap gap-2">
                          {cluster.vaccines_missing.slice(0, 4).map((vaccine) => (
                            <span
                              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300"
                              key={vaccine}
                            >
                              {vaccine}
                            </span>
                          ))}
                          {cluster.vaccines_missing.length > 4 ? (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
                              +{cluster.vaccines_missing.length - 4}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          href="/risk-map"
                        >
                          Review
                          <ButtonIcon>
                            <ArrowRightIcon />
                          </ButtonIcon>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}

function MonitoringList({
  emptyText,
  heading,
  rows,
}: {
  emptyText: string;
  heading: string;
  rows: Array<{
    key: string;
    label: string;
    meta: string;
    badge: string;
    tone: "brand" | "success" | "warning" | "error" | "gray";
  }>;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{heading}</h2>
        <StatusPill label={String(rows.length)} tone={rows.length ? "warning" : "success"} />
      </div>

      {rows.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.02]"
              key={row.key}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-success-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
                <CheckCircleIcon className="h-5 w-5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{row.label}</p>
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{row.meta}</p>
              </div>
              <StatusPill label={row.badge} tone={row.tone} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
