import type { AdministrativeUnitBrief } from "@/features/registry/types";

export type SurveillanceCategory = "aefi" | "symptom" | "lab_follow_up";

export type SurveillanceSeverity = "low" | "moderate" | "high" | "critical";

export type SurveillanceReportStatus =
  | "submitted"
  | "queued"
  | "under_follow_up"
  | "closed";

export type AlertStatus =
  | "potential"
  | "under_review"
  | "confirmed"
  | "dismissed"
  | "false_alarm";

export type AlertSource = "prediction" | "surveillance" | "manual";

export type FollowUpStatus = "open" | "completed";

export type SurveillanceSymptom = {
  id: string;
  symptom_code: string;
  symptom_label: string;
  is_present: boolean;
  observation_value: string | null;
};

export type SurveillanceReport = {
  id: string;
  patient: string;
  facility: string | null;
  reported_by: string | null;
  surveillance_category: SurveillanceCategory;
  condition_type: string;
  disease_suspected: string | null;
  onset_date: string;
  body_temperature_c: string | null;
  severity: SurveillanceSeverity | null;
  follow_up_required: boolean;
  status: SurveillanceReportStatus;
  fhir_observation_id: string | null;
  notes: string | null;
  symptoms: SurveillanceSymptom[];
  created_at: string;
};

export type CreateSurveillanceReportPayload = {
  patient: string;
  facility?: string | null;
  surveillance_category: SurveillanceCategory;
  condition_type: string;
  disease_suspected?: string | null;
  onset_date: string;
  body_temperature_c?: string | null;
  severity?: SurveillanceSeverity | null;
  follow_up_required: boolean;
  notes?: string | null;
  symptoms?: Array<{
    symptom_code: string;
    symptom_label: string;
    is_present: boolean;
    observation_value?: string | null;
  }>;
};

export type UpdateSurveillanceReportPayload = Partial<{
  condition_type: string;
  disease_suspected: string | null;
  onset_date: string;
  body_temperature_c: string | null;
  severity: SurveillanceSeverity | null;
  follow_up_required: boolean;
  status: SurveillanceReportStatus;
  notes: string | null;
}>;

export type FollowUpAction = {
  id: string;
  action_taken: string;
  assigned_to: string | null;
  status: FollowUpStatus;
  due_date: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type CreateFollowUpActionPayload = {
  action_taken: string;
  assigned_to?: string | null;
  due_date?: string | null;
};

export type OutbreakAlert = {
  id: string;
  unit: string;
  disease_code: string;
  surveillance_report: string | null;
  alert_source: AlertSource;
  risk_probability: string | null;
  status: AlertStatus;
  triggered_at: string;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
};

export type AlertStatusUpdatePayload = {
  status: AlertStatus;
  notes?: string | null;
};

export type SurveillanceReportFilters = {
  search?: string;
  category?: SurveillanceCategory | "all";
  status?: SurveillanceReportStatus | "all";
  facility?: string;
};

export type OutbreakAlertFilters = {
  status?: AlertStatus | "all";
  unit?: string;
  disease?: string;
};

export type AlertWithUnit = OutbreakAlert & {
  unitLabel?: string;
  unitRecord?: AdministrativeUnitBrief;
};
