import type {
  AdministrativeUnitBrief,
  ImmunizationEventStatus,
  Patient,
  VaccineBatch,
  VaccineBrief,
} from "@/features/registry/types";

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

export type SpecimenStatus =
  | "not_collected"
  | "pending"
  | "collected"
  | "sent"
  | "received";

export type LabResultStatus =
  | "not_sent"
  | "pending"
  | "positive"
  | "negative"
  | "inconclusive";

export type ClinicalOutcome =
  | "unknown"
  | "recovering"
  | "recovered"
  | "hospitalized"
  | "referred"
  | "transferred"
  | "deceased";

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
  aefi_immunization_event: {
    id: string;
    administered_at: string;
    event_status: ImmunizationEventStatus;
    vaccine: VaccineBrief;
    vaccine_batch: Pick<VaccineBatch, "id" | "batch_number" | "expiry_date" | "is_valid"> | null;
  } | null;
  aefi_vaccine: VaccineBrief | null;
  aefi_vaccine_batch: Pick<VaccineBatch, "id" | "batch_number" | "expiry_date" | "is_valid"> | null;
  vaccine_dose_label: string | null;
  vaccination_date: string | null;
  lab_sample_taken: boolean;
  specimen_status: SpecimenStatus;
  specimen_type: string | null;
  specimen_collection_date: string | null;
  lab_test_type: string | null;
  lab_result_status: LabResultStatus | null;
  lab_result_date: string | null;
  lab_result_notes: string | null;
  clinical_outcome: ClinicalOutcome | null;
  clinical_outcome_date: string | null;
  outcome_notes: string | null;
  next_follow_up_date: string | null;
  fhir_observation_id: string | null;
  fhir_resource_id: string | null;
  local_client_record_id: string | null;
  notes: string | null;
  symptoms: SurveillanceSymptom[];
  patient_details?: Patient;
  created_at: string;
  updated_at: string | null;
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
  aefi_immunization_event?: string | null;
  aefi_vaccine?: string | null;
  aefi_vaccine_batch?: string | null;
  vaccine_dose_label?: string | null;
  vaccination_date?: string | null;
  lab_sample_taken?: boolean;
  specimen_status?: SpecimenStatus;
  specimen_type?: string | null;
  specimen_collection_date?: string | null;
  lab_test_type?: string | null;
  lab_result_status?: LabResultStatus | null;
  lab_result_date?: string | null;
  lab_result_notes?: string | null;
  clinical_outcome?: ClinicalOutcome | null;
  clinical_outcome_date?: string | null;
  outcome_notes?: string | null;
  next_follow_up_date?: string | null;
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
  lab_sample_taken: boolean;
  specimen_status: SpecimenStatus;
  specimen_type: string | null;
  specimen_collection_date: string | null;
  lab_test_type: string | null;
  lab_result_status: LabResultStatus | null;
  lab_result_date: string | null;
  lab_result_notes: string | null;
  clinical_outcome: ClinicalOutcome | null;
  clinical_outcome_date: string | null;
  outcome_notes: string | null;
  next_follow_up_date: string | null;
  aefi_immunization_event: string | null;
  aefi_vaccine: string | null;
  aefi_vaccine_batch: string | null;
  vaccine_dose_label: string | null;
  vaccination_date: string | null;
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
