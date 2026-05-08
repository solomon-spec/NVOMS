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
import { ArrowRightIcon, ChevronLeftIcon, GroupIcon, PlusIcon } from "@/icons";
import { ApiError } from "@/services/api";
import {
  listFacilities,
  listPatientRegistry,
  type PatientRegistryResult,
} from "@/services/patients";

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

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setFacility("all");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <GroupIcon className="h-4 w-4 fill-current" />
            Clinical Operations
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Patient Registry
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Search, filter, and review patient records before opening registration or
            clinical workflows.
          </p>
        </div>

        <Link
          href="/patients/new"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:border-brand-700 hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-100 lg:w-auto"
        >
          <PlusIcon className="h-4 w-4 fill-current" />
          Register Patient
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total patients" value={summary.total} />
        <MetricCard label="Registered" value={summary.registered} tone="success" />
        <MetricCard label="Verifying" value={summary.verifying} tone="warning" />
        <MetricCard label="Medical exceptions" value={summary.exceptions} tone="error" />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_220px_auto]">
            <label className="sr-only" htmlFor="patient-search">
              Search patients
            </label>
            <input
              id="patient-search"
              name="patient-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search UID, patient name, or caregiver phone"
              className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />

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
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">All facilities</option>
              {facilities.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.facility_name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 md:flex-row md:items-center md:justify-between">
          <div>
            Showing{" "}
            <span className="font-semibold text-gray-800 dark:text-white/90">
              {firstVisible}-{lastVisible}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-800 dark:text-white/90">
              {result.count}
            </span>{" "}
            patients
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300" htmlFor="page-size">
              Rows
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
          <div className="m-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {error}
          </div>
        ) : null}

        <div className="max-h-[640px] overflow-auto" data-testid="patient-registry-table-scroll">
          <Table className="text-left">
            <TableHeader className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-950 dark:text-gray-400">
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
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
              {isLoading ? (
                <PatientTableSkeleton />
              ) : visibleRows.length ? (
                visibleRows.map((patient) => (
                  <PatientTableRow
                    key={patient.id}
                    patient={patient}
                    facilityName={readFacilityName(patient, facilityById)}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-12 text-center">
                    <div className="mx-auto max-w-sm">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        No patients found
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Adjust the search, status, or facility filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              <ChevronLeftIcon className="h-4 w-4 fill-current" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
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
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
    success:
      "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
    warning:
      "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
    error: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300",
  };

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}>
          Registry
        </span>
      </div>
    </article>
  );
}

function PatientTableRow({
  facilityName,
  patient,
}: {
  patient: Patient;
  facilityName: string;
}) {
  return (
    <TableRow className="bg-white transition hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/[0.03]">
      <TableCell className="px-5 py-4 align-top font-semibold text-brand-700 dark:text-brand-300">
        {patient.uid}
      </TableCell>
      <TableCell className="px-5 py-4 align-top">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">{patient.full_name}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatSex(patient.sex)} · DOB {formatDate(patient.date_of_birth)}
          </p>
        </div>
      </TableCell>
      <TableCell className="px-5 py-4 align-top text-gray-700 dark:text-gray-300">
        {formatAge(patient.date_of_birth)}
      </TableCell>
      <TableCell className="px-5 py-4 align-top">
        {patient.primary_caregiver ? (
          <div>
            <p className="font-medium text-gray-800 dark:text-white/90">
              {patient.primary_caregiver.full_name}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {patient.primary_caregiver.phone_number}
            </p>
          </div>
        ) : (
          <span className="text-gray-400">No caregiver</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-4 align-top">
        <p className="font-medium text-gray-800 dark:text-white/90">{facilityName}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {patient.residence_unit?.name ?? "No residence unit"}
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
      <TableCell className="px-5 py-4 align-top text-gray-500 dark:text-gray-400">
        {formatDate(patient.updated_at)}
      </TableCell>
    </TableRow>
  );
}

function PatientTableSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <TableRow key={index}>
      {Array.from({ length: 7 }, (__, cellIndex) => (
        <TableCell key={cellIndex} className="px-5 py-4">
          <div className="h-4 w-full max-w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
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
