import type {
  AnalyticsFilters,
  CoverageByRegionResponse,
  CoverageResponse,
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
    {
      method: "GET",
      token,
    },
  );
}

export function getVaccineCoverageByRegion(
  token: string,
  filters: AnalyticsFilters = {},
) {
  return apiRequest<CoverageByRegionResponse>(
    withQuery("/analytics/coverage/by-region/", {
      vaccine_id: filters.vaccine_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
    }),
    {
      method: "GET",
      token,
    },
  );
}
