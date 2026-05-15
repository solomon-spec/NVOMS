"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HealthFacility, Patient, PatientStatus } from "@/features/registry/types";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { ArrowRightIcon, ChevronLeftIcon, EyeIcon, PencilIcon, PlusIcon, TimeIcon } from "@/icons";
import { ApiError } from "@/services/api";
import {
  listFacilities,
  listPatientRegistry,
  type PatientRegistryResult,
} from "@/services/patients";
import {
  maskIdentifier,
  maskPhone,
  PrivacyBoundaryBadge,
  PrivacyModeToggle,
  usePrivacyMode,
} from "@/shared/privacy";

const registryStatuses: Array<{ label: string; value: PatientStatus | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Registered", value: "registered" },
  { label: "Verifying", value: "verifying" },
  { label: "Draft", value: "draft" },
  { label: "Inactive", value: "inactive" },
  { label: "Deceased", value: "deceased" },
];

const pageSizeOptions = [25, 50, 100];

const statusTone: Record<
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

const statusLabels: Record<PatientStatus, string> = {
  draft: "Draft",
  verifying: "Verifying",
  registered: "Registered",
  merged: "Merged",
  inactive: "Inactive",
  deceased: "Deceased",
};

export function PatientRegistryWorkspace() {
  const session = useAuthSession();
  const { isPrivacyMode } = usePrivacyMode();
  const token = session?.tokens.accessToken ?? "";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<PatientStatus | "all">("all");
  const [facility, setFacility] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [result, setResult] = useState<PatientRegistryResult>({
    rows: [],
    count: 0,
    page: 1,
    pageSize,
    next: null,
    previous: null,
    isServerPaginated: false,
  });
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentPatientIds, setRecentPatientIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentPatientIds(readRecentPatientIds());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let isActive = true;

    async function loadPatients() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      try {
        const [patientResult, facilityRows] = await Promise.all([
          listPatientRegistry(token, {
            search: debouncedSearch,
            status,
            facility,
            page,
            pageSize,
          }),
          listFacilities(token),
        ]);

        if (!isActive) {
          return;
        }

        setResult(patientResult);
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

    loadPatients();

    return () => {
      isActive = false;
    };
  }, [debouncedSearch, facility, page, pageSize, status, token]);

  const facilityById = useMemo(() => {
    return new Map(facilities.map((row) => [row.id, row]));
  }, [facilities]);

  const totalPages = Math.max(1, Math.ceil(result.count / pageSize));
  const visibleRows = result.isServerPaginated
    ? result.rows
    : result.rows.slice((page - 1) * pageSize, page * pageSize);
  const firstVisible = result.count === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisible = Math.min(page * pageSize, result.count);

  const summary = useMemo(() => {
    const rows = result.rows;
    return {
      total: result.count,
      registered: rows.filter((patient) => patient.status === "registered").length,
      verifying: rows.filter((patient) => patient.status === "verifying").length,
      exceptions: rows.filter((patient) => patient.medical_exception_flag).length,
    };
  }, [result.count, result.rows]);

  const recentPatients = useMemo(() => {
    const rowById = new Map(result.rows.map((patient) => [patient.id, patient]));
    return recentPatientIds
      .map((patientId) => rowById.get(patientId))
      .filter((patient): patient is Patient => Boolean(patient))
      .slice(0, 4);
  }, [recentPatientIds, result.rows]);

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setFacility("all");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="enterprise-title text-2xl">
              Professional Enterprise Patient Registry
            </h1>
            <PrivacyBoundaryBadge />
            <span className="inline-flex items-center gap-1 rounded-full border border-success-500/20 bg-success-500/10 px-2.5 py-1 text-xs font-semibold text-success-300">
              <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
              Live Sync Active
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-gray-400">
              Database: 12.4M records
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-100">
            Search and filter operational records before opening identity
            management or clinical immunization workflows.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PrivacyModeToggle />
          <Link
            href="/patients/new"
            className="enterprise-button-primary inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition focus:outline-hidden focus:ring-3 focus:ring-brand-100 lg:w-auto"
          >
            <PlusIcon className="h-4 w-4 fill-current" />
            Register Patient
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total patients" value={summary.total} />
        <MetricCard label="Registered" value={summary.registered} tone="success" />
        <MetricCard label="Verifying" value={summary.verifying} tone="warning" />
        <MetricCard label="Medical exceptions" value={summary.exceptions} tone="error" />
      </section>

      {recentPatients.length ? (
        <section className="enterprise-card rounded-xl p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Recently opened</h2>
              <p className="enterprise-muted mt-1 text-xs">
                Session shortcuts use UID, age, and status only.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {recentPatients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm transition hover:border-brand-400/50 hover:bg-brand-500/10"
                >
                  <span className="block font-semibold text-blue-light-300">
                    {maskIdentifier(patient.uid)}
                  </span>
                  <span className="enterprise-muted mt-1 block text-xs">
                    {formatAge(patient.date_of_birth)} · {statusLabels[patient.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="enterprise-card overflow-hidden rounded-xl">
        <div className="border-b border-white/10 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_170px_180px_180px_150px_auto]">
            <label className="sr-only" htmlFor="patient-search">
              Search patients
            </label>
            <input
              id="patient-search"
              name="patient-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search UID or patient/caregiver terms"
              className="enterprise-input h-10 px-4 text-sm"
            />

            <button
              type="button"
              className="enterprise-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              Advanced Filters
            </button>

            <label className="sr-only" htmlFor="patient-status">
              Status
            </label>
            <select
              id="patient-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as PatientStatus | "all");
                setPage(1);
              }}
              className="enterprise-input h-10 px-3 text-sm"
            >
              {registryStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="patient-facility">
              Facility
            </label>
            <select
              id="patient-facility"
              value={facility}
              onChange={(event) => {
                setFacility(event.target.value);
                setPage(1);
              }}
              className="enterprise-input h-10 px-3 text-sm"
            >
              <option value="all">All facilities</option>
              {facilities.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.facility_name}
                </option>
              ))}
            </select>

            <select
              className="enterprise-input h-10 px-3 text-sm"
              aria-label="Age group"
              defaultValue="any"
            >
              <option value="any">Age Group: Any</option>
              <option value="infant">Infant</option>
              <option value="child">Child</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="enterprise-button-secondary inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-theme-xs transition"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="enterprise-muted flex flex-col gap-3 border-b border-white/10 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <div>
            Showing{" "}
            <span className="font-semibold text-white/90">
              {firstVisible}-{lastVisible}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-white/90">
              {result.count}
            </span>{" "}
            patients
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-300" htmlFor="page-size">
              Rows
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="enterprise-input h-9 px-2 text-sm"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="m-4 rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm font-medium text-error-300">
            {error}
          </div>
        ) : null}

        <div className="max-h-[640px] overflow-auto" data-testid="patient-registry-table-scroll">
          <Table className="text-left">
            <TableHeader className="sticky top-0 z-10 bg-[#0b1424] text-xs font-semibold uppercase text-gray-400">
              <TableRow>
                <TableCell isHeader className="min-w-[8.75rem] px-5 py-3">
                  UID
                </TableCell>
                <TableCell isHeader className="min-w-[15rem] px-5 py-3">
                  Patient
                </TableCell>
                <TableCell isHeader className="min-w-[7rem] px-5 py-3">
                  Age
                </TableCell>
                <TableCell isHeader className="min-w-[14rem] px-5 py-3">
                  Caregiver
                </TableCell>
                <TableCell isHeader className="min-w-[14rem] px-5 py-3">
                  Facility / Location
                </TableCell>
                <TableCell isHeader className="min-w-[9rem] px-5 py-3">
                  Status
                </TableCell>
                <TableCell isHeader className="min-w-[10rem] px-5 py-3">
                  Updated
                </TableCell>
                <TableCell isHeader className="min-w-[8rem] px-5 py-3 text-right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-white/10 text-sm">
              {isLoading ? (
                <PatientTableSkeleton />
              ) : visibleRows.length ? (
                visibleRows.map((patient) => (
                  <PatientTableRow
                    key={patient.id}
                    patient={patient}
                    facilityName={readFacilityName(patient, facilityById)}
                    isPrivacyMode={isPrivacyMode}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="px-5 py-12 text-center">
                    <div className="mx-auto max-w-sm">
                      <h2 className="text-base font-semibold text-white">
                        No patients found
                      </h2>
                      <p className="enterprise-muted mt-1 text-sm">
                        Adjust the search, status, or facility filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="enterprise-muted text-sm">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isLoading}
              className="enterprise-button-secondary inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-4 w-4 fill-current" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || isLoading}
              className="enterprise-button-secondary inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ArrowRightIcon className="h-4 w-4 fill-current" />
            </button>
          </div>
        </div>
      </section>
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
    success:
      "bg-success-500/15 text-success-300",
    warning:
      "bg-warning-500/15 text-warning-300",
    error: "bg-error-500/15 text-error-300",
  };

  return (
    <article className="enterprise-card rounded-xl p-5">
      <p className="text-sm font-medium text-gray-300">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-2xl font-bold text-white">
          {value.toLocaleString()}
        </span>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}>
          Registry
        </span>
      </div>
      <div className="mt-4 h-7 overflow-hidden rounded bg-gradient-to-r from-transparent via-white/5 to-transparent">
        <div
          className={`mt-4 h-px w-full ${
            tone === "error"
              ? "bg-error-400 shadow-[0_0_16px_rgba(240,68,56,0.65)]"
              : tone === "warning"
                ? "bg-warning-300 shadow-[0_0_16px_rgba(254,200,75,0.55)]"
                : tone === "success"
                  ? "bg-success-300 shadow-[0_0_16px_rgba(50,213,131,0.55)]"
                  : "bg-blue-light-400 shadow-[0_0_16px_rgba(47,143,217,0.65)]"
          }`}
        />
      </div>
    </article>
  );
}

function PatientTableRow({
  facilityName,
  isPrivacyMode,
  patient,
}: {
  patient: Patient;
  facilityName: string;
  isPrivacyMode: boolean;
}) {
  const patientLabel = isPrivacyMode ? "Name hidden" : patient.full_name;
  const caregiverLabel = patient.primary_caregiver
    ? isPrivacyMode
      ? "Caregiver hidden"
      : patient.primary_caregiver.full_name
    : "No caregiver";

  return (
    <TableRow className="enterprise-table-row transition">
      <TableCell className="px-5 py-4 align-top font-semibold text-blue-light-300">
        {maskIdentifier(patient.uid)}
      </TableCell>
      <TableCell className="px-5 py-4 align-top">
        <div className="min-w-0">
          <p className="font-semibold text-white">{patientLabel}</p>
          <p className="enterprise-muted mt-1 text-xs">
            {formatSex(patient.sex)} · {formatAge(patient.date_of_birth)}
          </p>
        </div>
      </TableCell>
      <TableCell className="px-5 py-4 align-top text-gray-300">
        {formatAge(patient.date_of_birth)}
      </TableCell>
      <TableCell className="px-5 py-4 align-top">
        {patient.primary_caregiver ? (
          <div>
            <p className="font-medium text-white/90">
              {caregiverLabel}
            </p>
            <p className="enterprise-muted mt-1 text-xs">
              {patient.primary_caregiver.relationship_to_patient} ·{" "}
              {maskPhone(patient.primary_caregiver.phone_number)}
            </p>
          </div>
        ) : (
          <span className="text-gray-400">No caregiver</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-4 align-top">
        <p className="font-medium text-white/90">{facilityName}</p>
        <p className="enterprise-muted mt-1 text-xs">
          {isPrivacyMode
            ? "Residence hidden"
            : patient.residence_unit?.name ?? "No residence unit"}
        </p>
      </TableCell>
      <TableCell className="px-5 py-4 align-top">
        <div className="flex flex-col items-start gap-2">
          <Badge color={statusTone[patient.status] ?? "light"}>
            {statusLabels[patient.status] ?? patient.status}
          </Badge>
          {patient.medical_exception_flag ? (
            <Badge color="warning">Medical exception</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="enterprise-muted px-5 py-4 align-top">
        {formatDate(patient.updated_at)}
      </TableCell>
      <TableCell className="px-5 py-4 align-top">
        <div className="flex justify-end gap-2">
          <Link
            href={`/patients/${patient.id}`}
            className="enterprise-button-primary grid h-8 w-8 place-items-center rounded-lg"
            aria-label={`Open patient record ${maskIdentifier(patient.uid)}`}
          >
            <EyeIcon className="h-4 w-4 fill-current" />
          </Link>
          <Link
            href={`/patients/${patient.id}`}
            className="enterprise-button-secondary grid h-8 w-8 place-items-center rounded-lg"
            aria-label={`Edit caregiver for ${maskIdentifier(patient.uid)}`}
          >
            <PencilIcon className="h-4 w-4 fill-current" />
          </Link>
          <Link
            href={`/immunizations?patientId=${patient.id}`}
            className="enterprise-button-secondary grid h-8 w-8 place-items-center rounded-lg"
            aria-label={`Open immunization record ${maskIdentifier(patient.uid)}`}
          >
            <TimeIcon className="h-4 w-4 fill-current" />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PatientTableSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <TableRow key={index}>
      {Array.from({ length: 8 }, (__, cellIndex) => (
        <TableCell key={cellIndex} className="px-5 py-4">
          <div className="h-4 w-full max-w-32 animate-pulse rounded bg-white/10" />
        </TableCell>
      ))}
    </TableRow>
  ));
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

function readRecentPatientIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.sessionStorage.getItem("nvoms.recentPatientIds");
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
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

function formatAge(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return "Unknown";
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
    return `${Math.max(0, months)} mo`;
  }

  return `${Math.floor(months / 12)} yr`;
}

function formatSex(value: Patient["sex"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readApiError(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Could not load patient registry.";
}
