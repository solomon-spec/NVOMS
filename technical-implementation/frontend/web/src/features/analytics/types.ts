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
  id?: string;
  unit_id: string;
  unit_name: string;
  risk_score: number;
  disease: string;
  computed_at: string;
};

export type RiskScoreResponse = RiskScoreRow[];

export type UserRoleBreakdown = {
  role_code: string;
  role_name: string;
  count: number;
};

export type AdminDashboardResponse = {
  generated_at: string;
  total_patients: number;
  total_users: number;
  active_defaulters: number;
  defaulter_pct: number;
  users_by_role: UserRoleBreakdown[];
};

export type HwDefaulterPatient = {
  patient_id: string;
  uid: string;
  full_name: string;
  date_of_birth: string;
  caregiver_name: string | null;
  caregiver_phone: string | null;
  current_status: string | null;
  overdue_count: number;
  next_due_date: string | null;
};

export type HwDashboardResponse = {
  generated_at: string;
  report_date: string;
  facility_id: string | null;
  facility_name: string | null;
  total_patients: number;
  upcoming_today: number;
  daily_doses_administered: number;
  defaulter_count: number;
  defaulter_list: HwDefaulterPatient[];
};

export type PhoDashboardResponse = {
  generated_at: string;
  total_patients: number;
  total_doses_administered: number;
  active_defaulters: number;
  defaulter_pct: number;
  zero_dose_children: number;
};

export type DailyVaccinationReportRow = {
  vaccine_code: string;
  vaccine_name: string;
  antigen_name: string | null;
  doses_administered: number;
};

export type DailyVaccinationReportResponse = {
  report_date: string;
  facility_id: string | null;
  facility_name: string | null;
  total_doses: number;
  by_vaccine: DailyVaccinationReportRow[];
};
