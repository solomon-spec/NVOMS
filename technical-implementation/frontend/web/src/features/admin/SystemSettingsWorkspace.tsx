"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import { API_BASE_URL } from "@/services/api";
import { getFacilities, getGeography, getRoles } from "@/services/admin";
import { logoutAll } from "@/services/auth";
import {
  InlineError,
  MetricCard,
  Notice,
  SkeletonCard,
  StatusPill,
  useToast,
} from "@/shared/workspace-ui";

export function SystemSettingsWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const { addToast } = useToast();

  const [counts, setCounts] = useState({ roles: 0, facilities: 0, geography: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const [roles, facilities, geography] = await Promise.all([
          getRoles(token),
          getFacilities(token),
          getGeography(token, { active: true }),
        ]);
        if (!active) return;
        setCounts({ roles: roles.length, facilities: facilities.length, geography: geography.length });
        setError("");
      } catch {
        if (active) setError("Could not load system readiness checks.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  const readiness = useMemo(
    () => [
      {
        label: "Roles configured",
        ready: counts.roles > 0,
        detail: counts.roles ? `${counts.roles} role records` : "Create roles in Admin Console",
      },
      {
        label: "Facilities configured",
        ready: counts.facilities > 0,
        detail: counts.facilities ? `${counts.facilities} facilities` : "Add facilities before registering patients",
      },
      {
        label: "Geography imported",
        ready: counts.geography > 0,
        detail: counts.geography ? `${counts.geography} active units` : "Import HDX data from the dataset folder",
      },
    ],
    [counts],
  );

  async function handleLogoutAll() {
    if (!session) return;
    setIsLoggingOut(true);
    try {
      await logoutAll(session);
      addToast("All sessions were signed out.", "success");
    } catch {
      addToast("Could not sign out all sessions.", "error");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          System Settings
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--nv-heading)]">
              Environment, data readiness, and security controls
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--nv-muted)]">
              A compact control room for the configuration that keeps the operational pages understandable.
            </p>
          </div>
          <StatusPill label="Admin only" />
        </div>
      </section>

      {error ? <InlineError message={error} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map((item) => <SkeletonCard key={item} lines={2} />)
        ) : (
          <>
            <MetricCard label="API base" value={shortUrl(API_BASE_URL)} detail={API_BASE_URL} />
            <MetricCard label="Facilities" value={String(counts.facilities)} />
            <MetricCard label="Geography units" value={String(counts.geography)} />
            <MetricCard label="Roles" value={String(counts.roles)} />
          </>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-5">
          <h2 className="text-lg font-semibold text-[var(--nv-heading)]">Setup checklist</h2>
          <div className="mt-4 divide-y divide-[var(--nv-border-soft)]">
            {readiness.map((item) => (
              <div className="flex items-center justify-between gap-4 py-4" key={item.label}>
                <div>
                  <p className="text-sm font-semibold text-[var(--nv-heading)]">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--nv-muted)]">{item.detail}</p>
                </div>
                <StatusPill label={item.ready ? "Ready" : "Needs setup"} tone={item.ready ? "success" : "warning"} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-5">
            <h2 className="text-lg font-semibold text-[var(--nv-heading)]">Demo data commands</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--nv-muted)]">
              Import geography first, then load generated demo data with automatic geography mapping.
            </p>
            <CodeBlock value="./nvoms_env/bin/python manage.py import_hdx_admin_boundaries --source ../data/datasets/eth_admin_boundaries.xlsx --geojson-source ../data/datasets/eth_admin_boundaries.shp.zip" />
            <CodeBlock value="./nvoms_env/bin/python manage.py load_demo_data ../data/demo/demo-data-huge-no-geography.json --namespace quality-demo --reset --auto-geography" />
          </div>

          <div className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-5">
            <h2 className="text-lg font-semibold text-[var(--nv-heading)]">Security</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--nv-muted)]">
              Sign out every active session for your account after demos, shared-device testing, or password rotation.
            </p>
            <button
              className="mt-4 min-h-11 rounded border border-error-200 bg-error-50 px-4 text-sm font-semibold text-error-700 hover:bg-error-100 disabled:opacity-60 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200"
              disabled={isLoggingOut}
              onClick={handleLogoutAll}
            >
              {isLoggingOut ? "Signing out..." : "Sign out all my sessions"}
            </button>
          </div>
        </div>
      </section>

      <Notice tone="brand">
        Settings that mutate global backend behavior, such as notification gateway credentials or DHIS2/FHIR base URLs, still live in server environment variables. The Interoperability page exposes the operational actions currently supported by the API.
      </Notice>
    </div>
  );
}

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded bg-gray-950 p-3 text-xs leading-5 text-gray-100">
      <code>{value}</code>
    </pre>
  );
}

function shortUrl(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/api\/v1$/, "");
}
