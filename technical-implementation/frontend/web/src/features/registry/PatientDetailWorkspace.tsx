"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EditCaregiverModal } from "./components/EditCaregiverModal";

import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthSession } from "@/features/auth/useAuthSession";
import type {
  HealthFacility,
  ImmunizationEvent,
  Patient,
  PatientImmunizationSummary,
  PatientScheduleSlot,
  PatientStatus,
  ScheduleSlotStatus,
} from "@/features/registry/types";
import {
  AlertIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  CopyIcon,
  ErrorIcon,
  PencilIcon,
  TimeIcon,
} from "@/icons";
import { ApiError } from "@/services/api";
import {
  getPatientSummary,
  listFacilities,
  listPatientDoses,
  listPatientSchedule,
  regeneratePatientSchedule,
} from "@/services/patients";

type PatientDetailWorkspaceProps = {
  patientId: string;
};

type DetailTab = "overview" | "schedule" | "doses" | "caregiver";

const patientStatusTone: Record<
  PatientStatus,
  "success" | "warning" | "info" | "light" | "error"
> = {
  draft: "light",
  verifying: "warning",
  registered: "success",
  merged: "info",
  inactive: "light",
  deceased: "error",
};

const scheduleStatusTone: Record<
  ScheduleSlotStatus,
  "success" | "warning" | "info" | "light" | "error"
> = {
  scheduled: "info",
  pending: "warning",
  due_soon: "warning",
  due_today: "warning",
  overdue: "error",
  defaulter: "error",
  administered: "success",
  exempt: "light",
  cancelled: "light",
};

const actionableScheduleStatuses = new Set<ScheduleSlotStatus>([
  "scheduled",
  "pending",
  "due_soon",
  "due_today",
  "overdue",
  "defaulter",
]);

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "doses", label: "Dose history" },
  { id: "caregiver", label: "Caregiver" },
];

export function PatientDetailWorkspace({ patientId }: PatientDetailWorkspaceProps) {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PatientImmunizationSummary | null>(null);
  const [schedule, setSchedule] = useState<PatientScheduleSlot[]>([]);
  const [doses, setDoses] = useState<ImmunizationEvent[]>([]);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadPatientDetail() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      try {
        const [summaryResponse, scheduleRows, doseRows, facilityRows] =
          await Promise.all([
            getPatientSummary(token, patientId),
            listPatientSchedule(token, patientId),
            listPatientDoses(token, patientId),
            listFacilities(token),
          ]);

        if (!isActive) {
          return;
        }

        setPatient(summaryResponse.patient);
        setSummary(summaryResponse.immunization_summary);
        setSchedule(scheduleRows);
        setDoses(doseRows);
        setFacilities(facilityRows);
        setError("");
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

    loadPatientDetail();

    return () => {
      isActive = false;
    };
  }, [patientId, token, notice]); // Added notice as dependency so it reloads on successful edit. Actually, let's just trigger reload manually. Wait, I'll pass a reload function.

  const facilityById = useMemo(() => {
    return new Map(facilities.map((facility) => [facility.id, facility]));
  }, [facilities]);

  const nextActionableSlot =
    schedule.find((slot) => actionableScheduleStatuses.has(slot.status)) ?? null;

  const metrics = useMemo(() => {
    return {
      administered:
        summary?.administered_count ??
        doses.filter((dose) => dose.event_status === "administered").length,
      due: summary?.due_count ?? countScheduleByStatus(schedule, ["due_today", "due_soon"]),
      overdue:
        summary?.overdue_count ?? countScheduleByStatus(schedule, ["overdue", "defaulter"]),
      exempt: countScheduleByStatus(schedule, ["exempt"]),
    };
  }, [doses, schedule, summary]);

  async function handleRegenerateSchedule() {
    if (!token || !patient) {
      return;
    }

    setIsRegenerating(true);
    setNotice("");
    try {
      const response = await regeneratePatientSchedule(token, patient.id);
      setSchedule(response.schedule);
      setNotice(`Schedule regenerated with ${response.created} new slot${response.created === 1 ? "" : "s"}.`);
      setActiveTab("schedule");
    } catch (caughtError) {
      setError(readApiError(caughtError));
    } finally {
      setIsRegenerating(false);
    }
  }

  if (isLoading) {
    return <PatientDetailSkeleton />;
  }

  if (error || !patient) {
    return (
      <div className="space-y-5">
        <BackToRegistry />
        <section className="enterprise-card rounded-xl p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-error-500/15 text-error-300">
              <ErrorIcon className="h-5 w-5 fill-current" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Patient record could not be opened
              </h1>
              <p className="enterprise-muted mt-1 text-sm">
                {error || "The selected patient was not found."}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const facilityName = readFacilityName(patient, facilityById);

  return (
    <div className="space-y-6">
      <BackToRegistry />

      <header className="enterprise-card rounded-xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge color={patientStatusTone[patient.status] ?? "light"}>
                {formatLabel(patient.status)}
              </Badge>
              {patient.medical_exception_flag ? (
                <Badge color="warning">Medical exception</Badge>
              ) : null}
              {summary?.is_zero_dose ? <Badge color="error">Zero dose</Badge> : null}
            </div>

            <h1 className="enterprise-title text-2xl">{patient.full_name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-300">
              <span className="font-semibold text-blue-light-300">{patient.uid}</span>
              <span>{formatSex(patient.sex)}</span>
              <span>DOB {formatDate(patient.date_of_birth)}</span>
              <span>{formatAge(patient.date_of_birth)}</span>
              <span>{facilityName}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <Link
              href={`/immunizations?patientId=${patient.id}`}
              className="enterprise-button-primary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              Record dose
              <ArrowRightIcon className="h-4 w-4 fill-current" />
            </Link>
            <button
              type="button"
              className="enterprise-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold opacity-70"
              disabled
            >
              <PencilIcon className="h-4 w-4 fill-current" />
              Edit patient
            </button>
          </div>
        </div>
      </header>

      {notice ? (
        <div className="rounded-lg border border-success-500/25 bg-success-500/10 px-4 py-3 text-sm font-medium text-success-300">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Administered doses" value={metrics.administered} tone="success" />
        <MetricCard label="Due doses" value={metrics.due} tone="warning" />
        <MetricCard label="Overdue doses" value={metrics.overdue} tone="error" />
        <MetricCard label="Exempt doses" value={metrics.exempt} />
      </section>

      <section className="enterprise-card overflow-hidden rounded-xl">
        <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 pt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-10 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-brand-400 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-5">
          {activeTab === "overview" ? (
            <OverviewTab
              patient={patient}
              summary={summary}
              nextActionableSlot={nextActionableSlot}
              facilityName={facilityName}
            />
          ) : null}

          {activeTab === "schedule" ? (
            <ScheduleTab
              isRegenerating={isRegenerating}
              onRegenerateSchedule={handleRegenerateSchedule}
              schedule={schedule}
            />
          ) : null}

          {activeTab === "doses" ? <DosesTab doses={doses} /> : null}

          {activeTab === "caregiver" ? <CaregiverTab patient={patient} token={token} onUpdated={() => {
            setNotice("Caregiver details updated successfully.");
            // Trigger a re-fetch by clearing patient, or just let user refresh if we don't want complex state.
            // A simple way is to reload the window or refetch.
            window.location.reload();
          }} /> : null}
        </div>
      </section>
    </div>
  );
}

function BackToRegistry() {
  return (
    <Link
      href="/patients"
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white"
    >
      <ChevronLeftIcon className="h-4 w-4 fill-current" />
      Back to Patient Registry
    </Link>
  );
}

function OverviewTab({
  facilityName,
  nextActionableSlot,
  patient,
  summary,
}: {
  facilityName: string;
  nextActionableSlot: PatientScheduleSlot | null;
  patient: Patient;
  summary: PatientImmunizationSummary | null;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <div className="grid gap-4 md:grid-cols-2">
        <DetailItem label="Patient UID" value={patient.uid} strong />
        <DetailItem label="Current status" value={formatLabel(patient.status)} />
        <DetailItem label="Sex" value={formatSex(patient.sex)} />
        <DetailItem label="Date of birth" value={formatDate(patient.date_of_birth)} />
        <DetailItem label="Registered facility" value={facilityName} />
        <DetailItem label="Residence" value={patient.residence_unit?.name ?? "Not recorded"} />
        <DetailItem
          label="Duplicate review"
          value={formatLabel(patient.duplicate_review_status)}
        />
        <DetailItem label="Last updated" value={formatDateTime(patient.updated_at)} />
      </div>

      <aside className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-semibold text-white">Clinical next step</h2>
        {nextActionableSlot ? (
          <div className="mt-4 space-y-3">
            <Badge color={scheduleStatusTone[nextActionableSlot.status]}>
              {formatLabel(nextActionableSlot.status)}
            </Badge>
            <p className="text-lg font-semibold text-white">
              {nextActionableSlot.vaccine.vaccine_name}
            </p>
            <p className="enterprise-muted text-sm">
              Due {formatDate(nextActionableSlot.due_date)}
            </p>
          </div>
        ) : (
          <p className="enterprise-muted mt-3 text-sm">
            No actionable schedule slot is currently available.
          </p>
        )}

        <div className="mt-5 rounded-lg border border-white/10 p-3">
          <p className="text-xs font-semibold uppercase text-gray-400">
            Immunization status
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {summary ? formatLabel(summary.current_status) : "Not evaluated"}
          </p>
          <p className="enterprise-muted mt-1 text-xs">
            Last evaluated{" "}
            {summary?.last_evaluated_at
              ? formatDateTime(summary.last_evaluated_at)
              : "not available"}
          </p>
        </div>
      </aside>
    </div>
  );
}

function ScheduleTab({
  isRegenerating,
  onRegenerateSchedule,
  schedule,
}: {
  isRegenerating: boolean;
  onRegenerateSchedule: () => void;
  schedule: PatientScheduleSlot[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Vaccination schedule</h2>
          <p className="enterprise-muted mt-1 text-sm">
            Review due, overdue, administered, and exempt vaccine slots.
          </p>
        </div>
        <button
          type="button"
          onClick={onRegenerateSchedule}
          disabled={isRegenerating}
          className="enterprise-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TimeIcon className="h-5 w-5 shrink-0 overflow-visible fill-current" />
          {isRegenerating ? "Regenerating" : "Regenerate schedule"}
        </button>
      </div>

      {schedule.length ? (
        <div className="overflow-x-auto">
          <Table className="text-left">
            <TableHeader className="bg-white/[0.03] text-xs font-semibold uppercase text-gray-400">
              <TableRow>
                <TableCell isHeader className="min-w-[13rem] px-5 py-3 text-left">
                  Vaccine
                </TableCell>
                <TableCell isHeader className="min-w-[9rem] px-5 py-3 text-left">
                  Due date
                </TableCell>
                <TableCell isHeader className="min-w-[10rem] px-5 py-3 text-left">
                  Status
                </TableCell>
                <TableCell isHeader className="min-w-[15rem] px-5 py-3 text-left">
                  Notes
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/10 text-sm">
              {schedule.map((slot) => (
                <TableRow key={slot.id} className="enterprise-table-row">
                  <TableCell className="px-5 py-4 font-semibold text-white">
                    {slot.vaccine.vaccine_name}
                    <p className="enterprise-muted mt-1 text-xs">
                      {slot.vaccine.vaccine_code}
                    </p>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-300">
                    {formatDate(slot.due_date)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge color={scheduleStatusTone[slot.status] ?? "light"}>
                      {formatLabel(slot.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="enterprise-muted px-5 py-4">
                    {slot.status_reason ?? "No status note"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No schedule generated"
          description="Generate a schedule when vaccine rules are available for this patient."
        />
      )}
    </div>
  );
}

function DosesTab({ doses }: { doses: ImmunizationEvent[] }) {
  if (!doses.length) {
    return (
      <EmptyState
        title="No administered doses yet"
        description="Dose records will appear here after a health worker records immunization."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white">Dose history</h2>
        <p className="enterprise-muted mt-1 text-sm">
          Review administered, refused, wasted, and contraindicated vaccine events.
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table className="text-left">
          <TableHeader className="bg-white/[0.03] text-xs font-semibold uppercase text-gray-400">
            <TableRow>
              <TableCell isHeader className="min-w-[13rem] px-5 py-3 text-left">
                Vaccine
              </TableCell>
              <TableCell isHeader className="min-w-[10rem] px-5 py-3 text-left">
                Date
              </TableCell>
              <TableCell isHeader className="min-w-[9rem] px-5 py-3 text-left">
                Status
              </TableCell>
              <TableCell isHeader className="min-w-[11rem] px-5 py-3 text-left">
                Batch
              </TableCell>
              <TableCell isHeader className="min-w-[15rem] px-5 py-3 text-left">
                Notes
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/10 text-sm">
            {doses.map((dose) => (
              <TableRow key={dose.id} className="enterprise-table-row">
                <TableCell className="px-5 py-4 font-semibold text-white">
                  {dose.vaccine.vaccine_name}
                  <p className="enterprise-muted mt-1 text-xs">
                    {dose.vaccine.vaccine_code}
                  </p>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-300">
                  {formatDateTime(dose.administered_at)}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <Badge color={dose.event_status === "administered" ? "success" : "warning"}>
                    {formatLabel(dose.event_status)}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-300">
                  {dose.vaccine_batch?.batch_number ?? "No batch"}
                </TableCell>
                <TableCell className="enterprise-muted px-5 py-4">
                  {dose.notes || "No notes"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CaregiverTab({ patient, token, onUpdated }: { patient: Patient; token: string; onUpdated: () => void }) {
  const caregiver = patient.primary_caregiver;
  const [isEditing, setIsEditing] = useState(false);

  if (!caregiver) {
    return (
      <EmptyState
        title="No caregiver linked"
        description="Caregiver details are required before reminder and follow-up workflows can be completed."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2 mb-2 flex justify-end">
        <button
          onClick={() => setIsEditing(true)}
          className="enterprise-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold"
        >
          <PencilIcon className="h-4 w-4 fill-current" />
          Edit Caregiver
        </button>
      </div>
      <DetailItem label="Full name" value={caregiver.full_name} strong />
      <DetailItem label="Relationship" value={caregiver.relationship_to_patient} />
      <DetailItem label="Phone number" value={caregiver.phone_number} />
      <DetailItem label="Residence" value={patient.residence_unit?.name ?? "Not recorded"} />
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-light-500/15 text-blue-light-300">
            <CopyIcon className="h-5 w-5 fill-current" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">
              Reminder readiness
            </h2>
            <p className="enterprise-muted mt-1 text-sm">
              This caregiver has a phone number on file and can be included in
              reminder and defaulter follow-up workflows.
            </p>
          </div>
        </div>
      </div>

      {isEditing && (
        <EditCaregiverModal
          caregiver={caregiver}
          token={token}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            onUpdated();
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  tone = "brand",
  value,
}: {
  label: string;
  value: number;
  tone?: "brand" | "success" | "warning" | "error";
}) {
  const toneClass = {
    brand: "bg-blue-light-500/15 text-blue-light-300",
    success: "bg-success-500/15 text-success-300",
    warning: "bg-warning-500/15 text-warning-300",
    error: "bg-error-500/15 text-error-300",
  };

  return (
    <article className="enterprise-card rounded-xl p-5">
      <p className="text-sm font-medium text-gray-300">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}>
          Patient
        </span>
      </div>
    </article>
  );
}

function DetailItem({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className={`mt-2 text-sm ${strong ? "font-semibold text-white" : "text-gray-200"}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-warning-500/15 text-warning-300">
        <AlertIcon className="h-5 w-5 fill-current" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-white">{title}</h2>
      <p className="enterprise-muted mx-auto mt-1 max-w-md text-sm">{description}</p>
    </div>
  );
}

function PatientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
      <section className="enterprise-card rounded-xl p-5">
        <div className="h-6 w-64 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-white/10" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="enterprise-card h-28 rounded-xl p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-7 w-12 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </section>
    </div>
  );
}

function readFacilityName(
  patient: Patient,
  facilityById: Map<string, HealthFacility>,
) {
  if (!patient.registered_facility) {
    return "No facility";
  }

  return facilityById.get(patient.registered_facility)?.facility_name ?? "Assigned facility";
}

function countScheduleByStatus(
  schedule: PatientScheduleSlot[],
  statuses: ScheduleSlotStatus[],
) {
  const statusSet = new Set(statuses);
  return schedule.filter((slot) => statusSet.has(slot.status)).length;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatAge(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return "Unknown age";
  }

  const today = new Date();
  let months =
    (today.getFullYear() - dob.getFullYear()) * 12 +
    today.getMonth() -
    dob.getMonth();

  if (today.getDate() < dob.getDate()) {
    months -= 1;
  }

  if (months < 24) {
    return `${Math.max(0, months)} months old`;
  }

  return `${Math.floor(months / 12)} years old`;
}

function formatSex(value: Patient["sex"]) {
  return formatLabel(value);
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readApiError(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Could not load patient detail.";
}
