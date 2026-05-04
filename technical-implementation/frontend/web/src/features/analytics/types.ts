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

// ── New endpoint types ────────────────────────────────────────────────────────

export type CoverageTrendPoint = {
  date: string;
  overall_coverage_pct: number;
  administered: number;
  scheduled: number;
};

export type CoverageTrendResponse = CoverageTrendPoint[];

export type DefaulterClusterRow = {
  unit_id: string;
  unit_name: string;
  level: string;
  defaulter_count: number;
  coverage_pct: number;
  vaccines_missing: string[];
};

export type DefaulterClusterResponse = DefaulterClusterRow[];

export type ReportingGapRow = {
  unit_id: string;
  unit_name: string;
  days_since_last_report: number;
  level: string;
};

export type ReportingGapResponse = ReportingGapRow[];

export type RiskScoreRow = {
  id: string;
  unit_id: string;
  unit_name: string;
  risk_score: number;
  disease: string;
  computed_at: string;
};

export type RiskScoreResponse = RiskScoreRow[];
