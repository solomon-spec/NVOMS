"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type {
  AdministrativeUnitBrief,
  Vaccine,
} from "@/features/registry/types";
import type {
  AnalyticsFilters,
  CoverageByRegionResponse,
  CoverageResponse,
  CoverageVaccineRow,
} from "@/features/analytics/types";
import { ApiError } from "@/services/api";
import {
  listAdministrativeUnits,
  listVaccines,
} from "@/services/patients";
import {
  getVaccineCoverage,
  getVaccineCoverageByRegion,
} from "@/services/analytics";
import { formatRole } from "@/shared/format";
import {
  EmptyState,
  InlineError,
  MetricCard,
  Notice,
  SelectInput,
  StatusPill,
  TextInput,
} from "@/shared/workspace-ui";

const emptyFilters: AnalyticsFilters = {
  unit_id: "",
  vaccine_id: "",
  date_from: "",
  date_to: "",
};

export function AnalyticsWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [regionalCoverage, setRegionalCoverage] =
    useState<CoverageByRegionResponse | null>(null);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [units, setUnits] = useState<AdministrativeUnitBrief[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<AnalyticsFilters>(emptyFilters);
  const [selectedVaccineId, setSelectedVaccineId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadReferenceData() {
      if (!token) {
        return;
      }

      try {
        const [vaccineRows, unitRows] = await Promise.all([
          listVaccines(token),
          listAdministrativeUnits(token),
        ]);
        if (isActive) {
          setVaccines(vaccineRows);
          setUnits(unitRows);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(readApiError(caughtError));
        }
      }
    }

    loadReferenceData();
    return () => {
      isActive = false;
    };
  }, [token]);

  useEffect(() => {
    let isActive = true;

    async function loadAnalytics() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      try {
        const [coverageResponse, regionResponse] = await Promise.all([
          getVaccineCoverage(token, normalizeFilters(appliedFilters)),
          getVaccineCoverageByRegion(token, normalizeFilters(appliedFilters)),
        ]);

        if (!isActive) {
          return;
        }

        setCoverage(coverageResponse);
        setRegionalCoverage(regionResponse);
        setError("");
        setSelectedVaccineId((current) =>
          current &&
          coverageResponse.vaccines.some((row) => row.vaccine_id === current)
            ? current
            : coverageResponse.vaccines[0]?.vaccine_id ?? "",
        );
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

    loadAnalytics();
    return () => {
      isActive = false;
    };
  }, [appliedFilters, reloadKey, token]);

  const selectedVaccine =
    coverage?.vaccines.find((row) => row.vaccine_id === selectedVaccineId) ??
    coverage?.vaccines[0] ??
    null;

  const metrics = useMemo(() => {
    const vaccinesLoaded = coverage?.vaccines.length ?? 0;
    const scheduled = coverage?.summary.total_scheduled ?? 0;
    const administered = coverage?.summary.total_administered ?? 0;
    const missed =
      coverage?.vaccines.reduce(
        (sum, row) => sum + row.overdue + row.defaulter,
        0,
      ) ?? 0;

    return [
      {
        label: "Overall coverage",
        value: `${coverage?.summary.overall_coverage_pct ?? 0}%`,
        detail: coverage ? `Generated ${formatDateTime(coverage.generated_at)}` : "",
      },
      { label: "Scheduled slots", value: formatNumber(scheduled) },
      { label: "Administered", value: formatNumber(administered) },
      { label: "Overdue/defaulter", value: formatNumber(missed) },
      { label: "Vaccines", value: String(vaccinesLoaded) },
      { label: "Regions", value: String(regionalCoverage?.regions.length ?? 0) },
    ];
  }, [coverage, regionalCoverage]);

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function handleResetFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Analytics
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Coverage analytics and regional comparison
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Uses the live coverage APIs for vaccine-level totals, missed slots,
              and administrative region comparison.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            disabled={isLoading}
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Refresh analytics
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard
            detail={metric.detail}
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </section>

      <Notice tone="brand">
        Backend note: the current API exposes coverage and coverage-by-region
        analytics. Risk maps, dashboard trends, AEFI analytics, and defaulter
        cluster endpoints are not available yet, so this workspace does not
        invent those datasets.
      </Notice>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filters
        </h2>
        <form className="mt-4 grid gap-4 lg:grid-cols-5" onSubmit={handleApplyFilters}>
          <SelectInput
            label="Administrative unit"
            value={filters.unit_id ?? ""}
            onChange={(value) =>
              setFilters((current) => ({ ...current, unit_id: value }))
            }
            options={[
              { label: "National view", value: "" },
              ...units.map((unit) => ({
                label: `${unit.name} (${formatRole(unit.level)})`,
                value: unit.id,
              })),
            ]}
          />
          <SelectInput
            label="Vaccine"
            value={filters.vaccine_id ?? ""}
            onChange={(value) =>
              setFilters((current) => ({ ...current, vaccine_id: value }))
            }
            options={[
              { label: "All vaccines", value: "" },
              ...vaccines.map((vaccine) => ({
                label: `${vaccine.vaccine_name} (${vaccine.vaccine_code})`,
                value: vaccine.id,
              })),
            ]}
          />
          <TextInput
            label="Date from"
            type="date"
            value={filters.date_from ?? ""}
            onChange={(value) =>
              setFilters((current) => ({ ...current, date_from: value }))
            }
          />
          <TextInput
            label="Date to"
            type="date"
            value={filters.date_to ?? ""}
            onChange={(value) =>
              setFilters((current) => ({ ...current, date_to: value }))
            }
          />
          <div className="flex items-end gap-3">
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700"
              type="submit"
            >
              Apply
            </button>
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              type="button"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      {error ? <InlineError message={error} /> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.8fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vaccine coverage
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Coverage, missed rate, and queue status by vaccine.
            </p>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-3">
            {isLoading ? (
              <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                Loading coverage analytics...
              </p>
            ) : coverage?.vaccines.length ? (
              <div className="space-y-2">
                {coverage.vaccines.map((row) => (
                  <button
                    className={`w-full rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
                      selectedVaccineId === row.vaccine_id
                        ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                    }`}
                    key={row.vaccine_id}
                    type="button"
                    onClick={() => setSelectedVaccineId(row.vaccine_id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {row.vaccine_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {row.vaccine_code} - {row.antigen_name ?? "No antigen"}
                        </p>
                      </div>
                      <StatusPill
                        label={`${row.coverage_pct}%`}
                        tone={coverageTone(row.coverage_pct)}
                      />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-brand-600 dark:bg-brand-400"
                        style={{ width: `${Math.min(row.coverage_pct, 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatNumber(row.administered)} administered</span>
                      <span>{formatNumber(row.upcoming)} upcoming</span>
                      <span>{formatNumber(row.overdue + row.defaulter)} missed</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState>No coverage rows returned for the selected filters.</EmptyState>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <SelectedCoverageCard row={selectedVaccine} />

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Coverage by region
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Top-level administrative comparison from the backend.
                </p>
              </div>
              <StatusPill
                label={`${regionalCoverage?.regions.length ?? 0} regions`}
              />
            </div>
            <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {isLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading regional coverage...
                </p>
              ) : regionalCoverage?.regions.length ? (
                regionalCoverage.regions.map((row) => (
                  <div
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                    key={row.region_id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {row.region_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {row.region_code} -{" "}
                          {formatNumber(row.administered)} administered
                        </p>
                      </div>
                      <StatusPill
                        label={`${row.coverage_pct}%`}
                        tone={coverageTone(row.coverage_pct)}
                      />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-brand-600 dark:bg-brand-400"
                        style={{ width: `${Math.min(row.coverage_pct, 100)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatNumber(row.overdue_or_defaulter)} overdue or
                      defaulter slots
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState>No regional rows returned.</EmptyState>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function SelectedCoverageCard({ row }: { row: CoverageVaccineRow | null }) {
  if (!row) {
    return <EmptyState>Select a vaccine row to inspect its totals.</EmptyState>;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
            Selected vaccine
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {row.vaccine_name}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {row.vaccine_code} - {row.antigen_name ?? "No antigen"}
          </p>
        </div>
        <StatusPill label={`${row.coverage_pct}%`} tone={coverageTone(row.coverage_pct)} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailItem label="Scheduled" value={formatNumber(row.total_scheduled)} />
        <DetailItem label="Administered" value={formatNumber(row.administered)} />
        <DetailItem label="Upcoming" value={formatNumber(row.upcoming)} />
        <DetailItem
          label="Missed"
          value={formatNumber(row.overdue + row.defaulter)}
        />
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Missed percentage
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {row.missed_pct}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-warning-500"
            style={{ width: `${Math.min(row.missed_pct, 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function normalizeFilters(filters: AnalyticsFilters): AnalyticsFilters {
  return {
    unit_id: filters.unit_id || undefined,
    vaccine_id: filters.vaccine_id || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  };
}

function coverageTone(value: number) {
  if (value >= 90) {
    return "success";
  }

  if (value >= 70) {
    return "warning";
  }

  return "error";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function readApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Could not reach the backend. Confirm the API is running on port 8000.";
}
