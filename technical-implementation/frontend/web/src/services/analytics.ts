import type {
  AnalyticsFilters,
  CoverageByRegionResponse,
  CoverageResponse,
  CoverageTrendResponse,
  DefaulterClusterResponse,
  ReportingGapResponse,
  RiskScoreResponse,
} from "@/features/analytics/types";
import { apiRequest } from "@/services/api";

function withQuery(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function getVaccineCoverage(token: string, filters: AnalyticsFilters = {}) {
  return apiRequest<CoverageResponse>(
    withQuery("/analytics/coverage/", {
      unit_id: filters.unit_id,
      vaccine_id: filters.vaccine_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
    }),
    { method: "GET", token },
  );
}

export function getVaccineCoverageByRegion(token: string, filters: AnalyticsFilters = {}) {
  return apiRequest<CoverageByRegionResponse>(
    withQuery("/analytics/coverage/by-region/", {
      vaccine_id: filters.vaccine_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
    }),
    { method: "GET", token },
  );
}

export function getCoverageTrend(
  token: string,
  filters: AnalyticsFilters & { granularity?: "day" | "week" | "month" } = {},
) {
  return apiRequest<CoverageTrendResponse>(
    withQuery("/analytics/coverage/trend/", {
      unit_id: filters.unit_id,
      vaccine_id: filters.vaccine_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      granularity: filters.granularity,
    }),
    { method: "GET", token },
  );
}

export function getDefaulterClusters(
  token: string,
  filters: AnalyticsFilters & { min_defaulters?: string } = {},
) {
  return apiRequest<DefaulterClusterResponse>(
    withQuery("/analytics/defaulters/by-cluster/", {
      unit_id: filters.unit_id,
      vaccine_id: filters.vaccine_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      min_defaulters: filters.min_defaulters,
    }),
    { method: "GET", token },
  );
}

export function getReportingGaps(token: string, threshold_days?: number) {
  return apiRequest<ReportingGapResponse>(
    withQuery("/analytics/reporting-gaps/", {
      threshold_days: threshold_days !== undefined ? String(threshold_days) : undefined,
    }),
    { method: "GET", token },
  );
}

export function getRiskScores(token: string) {
  return apiRequest<RiskScoreResponse>("/prediction/risk-scores/", {
    method: "GET",
    token,
  });
}

export function runPrediction(token: string) {
  return apiRequest<{ status: string; task_id: string | null }>(
    "/prediction/run/",
    { method: "POST", token },
  );
}
