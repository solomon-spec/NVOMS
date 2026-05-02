export type CoverageSummary = {
  total_scheduled: number;
  total_administered: number;
  overall_coverage_pct: number;
};

export type CoverageVaccineRow = {
  vaccine_id: string;
  vaccine_code: string;
  vaccine_name: string;
  antigen_name: string | null;
  total_scheduled: number;
  administered: number;
  overdue: number;
  defaulter: number;
  upcoming: number;
  coverage_pct: number;
  missed_pct: number;
};

export type CoverageResponse = {
  generated_at: string;
  filters: {
    unit_id: string | null;
    vaccine_id: string | null;
    date_from: string | null;
    date_to: string | null;
  };
  summary: CoverageSummary;
  vaccines: CoverageVaccineRow[];
};

export type CoverageRegionRow = {
  region_id: string;
  region_name: string;
  region_code: string;
  total_scheduled: number;
  administered: number;
  overdue_or_defaulter: number;
  coverage_pct: number;
};

export type CoverageByRegionResponse = {
  generated_at: string;
  filters: {
    vaccine_id: string | null;
    date_from: string | null;
    date_to: string | null;
  };
  regions: CoverageRegionRow[];
};

export type AnalyticsFilters = {
  unit_id?: string;
  vaccine_id?: string;
  date_from?: string;
  date_to?: string;
};
