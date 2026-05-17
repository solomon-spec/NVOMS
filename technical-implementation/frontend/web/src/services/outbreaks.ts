import type {
  AlertStatusUpdatePayload,
  CreateFollowUpActionPayload,
  CreateSurveillanceReportPayload,
  FollowUpAction,
  OutbreakAlert,
  OutbreakAlertFilters,
  SurveillanceReport,
  SurveillanceReportFilters,
  UpdateSurveillanceReportPayload,
} from "@/features/outbreaks/types";
import { apiRequest } from "@/services/api";

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

export function listSurveillanceReports(
  token: string,
  filters: SurveillanceReportFilters = {},
) {
  return apiRequest<SurveillanceReport[]>(
    withQuery("/outbreaks/", {
      search: filters.search,
      category: filters.category,
      status: filters.status,
      facility: filters.facility,
    }),
    {
      method: "GET",
      token,
    },
  );
}

export function createSurveillanceReport(
  token: string,
  payload: CreateSurveillanceReportPayload,
) {
  return apiRequest<SurveillanceReport>("/outbreaks/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getSurveillanceReport(token: string, reportId: string) {
  return apiRequest<SurveillanceReport>(`/outbreaks/${reportId}/`, {
    method: "GET",
    token,
  });
}

export function updateSurveillanceReport(
  token: string,
  reportId: string,
  payload: UpdateSurveillanceReportPayload,
) {
  return apiRequest<SurveillanceReport>(`/outbreaks/${reportId}/`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function listSurveillanceFollowUps(token: string, reportId: string) {
  return apiRequest<FollowUpAction[]>(
    `/outbreaks/${reportId}/follow-ups`,
    {
      method: "GET",
      token,
    },
  );
}

export function createSurveillanceFollowUp(
  token: string,
  reportId: string,
  payload: CreateFollowUpActionPayload,
) {
  return apiRequest<FollowUpAction>(`/outbreaks/${reportId}/follow-ups`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function listOutbreakAlerts(
  token: string,
  filters: OutbreakAlertFilters = {},
) {
  return apiRequest<OutbreakAlert[]>(
    withQuery("/alerts/", {
      status: filters.status,
      unit: filters.unit,
      disease: filters.disease,
    }),
    {
      method: "GET",
      token,
    },
  );
}

export function updateOutbreakAlertStatus(
  token: string,
  alertId: string,
  payload: AlertStatusUpdatePayload,
) {
  return apiRequest<OutbreakAlert>(`/alerts/${alertId}/status`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
