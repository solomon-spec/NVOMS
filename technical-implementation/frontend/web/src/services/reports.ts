import type {
  GeneratedReport,
  QueueReportPayload,
  ReportTemplate,
} from "@/features/reports/types";
import { apiRequest } from "@/services/api";

export const reportTemplates: ReportTemplate[] = [
  {
    code: "DEFAULTER_LIST",
    title: "Defaulter List",
    description: "Patients who missed one or more scheduled vaccinations.",
    endpoint: "defaulters",
  },
  {
    code: "COVERAGE",
    title: "Vaccination Coverage",
    description: "Coverage rates by antigen and administrative scope.",
    endpoint: "coverage",
  },
  {
    code: "AEFI_SURVEILLANCE",
    title: "AEFI Surveillance",
    description: "Adverse events following immunization for review.",
    endpoint: "aefi",
  },
];

export function queueReport(
  token: string,
  endpoint: ReportTemplate["endpoint"],
  payload: QueueReportPayload,
) {
  return apiRequest<GeneratedReport>(`/reports/${endpoint}`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getReportDownload(token: string, reportId: string) {
  return apiRequest<GeneratedReport | { status: string; job_id: string }>(
    `/reports/${reportId}/download`,
    {
      method: "GET",
      token,
    },
  );
}
