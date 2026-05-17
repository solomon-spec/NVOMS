"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";
import {
  Device,
  RegisterDevicePayload,
  SyncConfig,
  disableDevice,
  getSyncConfig,
  listDevices,
  registerDevice,
} from "@/services/offline";
import {
  AlertBanner,
  ConfirmModal,
  EmptyState,
  InlineError,
  MetricCard,
  SkeletonCard,
  StatusPill,
  useToast,
} from "@/shared/workspace-ui";
import { formatRole } from "@/shared/format";

const emptyDeviceForm: RegisterDevicePayload = {
  device_name: "",
  device_type: "browser",
  device_os: "web",
  app_version: "1.0",
};

export function OfflineSyncWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const { addToast } = useToast();

  const [isOnline, setIsOnline] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Register device form
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState(emptyDeviceForm);
  const [isRegistering, setIsRegistering] = useState(false);

  // Disable confirm
  const [confirmDisableId, setConfirmDisableId] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const [deviceRows, configData] = await Promise.allSettled([
          listDevices(token),
          getSyncConfig(token),
        ]);
        if (!active) return;
        if (deviceRows.status === "fulfilled") setDevices(deviceRows.value);
        if (configData.status === "fulfilled") setSyncConfig(configData.value);
        setError("");
      } catch {
        if (active) setError("Failed to load offline sync data.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [token]);

  async function handleRegisterDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setIsRegistering(true);
    try {
      // Auto-detect OS/browser info
      const payload: RegisterDevicePayload = {
        ...deviceForm,
        device_os: navigator.platform || "web",
        app_version: "1.0",
      };
      const device = await registerDevice(token, payload);
      setDevices((prev) => [...prev, device]);
      addToast(`Device "${device.device_name}" registered successfully.`, "success");
      setIsRegisterOpen(false);
      setDeviceForm(emptyDeviceForm);
    } catch {
      addToast("Failed to register device. Ensure the device name is unique.", "error");
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleDisableDevice() {
    if (!confirmDisableId || !token) return;
    setIsDisabling(true);
    try {
      await disableDevice(token, confirmDisableId);
      setDevices((prev) =>
        prev.map((d) => (d.id === confirmDisableId ? { ...d, status: "disabled" as const } : d))
      );
      addToast("Device disabled.", "success");
    } catch {
      addToast("Failed to disable device.", "error");
    } finally {
      setIsDisabling(false);
      setConfirmDisableId(null);
    }
  }

  const activeDevices = devices.filter((d) => d.status === "active");
  const disabledDevices = devices.filter((d) => d.status === "disabled");

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Offline Sync
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Device Management & Sync
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Register devices for offline vaccination recording. After reconnecting, submit sync batches to push
              collected records to the server.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                isOnline
                  ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                  : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-success-500" : "bg-error-500"}`} />
              {isOnline ? "Online" : "Offline — sync when reconnected"}
            </div>
          </div>
        </div>
      </section>

      {/* Offline warning */}
      {!isOnline && (
        <AlertBanner tone="warning">
          <strong>You are offline.</strong> Device registration and sync submission require an internet connection.
          Immunization events recorded now will be included in your next sync batch.
        </AlertBanner>
      )}

      {error && <InlineError message={error} />}

      {/* Config metrics */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Registered Devices" value={String(devices.length)} icon="DV" tone="brand" />
          <MetricCard label="Active Devices" value={String(activeDevices.length)} icon="ON" tone="success" />
          <MetricCard label="Disabled Devices" value={String(disabledDevices.length)} icon="OFF" tone="error" />
          <MetricCard
            label="Max Batch Size"
            value={syncConfig ? `${syncConfig.max_batch_size} records` : "—"}
            icon="BX"
            tone="warning"
          />
        </div>
      )}

      {/* Sync config info */}
      {syncConfig && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Configuration</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Server-reported sync settings for this environment.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Recommended sync interval", value: `${syncConfig.recommended_sync_interval_minutes} min` },
              { label: "API version", value: syncConfig.api_version },
              { label: "Supported entity types", value: syncConfig.supported_entity_types.join(", ") },
              { label: "Server time", value: new Date(syncConfig.server_time).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Devices section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Registered Devices</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Devices registered to your account for offline data collection.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-700 disabled:opacity-60"
            disabled={!isOnline}
            title={isOnline ? "Register this browser as a device" : "Go online to register a device"}
            onClick={() => setIsRegisterOpen(true)}
          >
            + Register Device
          </button>
        </div>

        {isLoading ? (
          <SkeletonCard lines={3} />
        ) : devices.length === 0 ? (
          <EmptyState icon="DV">
            No devices registered yet. Click &ldquo;Register Device&rdquo; to add this browser as an offline-capable device.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className={`rounded-2xl border p-5 ${
                  device.status === "active"
                    ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
                    : "border-dashed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-white/[0.01]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {device.device_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {device.device_type} · {device.device_os}
                    </p>
                  </div>
                  <StatusPill
                    label={formatRole(device.status)}
                    tone={device.status === "active" ? "success" : "gray"}
                  />
                </div>
                <div className="mt-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <p>Registered: {new Date(device.registered_at).toLocaleDateString()}</p>
                  {device.last_seen_at && (
                    <p>Last seen: {new Date(device.last_seen_at).toLocaleString()}</p>
                  )}
                </div>
                {device.status === "active" && (
                  <button
                    className="mt-4 text-xs font-semibold text-error-600 hover:text-error-700 dark:text-error-400"
                    onClick={() => setConfirmDisableId(device.id)}
                  >
                    Disable device
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sync batch info */}
      <section className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">SYNC</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sync Batch Submission</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Sync batch submission is handled from the mobile application. When the app reconnects, it automatically
              submits collected offline records to the backend via <code className="rounded bg-gray-200 px-1 text-xs dark:bg-gray-800">POST /offline/sync/batches</code>.
              Conflicts are flagged and can be resolved here once the batch list endpoint is available per-session.
            </p>
            <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">
              A per-user batch history (<code className="rounded bg-gray-200 px-1 text-xs dark:bg-gray-800">GET /offline/sync/batches</code>) is not yet scoped per-user by
              the backend &mdash; it currently returns all batches, so per-user history UI will be enabled once this is added.
            </p>
          </div>
        </div>
      </section>

      {/* Register Device Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Register Device</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Register this browser as an offline-capable device for your account.
            </p>
            <form className="mt-5 space-y-4" onSubmit={handleRegisterDevice}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Device Name <span className="text-error-500">*</span>
                </span>
                <input
                  required
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. Field Tablet 01"
                  value={deviceForm.device_name}
                  onChange={(e) => setDeviceForm((f) => ({ ...f, device_name: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Device Type</span>
                <select
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={deviceForm.device_type}
                  onChange={(e) => setDeviceForm((f) => ({ ...f, device_type: e.target.value }))}
                >
                  <option value="browser">Browser</option>
                  <option value="tablet">Tablet</option>
                  <option value="phone">Phone</option>
                  <option value="laptop">Laptop</option>
                </select>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  disabled={isRegistering}
                  onClick={() => setIsRegisterOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  disabled={isRegistering}
                >
                  {isRegistering ? "Registering…" : "Register Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm disable */}
      <ConfirmModal
        isOpen={confirmDisableId !== null}
        title="Disable Device"
        message="Disabling this device prevents it from submitting new sync batches. You can re-enable it from the backend admin. Proceed?"
        confirmLabel="Disable"
        isLoading={isDisabling}
        onConfirm={handleDisableDevice}
        onCancel={() => setConfirmDisableId(null)}
      />
    </div>
  );
}
