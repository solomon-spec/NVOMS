import type {
  AdministrativeUnitBrief,
  Caregiver,
  CreateCaregiverPayload,
  CreateDosePayload,
  CreateEpiScheduleRulePayload,
  CreateEpiScheduleVersionPayload,
  CreatePatientPayload,
  CreateVaccineBatchPayload,
  CreateVaccinePayload,
  DiseaseDueDateInput,
  EpiScheduleRule,
  EpiScheduleVersion,
  HealthFacility,
  ImmunizationHistorySummary,
  ImmunizationEvent,
  PatchPatientPayload,
  Patient,
  PatientDiseaseSchedule,
  PatientScheduleSlot,
  PatientSummary,
  PatientStatus,
  RegenerateScheduleResponse,
  UpdatePatientPayload,
  UpdateScheduleSlotPayload,
  Vaccine,
  VaccineBatch,
} from "@/features/registry/types";
import { apiRequest } from "@/services/api";

type PatientFilters = {
  search?: string;
  status?: PatientStatus | "all";
};

export type PatientRegistryFilters = PatientFilters & {
  facility?: string;
  page?: number;
  pageSize?: number;
};

export type PatientRegistryResult = {
  rows: Patient[];
  count: number;
  page: number;
  pageSize: number;
  next: string | null;
  previous: string | null;
  isServerPaginated: boolean;
};

export type DefaulterPatient = {
  patient_id: string;
  uid: string;
  full_name: string;
  date_of_birth: string;
  sex: string;
  caregiver_name: string | null;
  caregiver_phone: string | null;
  residence_unit: string | null;
  facility: string | null;
  current_status: string | null;
  overdue_count: number;
  next_due_date: string | null;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  page?: number;
  pageSize?: number;
  results: T[];
};

function withQuery(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function listPatients(token: string, filters: PatientFilters = {}) {
  return apiRequest<Patient[]>(
    withQuery("/patients/", {
      search: filters.search,
      status: filters.status,
    }),
    {
      method: "GET",
      token,
    },
  );
}

export async function listPatientRegistry(
  token: string,
  filters: PatientRegistryFilters = {},
) {
  const requestedPage = filters.page ?? 1;
  const requestedPageSize = filters.pageSize ?? 25;
  const response = await apiRequest<Patient[] | PaginatedResponse<Patient>>(
    withQuery("/patients/", {
      search: filters.search,
      status: filters.status,
      facility: filters.facility,
      page: String(requestedPage),
      pageSize: String(requestedPageSize),
    }),
    {
      method: "GET",
      token,
    },
  );

  if (Array.isArray(response)) {
    return {
      rows: response,
      count: response.length,
      page: requestedPage,
      pageSize: requestedPageSize,
      next: null,
      previous: null,
      isServerPaginated: false,
    } satisfies PatientRegistryResult;
  }

  return {
    rows: response.results,
    count: response.count,
    page: response.page ?? requestedPage,
    pageSize: response.pageSize ?? requestedPageSize,
    next: response.next,
    previous: response.previous,
    isServerPaginated: true,
  } satisfies PatientRegistryResult;
}

export function createPatient(token: string, payload: CreatePatientPayload) {
  return apiRequest<Patient>("/patients/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getPatient(token: string, patientId: string) {
  return apiRequest<Patient>(`/patients/${patientId}`, {
    method: "GET",
    token,
  });
}

export function updatePatient(
  token: string,
  patientId: string,
  payload: UpdatePatientPayload,
) {
  return apiRequest<Patient>(`/patients/${patientId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function patchPatient(
  token: string,
  patientId: string,
  payload: PatchPatientPayload,
) {
  return apiRequest<Patient>(`/patients/${patientId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function deletePatient(token: string, patientId: string) {
  return apiRequest<void>(`/patients/${patientId}`, {
    method: "DELETE",
    token,
  });
}

export function getPatientSummary(token: string, patientId: string) {
  return apiRequest<PatientSummary>(`/patients/${patientId}/summary`, {
    method: "GET",
    token,
  });
}

export function listPatientDoses(token: string, patientId: string) {
  return apiRequest<ImmunizationEvent[]>(`/patients/${patientId}/doses`, {
    method: "GET",
    token,
  });
}

export function createPatientDose(
  token: string,
  patientId: string,
  payload: CreateDosePayload,
) {
  return apiRequest<ImmunizationEvent>(`/patients/${patientId}/doses`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function createPatientOutcome(
  token: string,
  patientId: string,
  payload: CreateDosePayload,
) {
  return apiRequest<ImmunizationEvent>(`/patients/${patientId}/outcomes`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function listPatientDiseaseSchedules(token: string, patientId: string) {
  return apiRequest<PatientDiseaseSchedule[]>(`/patients/${patientId}/disease-schedules`, {
    method: "GET",
    token,
  });
}

export function updatePatientDiseaseSchedules(
  token: string,
  patientId: string,
  diseaseDueDates: DiseaseDueDateInput[],
) {
  return apiRequest<PatientDiseaseSchedule[]>(`/patients/${patientId}/disease-schedules`, {
    method: "PUT",
    token,
    body: JSON.stringify({ disease_due_dates: diseaseDueDates }),
  });
}

export function listPatientVaccinationHistory(
  token: string,
  patientId: string,
  detail = false,
) {
  return apiRequest<ImmunizationEvent[] | ImmunizationHistorySummary[]>(
    withQuery(`/patients/${patientId}/vaccination-history`, {
      detail: detail ? "true" : undefined,
    }),
    {
      method: "GET",
      token,
    },
  );
}

export function listPatientSchedule(token: string, patientId: string) {
  return apiRequest<PatientScheduleSlot[]>(`/patients/${patientId}/schedule`, {
    method: "GET",
    token,
  });
}

export function listDefaulterPatients(
  token: string,
  filters: { facility?: string; all?: boolean } = {},
) {
  return apiRequest<DefaulterPatient[]>(
    withQuery("/patients/defaulters/", {
      facility: filters.facility,
      all: filters.all ? "true" : undefined,
    }),
    { method: "GET", token },
  );
}

export function sendPatientReminder(
  token: string,
  patientId: string,
  message?: string,
) {
  return apiRequest<{ notification_id: string; phone_number: string; message_body: string; status: string }>(
    `/patients/${patientId}/send-reminder/`,
    {
      method: "POST",
      token,
      body: JSON.stringify(message ? { message } : {}),
    },
  );
}

export function getPatientScheduleSlot(
  token: string,
  patientId: string,
  slotId: string,
) {
  return apiRequest<PatientScheduleSlot>(
    `/patients/${patientId}/schedule/${slotId}`,
    {
      method: "GET",
      token,
    },
  );
}

export function updatePatientScheduleSlot(
  token: string,
  patientId: string,
  slotId: string,
  payload: UpdateScheduleSlotPayload,
) {
  return apiRequest<PatientScheduleSlot>(
    `/patients/${patientId}/schedule/${slotId}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function regeneratePatientSchedule(token: string, patientId: string) {
  return apiRequest<RegenerateScheduleResponse>(
    `/patients/${patientId}/schedule/regenerate`,
    {
      method: "POST",
      token,
    },
  );
}

export function getMyPatient(token: string) {
  return apiRequest<PatientSummary>("/patients/me/", {
    method: "GET",
    token,
  });
}

export function listMyPatientDoses(token: string) {
  return apiRequest<ImmunizationEvent[]>("/patients/me/doses", {
    method: "GET",
    token,
  });
}

export function listMyPatientSchedule(token: string) {
  return apiRequest<PatientScheduleSlot[]>("/patients/me/schedule", {
    method: "GET",
    token,
  });
}

export function listCaregiverPatients(token: string) {
  return apiRequest<Patient[]>("/caregivers/me/patients", {
    method: "GET",
    token,
  });
}

export function listCaregiverPatientDoses(token: string, patientId: string) {
  return apiRequest<ImmunizationEvent[]>(`/caregivers/me/patients/${patientId}/doses`, {
    method: "GET",
    token,
  });
}

export function listCaregiverPatientSchedule(token: string, patientId: string) {
  return apiRequest<PatientScheduleSlot[]>(`/caregivers/me/patients/${patientId}/schedule`, {
    method: "GET",
    token,
  });
}

export function listCaregivers(token: string, search?: string) {
  return apiRequest<Caregiver[]>(
    withQuery("/caregivers/", {
      search,
    }),
    {
      method: "GET",
      token,
    },
  );
}

export function createCaregiver(token: string, payload: CreateCaregiverPayload) {
  return apiRequest<Caregiver>("/caregivers/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getCaregiver(token: string, caregiverId: string) {
  return apiRequest<Caregiver>(`/caregivers/${caregiverId}`, {
    method: "GET",
    token,
  });
}

export function updateCaregiver(token: string, caregiverId: string, payload: CreateCaregiverPayload) {
  return apiRequest<Caregiver>(`/caregivers/${caregiverId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function patchCaregiver(token: string, caregiverId: string, payload: Partial<CreateCaregiverPayload>) {
  return apiRequest<Caregiver>(`/caregivers/${caregiverId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function listFacilities(token: string) {
  return apiRequest<HealthFacility[]>("/facilities/", {
    method: "GET",
    token,
  });
}

export function listAdministrativeUnits(token: string) {
  return apiRequest<AdministrativeUnitBrief[]>("/geography/?active=true", {
    method: "GET",
    token,
  });
}

export function listVaccines(token: string) {
  return apiRequest<Vaccine[]>("/vaccines/?active=true", {
    method: "GET",
    token,
  });
}

export function createVaccine(token: string, payload: CreateVaccinePayload) {
  return apiRequest<Vaccine>("/vaccines/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function listVaccineBatches(token: string, vaccineId?: string) {
  return apiRequest<VaccineBatch[]>(
    withQuery("/vaccines/batches/", {
      vaccine: vaccineId,
      valid: "true",
    }),
    {
      method: "GET",
      token,
    },
  );
}

export function createVaccineBatch(
  token: string,
  payload: CreateVaccineBatchPayload,
) {
  return apiRequest<VaccineBatch>("/vaccines/batches/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function listEpiScheduleVersions(token: string, status?: string) {
  return apiRequest<EpiScheduleVersion[]>(
    withQuery("/vaccines/schedules/", {
      status,
    }),
    {
      method: "GET",
      token,
    },
  );
}

export function createEpiScheduleVersion(
  token: string,
  payload: CreateEpiScheduleVersionPayload,
) {
  return apiRequest<EpiScheduleVersion>("/vaccines/schedules/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function createEpiScheduleRule(
  token: string,
  versionId: string,
  payload: CreateEpiScheduleRulePayload,
) {
  return apiRequest<EpiScheduleRule>(`/vaccines/schedules/${versionId}/rules/`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
