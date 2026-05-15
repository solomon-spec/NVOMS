"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { EditCaregiverModal } from "./components/EditCaregiverModal";

import Badge from "@/components/ui/badge/Badge";
import { useAuthSession } from "@/features/auth/useAuthSession";
import type {
  HealthFacility,
  Patient,
  PatientImmunizationSummary,
  PatientStatus,
} from "@/features/registry/types";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  CopyIcon,
  ErrorIcon,
  PencilIcon,
  TimeIcon,
} from "@/icons";
import { ApiError } from "@/services/api";
import { getPatientSummary, listFacilities } from "@/services/patients";
import {
  maskPhone,
  PrivacyBoundaryBadge,
  PrivacyModeToggle,
  usePrivacyMode,
} from "@/shared/privacy";

type PatientDetailWorkspaceProps = {
  patientId: string;
};

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

export function PatientDetailWorkspace({ patientId }: PatientDetailWorkspaceProps) {
  const session = useAuthSession();
  const { isPrivacyMode } = usePrivacyMode();
  const token = session?.tokens.accessToken ?? "";
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PatientImmunizationSummary | null>(null);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingCaregiver, setIsEditingCaregiver] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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
        const [summaryResponse, facilityRows] = await Promise.all([
          getPatientSummary(token, patientId),
          listFacilities(token),
        ]);

        if (!isActive) {
          return;
        }

        setPatient(summaryResponse.patient);
        setSummary(summaryResponse.immunization_summary);
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
  }, [patientId, reloadKey, token]);

  useEffect(() => {
    if (patient) {
      rememberRecentPatient(patient.id);
    }
  }, [patient]);

  const facilityById = useMemo(() => {
    return new Map(facilities.map((facility) => [facility.id, facility]));
  }, [facilities]);

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
  const displayName = isPrivacyMode ? "Name hidden" : patient.full_name;
  const caregiver = patient.primary_caregiver;

  return (
    <div className="space-y-6">
      <Breadcrumbs patientId={patient.id} />

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
              <PrivacyBoundaryBadge />
            </div>

            <h1 className="enterprise-title text-2xl">{displayName}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-300">
              <span className="font-semibold text-blue-light-300">{patient.uid}</span>
              <span>{formatSex(patient.sex)}</span>
              <span>{formatAge(patient.date_of_birth)}</span>
              <span>{facilityName}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <PrivacyModeToggle />
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="enterprise-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              <CopyIcon className="h-4 w-4 fill-current" />
              Show QR
            </button>
            <button
              type="button"
              onClick={() => setIsEditingCaregiver(true)}
              className="enterprise-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
              disabled={!caregiver}
            >
              <PencilIcon className="h-4 w-4 fill-current" />
              Edit Caregiver
            </button>
            <Link
              href={`/immunizations?patientId=${patient.id}`}
              className="enterprise-button-primary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              Open Immunization Record
              <ArrowRightIcon className="h-4 w-4 fill-current" />
            </Link>
          </div>
        </div>
      </header>

      {notice ? (
        <div className="rounded-lg border border-success-500/25 bg-success-500/10 px-4 py-3 text-sm font-medium text-success-300">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Administered doses" value={summary?.administered_count ?? 0} tone="success" />
        <MetricCard label="Due doses" value={summary?.due_count ?? 0} tone="warning" />
        <MetricCard label="Overdue doses" value={summary?.overdue_count ?? 0} tone="error" />
        <MetricCard label="Current status" value={summary ? formatLabel(summary.current_status) : "Unknown"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <section className="enterprise-card rounded-xl p-5">
            <SectionHeader title="Identity and demographics" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailItem label="Patient UID" value={patient.uid} strong />
              <DetailItem label="Full name" value={displayName} />
              <DetailItem label="Sex" value={formatSex(patient.sex)} />
              <DetailItem label="Date of birth" value={formatDate(patient.date_of_birth)} />
              <DetailItem label="Age" value={formatAge(patient.date_of_birth)} />
              <DetailItem label="Record status" value={formatLabel(patient.status)} />
              <DetailItem
                label="Duplicate review"
                value={formatLabel(patient.duplicate_review_status)}
              />
              <DetailItem label="Last updated" value={formatDateTime(patient.updated_at)} />
            </div>
          </section>

          <section className="enterprise-card rounded-xl p-5">
            <SectionHeader title="Caregiver, facility, and residence" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailItem
                label="Caregiver"
                value={
                  caregiver
                    ? isPrivacyMode
                      ? "Caregiver hidden"
                      : caregiver.full_name
                    : "No caregiver linked"
                }
                strong={Boolean(caregiver)}
              />
              <DetailItem
                label="Relationship"
                value={caregiver?.relationship_to_patient ?? "Not recorded"}
              />
              <DetailItem
                label="Caregiver phone"
                value={
                  caregiver
                    ? isPrivacyMode
                      ? maskPhone(caregiver.phone_number)
                      : caregiver.phone_number
                    : "Not recorded"
                }
              />
              <DetailItem label="Registered facility" value={facilityName} />
              <DetailItem
                label="Residence"
                value={patient.residence_unit?.name ?? "Not recorded"}
              />
              <DetailItem
                label="Medical exception"
                value={patient.medical_exception_flag ? "Flagged" : "Not flagged"}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="enterprise-card rounded-xl p-5">
            <SectionHeader title="Immunization summary" />
            <div className="mt-4 space-y-4">
              <DetailItem
                label="Current status"
                value={summary ? formatLabel(summary.current_status) : "Not evaluated"}
              />
              <DetailItem
                label="Next due date"
                value={summary?.next_due_date ? formatDate(summary.next_due_date) : "None"}
              />
              <DetailItem
                label="Last evaluated"
                value={
                  summary?.last_evaluated_at
                    ? formatDateTime(summary.last_evaluated_at)
                    : "Not available"
                }
              />
              <Link
                href={`/immunizations?patientId=${patient.id}`}
                className="enterprise-button-primary inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
              >
                Open Immunization Record
                <ArrowRightIcon className="h-4 w-4 fill-current" />
              </Link>
            </div>
          </section>

          <section className="enterprise-card rounded-xl p-5">
            <SectionHeader title="UID and QR" />
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">
                QR payload
              </p>
              <p className="mt-2 break-all font-mono text-sm text-white">
                {patient.qr_code_value ?? patient.uid}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="enterprise-button-secondary mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              <CopyIcon className="h-4 w-4 fill-current" />
              Show QR
            </button>
          </section>
        </aside>
      </section>

      {isEditingCaregiver && caregiver ? (
        <EditCaregiverModal
          caregiver={caregiver}
          token={token}
          onClose={() => setIsEditingCaregiver(false)}
          onSuccess={() => {
            setIsEditingCaregiver(false);
            setNotice("Caregiver details updated successfully.");
            setReloadKey((current) => current + 1);
          }}
        />
      ) : null}

      {isQrOpen ? (
        <QrModal
          patient={patient}
          displayName={displayName}
          onClose={() => setIsQrOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Breadcrumbs({ patientId }: { patientId: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <li>
            <Link href="/patients" className="text-gray-400 hover:text-white">
              Patients
            </Link>
          </li>
          <li className="text-gray-500">/</li>
          <li className="text-white">Patient Detail</li>
        </ol>
      </nav>
      <div className="flex flex-wrap gap-2">
        <BackToRegistry />
        <Link
          href={`/immunizations?patientId=${patientId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-light-300 hover:text-blue-light-200"
        >
          Open Immunization Record
          <ArrowRightIcon className="h-4 w-4 fill-current" />
        </Link>
      </div>
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
      Back to Registry
    </Link>
  );
}

function QrModal({
  displayName,
  onClose,
  patient,
}: {
  displayName: string;
  onClose: () => void;
  patient: Patient;
}) {
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1424] p-6 shadow-theme-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-light-300">
              Patient QR
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">{displayName}</h2>
            <p className="enterprise-muted mt-1 text-sm">{patient.uid}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="enterprise-button-secondary grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold"
            aria-label="Close QR"
          >
            x
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-center">
          <div className="mx-auto grid h-40 w-40 place-items-center rounded-xl border border-white/15 bg-white/[0.04]">
            <CopyIcon className="h-12 w-12 fill-current text-blue-light-300" />
          </div>
          <p className="mt-4 break-all font-mono text-sm text-white">
            {patient.qr_code_value ?? patient.uid}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-light-500/15 text-blue-light-300">
        <TimeIcon className="h-5 w-5 fill-current" />
      </span>
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
  );
}

function MetricCard({
  label,
  tone = "brand",
  value,
}: {
  label: string;
  value: number | string;
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
        <span className="text-2xl font-bold text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}>
          Summary
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
      <p className={`mt-2 break-words text-sm ${strong ? "font-semibold text-white" : "text-gray-200"}`}>
        {value}
      </p>
    </div>
  );
}

function PatientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-56 animate-pulse rounded bg-white/10" />
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

function rememberRecentPatient(patientId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const key = "nvoms.recentPatientIds";
  try {
    const current = window.sessionStorage.getItem(key);
    const ids = current ? (JSON.parse(current) as string[]) : [];
    window.sessionStorage.setItem(
      key,
      JSON.stringify([patientId, ...ids.filter((id) => id !== patientId)].slice(0, 5)),
    );
  } catch {
    window.sessionStorage.setItem(key, JSON.stringify([patientId]));
  }
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
