"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";
import type { AdministrativeUnitBrief, Vaccine } from "@/features/registry/types";
import type {
  AnalyticsFilters,
  CoverageByRegionResponse,
  CoverageResponse,
  CoverageTrendPoint,
  CoverageVaccineRow,
  DefaulterClusterRow,
  ReportingGapRow,
  RiskScoreRow,
} from "@/features/analytics/types";
import { ApiError } from "@/services/api";
import { listAdministrativeUnits, listVaccines } from "@/services/patients";
import {
  getCoverageTrend,
  getDefaulterClusters,
  getReportingGaps,
  getRiskScores,
  getVaccineCoverage,
  getVaccineCoverageByRegion,
  runPrediction,
} from "@/services/analytics";
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

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const emptyFilters: AnalyticsFilters = { unit_id: "", vaccine_id: "", date_from: "", date_to: "" };

function normalize(f: AnalyticsFilters): AnalyticsFilters {
  return {
    unit_id: f.unit_id || undefined,
    vaccine_id: f.vaccine_id || undefined,
    date_from: f.date_from || undefined,
    date_to: f.date_to || undefined,
  };
}

function coverageTone(v: number): "success" | "warning" | "error" {
  return v >= 90 ? "success" : v >= 70 ? "warning" : "error";
}

function fmt(v: number) { return new Intl.NumberFormat().format(v); }

function readApiError(e: unknown) {
  return e instanceof ApiError ? e.message : "Could not reach the backend.";
}

export function AnalyticsWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const { addToast } = useToast();

  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [regionalCoverage, setRegionalCoverage] = useState<CoverageByRegionResponse | null>(null);
  const [trend, setTrend] = useState<CoverageTrendPoint[]>([]);
  const [clusters, setClusters] = useState<DefaulterClusterRow[]>([]);
  const [gaps, setGaps] = useState<ReportingGapRow[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScoreRow[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [units, setUnits] = useState<AdministrativeUnitBrief[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilters>(emptyFilters);
  const [selectedVaccineId, setSelectedVaccineId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningPrediction, setIsRunningPrediction] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Reference data
  useEffect(() => {
    if (!token) return;
    Promise.all([listVaccines(token), listAdministrativeUnits(token)])
      .then(([v, u]) => { setVaccines(v); setUnits(u); })
      .catch(() => {});
  }, [token]);

  // Main analytics load
  useEffect(() => {
    if (!token) return;
    let active = true;
    setIsLoading(true);
    const f = normalize(appliedFilters);

    Promise.allSettled([
      getVaccineCoverage(token, f),
      getVaccineCoverageByRegion(token, f),
      getCoverageTrend(token, { ...f, granularity: "month" }),
      getDefaulterClusters(token, f),
      getReportingGaps(token),
      getRiskScores(token),
    ]).then(([cov, reg, tr, cl, gap, risk]) => {
      if (!active) return;
      if (cov.status === "fulfilled") {
        setCoverage(cov.value);
        setSelectedVaccineId((cur) =>
          cur && cov.value.vaccines.some((r) => r.vaccine_id === cur)
            ? cur : cov.value.vaccines[0]?.vaccine_id ?? ""
        );
      }
      if (reg.status === "fulfilled") setRegionalCoverage(reg.value);
      if (tr.status === "fulfilled") setTrend(tr.value);
      if (cl.status === "fulfilled") setClusters(cl.value);
      if (gap.status === "fulfilled") setGaps(gap.value);
      if (risk.status === "fulfilled") setRiskScores(risk.value);
      setError("");
    }).catch((e) => { if (active) setError(readApiError(e)); })
      .finally(() => { if (active) setIsLoading(false); });

    return () => { active = false; };
  }, [appliedFilters, reloadKey, token]);

  const selectedVaccine = coverage?.vaccines.find((r) => r.vaccine_id === selectedVaccineId) ?? coverage?.vaccines[0] ?? null;
  const criticalGaps = gaps.filter((g) => g.days_since_last_report > 14);

  const metrics = useMemo(() => [
    { label: "Overall coverage", value: `${coverage?.summary.overall_coverage_pct ?? 0}%`, icon: "📊", tone: coverageTone(coverage?.summary.overall_coverage_pct ?? 0) as "success" | "warning" | "error" },
    { label: "Administered", value: fmt(coverage?.summary.total_administered ?? 0), icon: "💉", tone: "brand" as const },
    { label: "Defaulter clusters", value: String(clusters.length), icon: "📍", tone: clusters.length > 0 ? "warning" as const : "success" as const },
    { label: "Silent districts", value: String(criticalGaps.length), icon: "🔕", tone: criticalGaps.length > 0 ? "error" as const : "success" as const },
    { label: "Risk scores computed", value: String(riskScores.length), icon: "⚠️", tone: "brand" as const },
    { label: "Regions", value: String(regionalCoverage?.regions.length ?? 0), icon: "🗺️", tone: "brand" as const },
  ], [coverage, clusters, criticalGaps, riskScores, regionalCoverage]);

  // Chart data
  const trendChartOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    colors: ["#465FFF"],
    xaxis: { categories: trend.map((p) => p.date.slice(0, 7)), labels: { style: { fontSize: "11px" } } },
    yaxis: { min: 0, max: 100, labels: { formatter: (v) => `${v}%` } },
    tooltip: { y: { formatter: (v) => `${v}%` } },
    grid: { borderColor: "#f0f0f0" },
    dataLabels: { enabled: false },
  };

  const vaccineBarOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: "top" } } },
    colors: ["#465FFF"],
    dataLabels: { enabled: true, formatter: (v) => `${v}%`, offsetX: 30, style: { fontSize: "11px", colors: ["#374151"] } },
    xaxis: { categories: coverage?.vaccines.map((r) => r.vaccine_name) ?? [], max: 100, labels: { formatter: (v) => `${v}%` } },
    tooltip: { y: { formatter: (v) => `${v}%` } },
    grid: { borderColor: "#f0f0f0" },
  };

  const regionBarOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: regionalCoverage?.regions.map((r) => r.coverage_pct >= 90 ? "#17B26A" : r.coverage_pct >= 70 ? "#F79009" : "#F04438") ?? [],
    dataLabels: { enabled: true, formatter: (v) => `${v}%`, style: { fontSize: "11px", colors: ["#374151"] } },
    xaxis: { categories: regionalCoverage?.regions.map((r) => r.region_name) ?? [], max: 100, labels: { formatter: (v) => `${v}%` } },
    grid: { borderColor: "#f0f0f0" },
  };

  async function handleRunPrediction() {
    if (!token) return;
    setIsRunningPrediction(true);
    try {
      await runPrediction(token);
      addToast("Prediction task queued. Refresh risk scores in a moment.", "success");
      setReloadKey((k) => k + 1);
    } catch {
      addToast("Failed to start prediction task.", "error");
    } finally {
      setIsRunningPrediction(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">Analytics</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Coverage & Outbreak Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Vaccine coverage, defaulter clusters, silent district detection, and outbreak risk scores.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isLoading}
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Refresh
            </button>
            <button
              className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              disabled={isRunningPrediction}
              onClick={handleRunPrediction}
            >
              {isRunningPrediction ? "Running…" : "⚡ Run Prediction"}
            </button>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {criticalGaps.length > 0 && (
        <AlertBanner tone="warning" count={criticalGaps.length}>
          <strong>{criticalGaps.length} district{criticalGaps.length > 1 ? "s" : ""}</strong> have not reported in over 14 days. Review the Reporting Gaps section below.
        </AlertBanner>
      )}

      {/* Filters */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <form className="grid gap-4 lg:grid-cols-5" onSubmit={(e: FormEvent) => { e.preventDefault(); setAppliedFilters(filters); }}>
          <SelectInput
            label="Administrative unit"
            value={filters.unit_id ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, unit_id: v }))}
            options={[{ label: "National view", value: "" }, ...units.map((u) => ({ label: `${u.name} (${formatRole(u.level)})`, value: u.id }))]}
          />
          <SelectInput
            label="Vaccine"
            value={filters.vaccine_id ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, vaccine_id: v }))}
            options={[{ label: "All vaccines", value: "" }, ...vaccines.map((v) => ({ label: v.vaccine_name, value: v.id }))]}
          />
          <TextInput label="Date from" type="date" value={filters.date_from ?? ""} onChange={(v) => setFilters((f) => ({ ...f, date_from: v }))} />
          <TextInput label="Date to" type="date" value={filters.date_to ?? ""} onChange={(v) => setFilters((f) => ({ ...f, date_to: v }))} />
          <div className="flex items-end gap-2">
            <button className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700" type="submit">Apply</button>
            <button className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" type="button" onClick={() => { setFilters(emptyFilters); setAppliedFilters(emptyFilters); }}>Reset</button>
          </div>
        </form>
      </section>

      {error && <InlineError message={error} />}

      {/* KPI tiles */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {metrics.map((m) => <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} tone={m.tone} />)}
        </div>
      )}

      {/* Trend chart */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Coverage Trend</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly overall vaccination coverage over time.</p>
          </div>
        </div>
        {trend.length === 0 && !isLoading ? (
          <EmptyState icon="📈">No trend data available for the selected filters.</EmptyState>
        ) : (
          <ApexChart
            type="area"
            height={220}
            options={trendChartOptions}
            series={[{ name: "Coverage %", data: trend.map((p) => p.overall_coverage_pct) }]}
          />
        )}
      </section>

      {/* Vaccine coverage bar chart + selected detail */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Coverage by Vaccine</h2>
          {isLoading ? <SkeletonCard lines={5} /> : coverage?.vaccines.length ? (
            <ApexChart
              type="bar"
              height={Math.max(200, (coverage.vaccines.length * 44))}
              options={{
                ...vaccineBarOptions,
                chart: { ...vaccineBarOptions.chart, events: { dataPointSelection: (_, __, cfg) => { const v = coverage.vaccines[cfg.dataPointIndex]; if (v) setSelectedVaccineId(v.vaccine_id); } } },
              }}
              series={[{ name: "Coverage %", data: coverage.vaccines.map((r) => r.coverage_pct) }]}
            />
          ) : <EmptyState>No vaccine data.</EmptyState>}
        </div>

        {/* Selected vaccine detail */}
        <SelectedVaccineCard row={selectedVaccine} />
      </section>

      {/* Regional coverage */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Coverage by Region</h2>
        {isLoading ? <SkeletonCard lines={4} /> : regionalCoverage?.regions.length ? (
          <ApexChart
            type="bar"
            height={Math.max(160, (regionalCoverage.regions.length * 40))}
            options={regionBarOptions}
            series={[{ name: "Coverage %", data: regionalCoverage.regions.map((r) => r.coverage_pct) }]}
          />
        ) : <EmptyState>No regional data.</EmptyState>}
      </section>

      {/* Defaulter clusters */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Defaulter Clusters</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Geographic pockets of missed vaccinations for outreach targeting.</p>
          </div>
          {clusters.length > 0 && <StatusPill label={`${clusters.length} clusters`} tone="warning" />}
        </div>
        {isLoading ? <SkeletonCard lines={3} /> : clusters.length === 0 ? (
          <EmptyState icon="🎉">No defaulter clusters detected — all units are above threshold.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3 pr-4">Unit</th>
                  <th className="py-3 pr-4">Level</th>
                  <th className="py-3 pr-4">Defaulters</th>
                  <th className="py-3 pr-4">Coverage</th>
                  <th className="py-3">Missing vaccines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {clusters.map((c) => (
                  <tr key={c.unit_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{c.unit_name}</td>
                    <td className="py-3 pr-4 text-gray-500">{formatRole(c.level)}</td>
                    <td className="py-3 pr-4"><span className="font-semibold text-error-600">{c.defaulter_count}</span></td>
                    <td className="py-3 pr-4"><StatusPill label={`${c.coverage_pct}%`} tone={coverageTone(c.coverage_pct)} /></td>
                    <td className="py-3 text-xs text-gray-500">{c.vaccines_missing.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Risk scores */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Outbreak Risk Scores</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">ML-computed risk per district. Click &ldquo;Run Prediction&rdquo; to recalculate.</p>
          </div>
          {riskScores.length > 0 && <StatusPill label={`${riskScores.length} scored`} tone="brand" />}
        </div>
        {isLoading ? <SkeletonCard lines={3} /> : riskScores.length === 0 ? (
          <EmptyState icon="⚡">No risk scores computed yet. Click &ldquo;Run Prediction&rdquo; above to generate scores.</EmptyState>
        ) : (
          <div className="space-y-3">
            {riskScores.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.unit_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{r.disease} · {new Date(r.computed_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-warning-400 to-error-500" style={{ width: `${Math.round(r.risk_score * 100)}%` }} />
                  </div>
                  <StatusPill label={`${Math.round(r.risk_score * 100)}%`} tone={r.risk_score > 0.7 ? "error" : r.risk_score > 0.4 ? "warning" : "success"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reporting gaps */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reporting Gaps (Silent Districts)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Units with no surveillance or immunization activity recently.</p>
          </div>
          {criticalGaps.length > 0 && <StatusPill label={`${criticalGaps.length} critical`} tone="error" />}
        </div>
        {isLoading ? <SkeletonCard lines={3} /> : gaps.length === 0 ? (
          <EmptyState icon="✅">All districts are reporting within the expected window.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3 pr-4">District</th>
                  <th className="py-3 pr-4">Level</th>
                  <th className="py-3">Days silent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {gaps.map((g) => (
                  <tr key={g.unit_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{g.unit_name}</td>
                    <td className="py-3 pr-4 text-gray-500">{formatRole(g.level)}</td>
                    <td className="py-3">
                      <StatusPill label={`${g.days_since_last_report}d`} tone={g.days_since_last_report > 21 ? "error" : g.days_since_last_report > 14 ? "warning" : "gray"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SelectedVaccineCard({ row }: { row: CoverageVaccineRow | null }) {
  if (!row) return <EmptyState>Select a vaccine bar to see details.</EmptyState>;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">Selected vaccine</p>
      <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{row.vaccine_name}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{row.vaccine_code} · {row.antigen_name ?? "No antigen"}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          { label: "Scheduled", value: new Intl.NumberFormat().format(row.total_scheduled) },
          { label: "Administered", value: new Intl.NumberFormat().format(row.administered) },
          { label: "Upcoming", value: new Intl.NumberFormat().format(row.upcoming) },
          { label: "Missed", value: new Intl.NumberFormat().format(row.overdue + row.defaulter) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Missed %</span>
          <span className="font-semibold text-gray-900 dark:text-white">{row.missed_pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-warning-500" style={{ width: `${Math.min(row.missed_pct, 100)}%` }} />
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <StatusPill label={`${row.coverage_pct}% coverage`} tone={coverageTone(row.coverage_pct)} />
      </div>
    </section>
  );
}
