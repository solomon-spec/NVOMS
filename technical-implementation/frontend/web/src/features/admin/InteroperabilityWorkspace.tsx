"use client";

import { useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import { API_BASE_URL } from "@/services/api";
import { triggerDhis2Sync, type SyncLog } from "@/services/integrations";
import { formatRole } from "@/shared/format";
import { InlineError, MetricCard, Notice, StatusPill, useToast } from "@/shared/workspace-ui";

export function InteroperabilityWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const { addToast } = useToast();
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  const endpoints = useMemo(
    () => [
      {
        label: "DHIS2 immunization sync",
        method: "POST",
        path: "/dhis2/sync/",
        audience: "Admin",
        status: "Action available",
      },
      {
        label: "FHIR patient export",
        method: "GET",
        path: "/fhir/Patient/{patientId}",
        audience: "Public health official",
        status: "Read endpoint",
      },
      {
        label: "FHIR immunization export",
        method: "GET",
        path: "/fhir/Immunization/{eventId}",
        audience: "Public health official",
        status: "Read endpoint",
      },
      {
        label: "FHIR case observation export",
        method: "GET",
        path: "/fhir/Observation/{caseId}",
        audience: "Public health official",
        status: "Read endpoint",
      },
    ],
    [],
  );

  async function handleDhis2Sync() {
    setIsSyncing(true);
    setError("");
    try {
      const result = await triggerDhis2Sync(token);
      setLastSync(result);
      addToast("DHIS2 sync accepted.", "success");
    } catch {
      setError("Could not trigger DHIS2 sync. Check backend DHIS2 configuration and admin permissions.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Interoperability
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--nv-heading)]">
              DHIS2 and FHIR exchange
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--nv-muted)]">
              Trigger supported sync operations and copy the API paths used for external system integration.
            </p>
          </div>
          <StatusPill label="Admin operations" />
        </div>
      </section>

      {error ? <InlineError message={error} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Integration base" value={shortUrl(API_BASE_URL)} detail={API_BASE_URL} />
        <MetricCard label="FHIR resources" value="3" detail="Patient, Immunization, Observation" />
        <MetricCard label="Last DHIS2 sync" value={lastSync ? formatRole(lastSync.status) : "Not run"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--nv-heading)]">DHIS2 sync</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--nv-muted)]">
            Sends eligible immunization events to the configured DHIS2 target and records a sync log on the backend.
          </p>
          <button
            className="mt-5 min-h-11 rounded bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            disabled={isSyncing}
            onClick={handleDhis2Sync}
          >
            {isSyncing ? "Syncing..." : "Run DHIS2 sync"}
          </button>

          {lastSync ? (
            <div className="mt-5 rounded border border-[var(--nv-border-soft)] bg-[var(--nv-panel)] p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-[var(--nv-heading)]">Latest result</span>
                <StatusPill
                  label={formatRole(lastSync.status)}
                  tone={lastSync.status === "success" ? "success" : lastSync.status === "failed" ? "error" : "warning"}
                />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[var(--nv-muted)]">
                <div>
                  <dt className="text-xs uppercase tracking-wide">Attempted</dt>
                  <dd className="font-semibold text-[var(--nv-heading)]">{lastSync.records_attempted}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide">Synced</dt>
                  <dd className="font-semibold text-[var(--nv-heading)]">{lastSync.records_synced}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <div className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)]">
          <div className="border-b border-[var(--nv-border-soft)] p-5">
            <h2 className="text-lg font-semibold text-[var(--nv-heading)]">Available endpoints</h2>
            <p className="mt-1 text-sm text-[var(--nv-muted)]">
              These are the interoperability paths exposed by the current backend.
            </p>
          </div>
          <div className="divide-y divide-[var(--nv-border-soft)]">
            {endpoints.map((endpoint) => (
              <div className="grid gap-3 p-5 lg:grid-cols-[1fr_120px_1fr_150px]" key={endpoint.path}>
                <div>
                  <p className="font-semibold text-[var(--nv-heading)]">{endpoint.label}</p>
                  <p className="mt-1 text-sm text-[var(--nv-muted)]">{endpoint.audience}</p>
                </div>
                <StatusPill label={endpoint.method} tone={endpoint.method === "POST" ? "brand" : "gray"} />
                <code className="rounded bg-[var(--nv-panel)] px-3 py-2 text-xs text-[var(--nv-heading)]">
                  {endpoint.path}
                </code>
                <StatusPill label={endpoint.status} tone="success" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Notice tone="warning">
        The backend currently exposes DHIS2 sync execution and FHIR read resources. There is not yet a frontend-editable connector settings API for base URLs, credentials, or sync schedules.
      </Notice>
    </div>
  );
}

function shortUrl(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/api\/v1$/, "");
}
