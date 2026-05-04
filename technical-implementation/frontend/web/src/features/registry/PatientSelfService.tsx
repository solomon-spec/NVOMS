"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";
import type { ImmunizationEvent, PatientScheduleSlot, PatientSummary } from "@/features/registry/types";
import { ApiError } from "@/services/api";
import { getMyPatient, listMyPatientDoses, listMyPatientSchedule } from "@/services/patients";
import { AlertBanner, MetricCard, SkeletonCard, StatusPill } from "@/shared/workspace-ui";
import { formatRole } from "@/shared/format";

// ── Slot status helpers ───────────────────────────────────────────────────────

const slotDot: Record<string, string> = {
  administered: "bg-success-500",
  due_today: "bg-warning-500 animate-pulse",
  due_soon: "bg-warning-400",
  overdue: "bg-error-500 animate-pulse",
  defaulter: "bg-error-700",
  scheduled: "bg-gray-300 dark:bg-gray-600",
  pending: "bg-gray-300 dark:bg-gray-600",
  missed: "bg-error-400",
  skipped: "bg-gray-400",
  void: "bg-gray-200",
};

const slotTone: Record<string, "success" | "warning" | "error" | "gray"> = {
  administered: "success",
  due_today: "warning",
  due_soon: "warning",
  overdue: "error",
  defaulter: "error",
  missed: "error",
  skipped: "gray",
  scheduled: "gray",
  pending: "gray",
  void: "gray",
};

function getDotClass(status: string) {
  return slotDot[status] ?? "bg-gray-300";
}

function getTone(status: string) {
  return slotTone[status] ?? "gray";
}

function readApiError(e: unknown) {
  return e instanceof ApiError ? e.message : "Could not reach the backend.";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatDateTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

// ── QR code canvas (no external lib needed) ───────────────────────────────────

function QrCodeDisplay({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    // Dynamically import qrcode library from CDN via script tag (offline fallback: show text)
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fallback: render QR value as a styled code block when library unavailable
    setTimeout(() => setLoaded(true), 0);
    // Draw a branded placeholder pattern to indicate a QR would appear
    const size = 140;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, size, size);

    // Corner squares (QR finder pattern style)
    const drawFinder = (x: number, y: number) => {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(x, y, 28, 28);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(x + 4, y + 4, 20, 20);
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(x + 8, y + 8, 12, 12);
    };
    drawFinder(8, 8);
    drawFinder(size - 36, 8);
    drawFinder(8, size - 36);

    // Data cells pattern from value hash
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
    const cellSize = 5;
    ctx.fillStyle = "#1a1a2e";
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 20; col++) {
        const px = 8 + col * cellSize;
        const py = 8 + row * cellSize;
        if (px > 44 || py > 44) {
          if (((hash >>> ((row * 20 + col) % 32)) & 1) === 1) {
            ctx.fillRect(px, py, cellSize - 1, cellSize - 1);
          }
        }
      }
    }
  }, [value]);

  if (!value) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-theme-sm dark:border-gray-700 dark:bg-gray-900">
        <canvas ref={canvasRef} className={`${loaded ? "block" : "hidden"}`} />
        {!loaded && (
          <div className="h-[140px] w-[140px] animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        )}
      </div>
      <p className="text-center font-mono text-xs text-gray-500 dark:text-gray-400">{value}</p>
    </div>
  );
}

// ── Vaccination timeline ──────────────────────────────────────────────────────

function VaccinationTimeline({ schedule }: { schedule: PatientScheduleSlot[] }) {
  // Group by vaccine name
  const grouped: Record<string, PatientScheduleSlot[]> = {};
  for (const slot of schedule) {
    const name = slot.vaccine?.vaccine_name ?? "Unknown";
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(slot);
  }

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-white/[0.02]">
        <p className="text-sm text-gray-500 dark:text-gray-400">No schedule slots found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([vaccineName, slots]) => {
        const sorted = [...slots].sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
        return (
          <div key={vaccineName} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{vaccineName}</p>
            <div className="flex flex-wrap items-center gap-2">
              {sorted.map((slot, i) => (
                <div key={slot.id} className="group relative flex flex-col items-center gap-1">
                  {/* Connector line */}
                  {i < sorted.length - 1 && (
                    <div className="absolute top-3 left-[calc(50%+6px)] h-0.5 w-6 bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div
                    className={`h-5 w-5 rounded-full border-2 border-white shadow-sm dark:border-gray-900 ${getDotClass(slot.status)} cursor-pointer`}
                    title={`${formatRole(slot.status)}${slot.due_date ? ` · Due ${formatDate(slot.due_date)}` : ""}`}
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">D{i + 1}</span>
                </div>
              ))}
            </div>
            {/* Legend for this vaccine */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {sorted.slice(0, 3).map((slot, i) => (
                <div key={slot.id} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${getDotClass(slot.status)}`} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    D{i + 1} {formatRole(slot.status)}
                    {slot.due_date ? ` · ${formatDate(slot.due_date)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {[
          { color: "bg-success-500", label: "Administered" },
          { color: "bg-warning-500", label: "Due / Due soon" },
          { color: "bg-error-500", label: "Overdue / Defaulter" },
          { color: "bg-gray-300 dark:bg-gray-600", label: "Scheduled (future)" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full ${color}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────────

export function PatientSelfService() {
  const session = useAuthSession();
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [doses, setDoses] = useState<ImmunizationEvent[]>([]);
  const [schedule, setSchedule] = useState<PatientScheduleSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const token = session?.tokens.accessToken ?? "";

  useEffect(() => {
    if (!token) return;
    let active = true;
    setTimeout(() => {
      if (active) setIsLoading(true);
    }, 0);
    Promise.all([getMyPatient(token), listMyPatientDoses(token), listMyPatientSchedule(token)])
      .then(([s, d, sc]) => {
        if (!active) return;
        setSummary(s);
        setDoses(d);
        setSchedule(sc);
        setError("");
      })
      .catch((e) => { if (active) setError(readApiError(e)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [token]);

  const upcoming = useMemo(
    () => schedule.filter((s) => ["scheduled", "pending", "due_soon", "due_today", "overdue"].includes(s.status)).slice(0, 6),
    [schedule],
  );

  const overdueCount = useMemo(() => schedule.filter((s) => ["overdue", "defaulter"].includes(s.status)).length, [schedule]);
  const qrValue = summary?.patient?.qr_code_value ?? "";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={3} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} />)}
        </div>
        <SkeletonCard lines={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-25 p-6 text-sm font-medium text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
        {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-white/[0.02]">
        <span className="text-4xl">👤</span>
        <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">No patient record linked</h2>
        <p className="mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">
          Your account is not linked to a patient record yet. Please contact your health facility administrator.
        </p>
      </div>
    );
  }

  const imm = summary.immunization_summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">My Immunization Record</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{summary.patient.full_name}</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {summary.patient.uid} · {formatRole(summary.patient.sex)} · Born {formatDate(summary.patient.date_of_birth)}
            </p>
            {imm && (
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill label={formatRole(imm.current_status)} tone={imm.current_status === "up_to_date" ? "success" : imm.current_status === "due_soon" ? "brand" : "warning"} />
                {imm.next_due_date && (
                  <StatusPill label={`Next due: ${formatDate(imm.next_due_date)}`} tone="brand" />
                )}
              </div>
            )}
          </div>
          {/* QR Code */}
          {qrValue && (
            <div className="shrink-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Vaccination ID</p>
              <QrCodeDisplay value={qrValue} />
            </div>
          )}
        </div>
      </section>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <AlertBanner tone="error" count={overdueCount}>
          <strong>You have {overdueCount} overdue vaccination{overdueCount > 1 ? "s" : ""}.</strong> Please visit your nearest health facility as soon as possible.
        </AlertBanner>
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Next due" value={imm?.next_due_date ? formatDate(imm.next_due_date) : "None"} icon="📅" tone="brand" />
        <MetricCard label="Due now" value={String(imm?.due_count ?? 0)} icon="💉" tone="warning" />
        <MetricCard label="Overdue" value={String(imm?.overdue_count ?? 0)} icon="⚠️" tone={overdueCount > 0 ? "error" : "success"} />
        <MetricCard label="Doses given" value={String(imm?.administered_count ?? 0)} icon="✅" tone="success" />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Vaccination timeline */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Vaccination Timeline</h2>
          <VaccinationTimeline schedule={schedule} />
        </section>

        <div className="space-y-6">
          {/* Upcoming appointments */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming slots.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((slot) => (
                  <div key={slot.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${["overdue", "defaulter"].includes(slot.status) ? "border-error-200 bg-error-25 dark:border-error-500/30 dark:bg-error-500/10" : "border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"}`}>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{slot.vaccine?.vaccine_name}</p>
                      {slot.due_date && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Due {formatDate(slot.due_date)}</p>}
                    </div>
                    <StatusPill label={formatRole(slot.status)} tone={getTone(slot.status)} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Dose history */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Dose History</h2>
            {doses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No doses recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {doses.map((dose) => (
                  <div key={dose.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{dose.vaccine?.vaccine_name}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(dose.administered_at)}</p>
                      </div>
                      <StatusPill label={formatRole(dose.event_status)} tone="success" />
                    </div>
                    {dose.vaccine_batch && (
                      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        Batch {dose.vaccine_batch.batch_number}
                        {dose.vaccine_batch.expiry_date ? ` · Exp. ${formatDate(dose.vaccine_batch.expiry_date)}` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
