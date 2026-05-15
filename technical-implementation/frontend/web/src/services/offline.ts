import { apiRequest } from "@/services/api";

// ── Types ───────────────────────────────────────────────────────────────────

export interface Device {
  id: string;
  device_name: string;
  device_type: string;
  device_os: string;
  app_version: string;
  status: "active" | "disabled";
  last_seen_at: string | null;
  registered_at: string;
}

export interface RegisterDevicePayload {
  device_name: string;
  device_type: string;
  device_os: string;
  app_version: string;
}

export interface SyncBatch {
  id: string;
  device: string;
  status: "pending" | "processing" | "processed" | "conflict" | "failed";
  record_count: number;
  conflict_count: number;
  submitted_at: string;
  acknowledged_at: string | null;
}

export interface SyncBatchItem {
  id: string;
  entity_type: string;
  operation_type: string;
  client_record_id: string;
  item_status: "applied" | "conflict" | "rejected";
  server_record_id: string | null;
  conflict_reason: string | null;
}

export interface SyncConfig {
  max_batch_size: number;
  supported_entity_types: string[];
  supported_operation_types: string[];
  recommended_sync_interval_minutes: number;
  server_time: string;
  api_version: string;
}

// ── Device endpoints ────────────────────────────────────────────────────────

export function listDevices(token: string): Promise<Device[]> {
  return apiRequest<Device[]>("/offline/devices", { method: "GET", token });
}

export function registerDevice(token: string, payload: RegisterDevicePayload): Promise<Device> {
  return apiRequest<Device>("/offline/devices", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function disableDevice(token: string, deviceId: string): Promise<void> {
  return apiRequest<void>(`/offline/devices/${deviceId}`, {
    method: "DELETE",
    token,
  });
}

// ── Sync batch endpoints ────────────────────────────────────────────────────

export function listSyncBatches(token: string): Promise<SyncBatch[]> {
  return apiRequest<SyncBatch[]>(`/offline/sync/batches`, {
    method: "GET",
    token,
  });
}

export function getSyncBatchItems(token: string, batchId: string): Promise<SyncBatchItem[]> {
  return apiRequest<SyncBatchItem[]>(`/offline/sync/batches/${batchId}/items`, {
    method: "GET",
    token,
  });
}

export function resolveSyncConflict(
  token: string,
  batchId: string,
  itemId: string,
  resolution: "keep_server" | "keep_client",
): Promise<SyncBatchItem> {
  return apiRequest<SyncBatchItem>(
    `/offline/sync/batches/${batchId}/items/${itemId}/resolve`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ resolution }),
    },
  );
}

// ── Sync config ─────────────────────────────────────────────────────────────

export function getSyncConfig(token: string): Promise<SyncConfig> {
  return apiRequest<SyncConfig>("/offline/sync/config", { method: "GET", token });
}
