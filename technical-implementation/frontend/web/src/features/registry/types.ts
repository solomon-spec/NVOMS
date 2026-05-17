export type PatientStatus =
  | "draft"
  | "verifying"
  | "registered"
  | "merged"
  | "inactive"
  | "deceased";

export type PatientSex = "male" | "female" | "other" | "unknown";

export type PatientImmunizationStatus =
  | "up_to_date"
  | "due_soon"
  | "overdue"
  | "defaulter"
  | "zero_dose"
  | "unknown";

export type ScheduleSlotStatus =
  | "scheduled"
  | "pending"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "defaulter"
  | "administered"
  | "exempt"
  | "cancelled";

export type ImmunizationEventStatus =
  | "administered"
  | "wasted"
  | "refused"
  | "contraindicated";

export type SourceChannel = "online" | "offline" | "synced";
export type SupportedDisease = "measles" | "polio" | "cholera";

export type DiseaseScheduleStatus =
  | "not_started"
  | "scheduled"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "protected"
  | "completed"
  | "refused"
  | "contraindicated";

export type CaregiverBrief = {
  id: string;
  full_name: string;
  phone_number: string;
  relationship_to_patient: string;
};

export type AdministrativeUnitBrief = {
  id: string;
  code: string;
  name: string;
  level: string;
};

export type HealthFacility = {
  id: string;
  facility_code: string;
  facility_name: string;
};

export type VaccineBrief = {
  id: string;
  vaccine_code: string;
  vaccine_name: string;
};

export type Vaccine = VaccineBrief & {
  antigen: {
    id: string;
    code: string;
    name: string;
  } | null;
  dose_sequence: number | null;
  default_route: string | null;
  default_site: string | null;
  is_active: boolean;
};

export type VaccineBatch = {
  id: string;
  vaccine: VaccineBrief;
  batch_number: string;
  manufacturer_name: string | null;
  expiry_date: string;
  source_system: string | null;
  qty_on_hand: number;
  is_valid: boolean;
  created_at: string;
};

export type Patient = {
  id: string;
  uid: string;
  full_name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  sex: PatientSex;
  date_of_birth: string;
  primary_caregiver: CaregiverBrief | null;
  residence_unit: AdministrativeUnitBrief | null;
  registered_facility: string | null;
  registered_by: string | null;
  medical_exception_flag: boolean;
  duplicate_review_status: string;
  status: PatientStatus;
  qr_code_value: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientImmunizationSummary = {
  current_status: PatientImmunizationStatus;
  next_due_date: string | null;
  due_count: number;
  overdue_count: number;
  administered_count: number;
  is_zero_dose: boolean;
  last_evaluated_at: string;
};

export type PatientSummary = {
  patient: Patient;
  immunization_summary: PatientImmunizationSummary | null;
  disease_schedules?: PatientDiseaseSchedule[];
};

export type PatientDiseaseSchedule = {
  id: string;
  disease: SupportedDisease;
  disease_label: string;
  current_due_date: string | null;
  status: DiseaseScheduleStatus;
  is_complete: boolean;
  completed_at: string | null;
  last_outcome_event_id: string | null;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientScheduleSlot = {
  id: string;
  vaccine: VaccineBrief;
  due_date: string;
  status: ScheduleSlotStatus;
  status_reason: string | null;
  generated_at: string;
  status_changed_at: string;
};

export type RegenerateScheduleResponse = {
  created: number;
  schedule: PatientScheduleSlot[];
};

export type ImmunizationEvent = {
  id: string;
  disease: SupportedDisease | null;
  vaccine: VaccineBrief;
  vaccine_batch: {
    id: string;
    batch_number: string;
    expiry_date: string;
    is_valid: boolean;
  } | null;
  schedule_slot: string | null;
  facility: string | null;
  administered_at: string;
  administration_route: string | null;
  administration_site: string | null;
  event_status: ImmunizationEventStatus;
  next_due_date: string | null;
  disease_completed: boolean;
  source_channel: SourceChannel;
  local_client_record_id: string | null;
  notes: string | null;
  created_at: string;
};

export type ImmunizationHistorySummary = {
  id: string;
  disease: SupportedDisease | null;
  vaccine_name: string;
  vaccine_code: string;
  batch_number: string | null;
  administered_at: string;
  event_status: ImmunizationEventStatus;
  next_due_date: string | null;
  disease_completed: boolean;
  created_at: string;
};

export type Caregiver = CaregiverBrief & {
  alternate_phone_number: string | null;
  preferred_language: string;
  residence_unit: AdministrativeUnitBrief | null;
  address_line: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type CreateCaregiverPayload = {
  full_name: string;
  phone_number: string;
  alternate_phone_number?: string | null;
  relationship_to_patient: string;
  preferred_language: string;
  residence_unit_id?: string | null;
  address_line?: string | null;
  status: "active" | "inactive";
};

export type CreatePatientPayload = {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  sex: PatientSex;
  date_of_birth: string;
  primary_caregiver_id: string;
  residence_unit_id?: string;
  registered_facility_id?: string;
  medical_exception_flag: boolean;
  status: PatientStatus;
  disease_due_dates?: DiseaseDueDateInput[];
};

export type DiseaseDueDateInput = {
  disease: SupportedDisease;
  due_date?: string | null;
  status?: DiseaseScheduleStatus;
  is_complete?: boolean;
  status_reason?: string | null;
};

export type UpdatePatientPayload = {
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  sex: PatientSex;
  date_of_birth: string;
  residence_unit_id?: string | null;
  registered_facility_id?: string | null;
  medical_exception_flag: boolean;
  status: PatientStatus;
  qr_code_value?: string | null;
};

export type PatchPatientPayload = Partial<UpdatePatientPayload>;

export type CreateDosePayload = {
  disease?: SupportedDisease | null;
  vaccine_id: string;
  vaccine_batch_id?: string | null;
  schedule_slot_id?: string | null;
  facility_id?: string | null;
  administered_at: string;
  administration_route?: string | null;
  administration_site?: string | null;
  event_status?: ImmunizationEventStatus;
  next_due_date?: string | null;
  disease_completed?: boolean;
  source_channel?: SourceChannel;
  local_client_record_id?: string | null;
  notes?: string | null;
};

export type UpdateScheduleSlotPayload = {
  status: ScheduleSlotStatus;
  status_reason?: string | null;
};

export type CreateVaccinePayload = {
  vaccine_code: string;
  vaccine_name: string;
  antigen_id?: string | null;
  dose_sequence?: number | null;
  default_route?: string | null;
  default_site?: string | null;
  is_active: boolean;
};

export type CreateVaccineBatchPayload = {
  vaccine_id: string;
  batch_number: string;
  manufacturer_name?: string | null;
  expiry_date?: string | null;
  source_system?: string | null;
  qty_on_hand?: number;
  is_valid: boolean;
};

export type EpiScheduleVersion = {
  id: string;
  version_name: string;
  effective_from: string;
  effective_to: string | null;
  status: "draft" | "active" | "retired";
  notes: string | null;
  created_at: string;
};

export type CreateEpiScheduleVersionPayload = {
  version_name: string;
  effective_from: string;
  effective_to?: string | null;
  status: "draft" | "active" | "retired";
  notes?: string | null;
};

export type EpiScheduleRule = {
  id: string;
  vaccine: VaccineBrief;
  dose_label: string;
  recommended_age_days: number;
  grace_period_days: number;
  defaulter_threshold_days: number;
  medical_exception_rule: Record<string, unknown> | null;
  is_birth_dose: boolean;
  is_active: boolean;
};

export type CreateEpiScheduleRulePayload = {
  vaccine_id: string;
  dose_label: string;
  recommended_age_days: number;
  grace_period_days: number;
  defaulter_threshold_days: number;
  medical_exception_rule?: Record<string, unknown> | null;
  is_birth_dose: boolean;
  is_active: boolean;
};
