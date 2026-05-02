"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type {
  ImmunizationEvent,
  PatientScheduleSlot,
  PatientSummary,
} from "@/features/registry/types";
import { ApiError } from "@/services/api";
import {
  getMyPatient,
  listMyPatientDoses,
  listMyPatientSchedule,
} from "@/services/patients";
import { formatRole } from "@/shared/format";

export function PatientSelfService() {
  const session = useAuthSession();
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [doses, setDoses] = useState<ImmunizationEvent[]>([]);
  const [schedule, setSchedule] = useState<PatientScheduleSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const token = session?.tokens.accessToken ?? "";

  useEffect(() => {
    let isActive = true;

    async function loadMyRecord() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      try {
        const [patientSummary, doseRows, scheduleRows] = await Promise.all([
          getMyPatient(token),
          listMyPatientDoses(token),
          listMyPatientSchedule(token),
        ]);

        if (isActive) {
          setSummary(patientSummary);
          setDoses(doseRows);
          setSchedule(scheduleRows);
          setError("");
        }
      } catch (caughtError) {
        if (isActive) {
          setError(readApiError(caughtError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadMyRecord();

    return () => {
      isActive = false;
    };
  }, [token]);

  const upcoming = useMemo(
    () =>
      schedule
        .filter((slot) =>
          ["scheduled", "pending", "due_soon", "due_today", "overdue"].includes(
            slot.status,
          ),
        )
        .slice(0, 5),
    [schedule],
  );

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading your patient record...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-error-200 bg-error-25 p-6 text-sm font-medium text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
        {error}
      </section>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          My patient record
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {summary.patient.full_name}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {summary.patient.uid} · {formatRole(summary.patient.sex)} · born{" "}
              {summary.patient.date_of_birth}
            </p>
          </div>
          <StatusPill
            label={
              summary.immunization_summary
                ? formatRole(summary.immunization_summary.current_status)
                : "Unknown"
            }
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Next due"
          value={summary.immunization_summary?.next_due_date ?? "None"}
        />
        <MetricCard
          label="Due"
          value={String(summary.immunization_summary?.due_count ?? 0)}
        />
        <MetricCard
          label="Overdue"
          value={String(summary.immunization_summary?.overdue_count ?? 0)}
        />
        <MetricCard
          label="Doses"
          value={String(summary.immunization_summary?.administered_count ?? 0)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming schedule
          </h2>
          <div className="mt-4 space-y-3">
            {upcoming.length ? (
              upcoming.map((slot) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                  key={slot.id}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {slot.vaccine.vaccine_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Due {slot.due_date}
                    </p>
                  </div>
                  <StatusPill label={formatRole(slot.status)} />
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                No upcoming schedule slots.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dose history
          </h2>
          <div className="mt-4 space-y-3">
            {doses.length ? (
              doses.map((dose) => (
                <div
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                  key={dose.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dose.vaccine.vaccine_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(dose.administered_at)}
                      </p>
                    </div>
                    <StatusPill label={formatRole(dose.event_status)} />
                  </div>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    {dose.vaccine_batch
                      ? `Batch ${dose.vaccine_batch.batch_number}`
                      : "No batch recorded"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                No doses recorded yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
      {label}
    </span>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function readApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Could not reach the backend. Confirm the API is running on port 8000.";
}
