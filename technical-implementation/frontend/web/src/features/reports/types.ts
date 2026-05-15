export type ReportCode = "DEFAULTER_LIST" | "COVERAGE" | "AEFI_SURVEILLANCE";

export type ReportOutputFormat = "pdf" | "csv";

export type ReportGenerationStatus = "processing" | "completed" | "failed";

export type QueueReportPayload = {
  output_format?: ReportOutputFormat;
  facility_id?: string | null;
  unit_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
};

export type GeneratedReport = {
  id: string;
  report_code: ReportCode;
  report_name: string;
  output_format: ReportOutputFormat;
  generation_status: ReportGenerationStatus;
  parameter_payload: Record<string, string> | null;
  file_uri: string | null;
  requested_at: string;
  completed_at: string | null;
};

export type ReportTemplate = {
  code: ReportCode;
  title: string;
  description: string;
  endpoint: "defaulters" | "coverage" | "aefi";
};
