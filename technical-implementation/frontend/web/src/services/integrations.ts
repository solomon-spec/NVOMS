import { apiRequest } from "@/services/api";

export interface SyncLog {
  id: string;
  integration_type: "dhis2" | "fhir" | string;
  status: "success" | "failed" | "partial" | string;
  records_attempted: number;
  records_synced: number;
  errors: unknown[];
  triggered_by: string | null;
  started_at: string;
  completed_at: string;
}

export function triggerDhis2Sync(token: string) {
  return apiRequest<SyncLog>("/dhis2/sync/", {
    method: "POST",
    token,
  });
}
