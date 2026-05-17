"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type {
  AdministrativeUnitBrief,
  HealthFacility,
} from "@/features/registry/types";
import type {
  GeneratedReport,
  QueueReportPayload,
  ReportOutputFormat,
} from "@/features/reports/types";
import { ApiError } from "@/services/api";
import {
  listAdministrativeUnits,
  listFacilities,
} from "@/services/patients";
import {
  getReportDownload,
  queueReport,
  reportTemplates,
} from "@/services/reports";
import { formatRole } from "@/shared/format";
import {
  EmptyState,
  InlineError,
  MetricCard,
  Notice,
  SelectInput,
  StatusPill,
  TextInput,
} from "@/shared/workspace-ui";

const emptyReportForm = {
  output_format: "pdf" as ReportOutputFormat,
  facility_id: "",
  unit_id: "",
  date_from: "",
  date_to: "",
};

export function ReportsWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [units, setUnits] = useState<AdministrativeUnitBrief[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<(typeof reportTemplates)[number]["endpoint"]>("defaulters");
  const [form, setForm] = useState(emptyReportForm);
  const [jobs, setJobs] = useState<GeneratedReport[]>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(`nvoms_jobs_${session?.user?.id || "guest"}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return [];
  });
  const [selectedJobId, setSelectedJobId] = useState("");
  const [isLoadingReference, setIsLoadingReference] = useState(true);
  const [isQueueing, setIsQueueing] = useState(false);
  const [checkingJobId, setCheckingJobId] = useState("");
  const [error, setError] = useState("");
  const [jobError, setJobError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedTemplate =
    reportTemplates.find((template) => template.endpoint === selectedEndpoint) ??
    reportTemplates[0];
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadReferenceData() {
      if (!token) {
        return;
      }

      setIsLoadingReference(true);
      try {
        const [facilityRows, unitRows] = await Promise.all([
          listFacilities(token),
          listAdministrativeUnits(token),
        ]);
        if (isActive) {
          setFacilities(facilityRows);
          setUnits(unitRows);
          setError("");
        }
      } catch (caughtError) {
        if (isActive) {
          setError(readApiError(caughtError));
        }
      } finally {
        if (isActive) {
          setIsLoadingReference(false);
        }
      }
    }

    loadReferenceData();
    return () => {
      isActive = false;
    };
  }, [token]);

  // Persist jobs to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `nvoms_jobs_${session?.user?.id || "guest"}`,
        JSON.stringify(jobs),
      );
    }
  }, [jobs, session?.user?.id]);

  // Auto-poll processing jobs every 10 seconds
  useEffect(() => {
    const processingJobs = jobs.filter(
      (j) => j.generation_status === "processing",
    );
    if (processingJobs.length === 0 || !token) return;

    const interval = setInterval(() => {
      processingJobs.forEach((job) => {
        getReportDownload(token, job.id)
          .then((res) => {
            if ("generation_status" in res && res.generation_status !== job.generation_status) {
              setJobs((current) =>
                current.map((c) => (c.id === res.id ? res : c)),
              );
            }
          })
          .catch(() => {});
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [jobs, token]);

  const metrics = useMemo(() => {
    const processing = jobs.filter(
      (job) => job.generation_status === "processing",
    ).length;
    const completed = jobs.filter(
      (job) => job.generation_status === "completed",
    ).length;
    const failed = jobs.filter((job) => job.generation_status === "failed").length;

    return [
      { label: "Report templates", value: String(reportTemplates.length) },
      { label: "Queued this session", value: String(jobs.length) },
      { label: "Processing", value: String(processing) },
      { label: "Completed", value: String(completed) },
      { label: "Failed", value: String(failed) },
      { label: "Reference data", value: isLoadingReference ? "Loading" : "Ready" },
    ];
  }, [isLoadingReference, jobs]);

  async function handleQueueReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsQueueing(true);

    try {
      const job = await queueReport(
        token,
        selectedTemplate.endpoint,
        normalizePayload(form),
      );
      setJobs((current) => [job, ...current]);
      setSelectedJobId(job.id);
      setNotice(`${job.report_name} queued.`);
    } catch (caughtError) {
      setError(readApiError(caughtError));
    } finally {
      setIsQueueing(false);
    }
  }

  async function handleCheckDownload(job: GeneratedReport) {
    setCheckingJobId(job.id);
    setJobError("");
    setNotice("");

    try {
      const response = await getReportDownload(token, job.id);
      if ("generation_status" in response) {
        setJobs((current) =>
          current.map((currentJob) =>
            currentJob.id === response.id ? response : currentJob,
          ),
        );
        setSelectedJobId(response.id);
        setNotice(
          response.generation_status === "completed"
            ? "Report metadata refreshed. File URI is available when generated by the backend."
            : `Report is ${formatRole(response.generation_status)}.`,
        );
      } else {
        setNotice(`Report ${response.job_id} is ${formatRole(response.status)}.`);
      }
    } catch (caughtError) {
      setJobError(readApiError(caughtError));
    } finally {
      setCheckingJobId("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Reports
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Queue coverage, missed follow-up, and AEFI reports
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Uses the backend report queue endpoints and checks generated report
              metadata through the download endpoint.
            </p>
          </div>
          <StatusPill label="Public health reporting" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </section>

      <Notice tone="warning">
        Backend requirement: there is no generated-report list/history endpoint
        yet, and the download endpoint currently returns report metadata with a
        file URI instead of a streamed file. This screen tracks jobs queued in
        the current session and exposes the available status/download check.
      </Notice>

      {notice ? <Notice>{notice}</Notice> : null}
      {error ? <InlineError message={error} /> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(560px,1.15fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Report templates
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Templates map to the real report queue endpoints.
            </p>
          </div>

          <div className="space-y-3 p-3">
            {reportTemplates.map((template) => (
              <button
                className={`w-full rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
                  selectedEndpoint === template.endpoint
                    ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                }`}
                key={template.code}
                type="button"
                onClick={() => setSelectedEndpoint(template.endpoint)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {template.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {template.description}
                    </p>
                  </div>
                  <StatusPill label={template.endpoint} tone="gray" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
                  Selected template
                </p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedTemplate.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  POST /reports/{selectedTemplate.endpoint}
                </p>
              </div>
              <StatusPill label={selectedTemplate.code} />
            </div>

            <form className="mt-5 grid gap-4" onSubmit={handleQueueReport}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput
                  label="Output format"
                  value={form.output_format}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      output_format: value as ReportOutputFormat,
                    }))
                  }
                  options={[
                    { label: "PDF", value: "pdf" },
                    { label: "CSV", value: "csv" },
                  ]}
                />
                <SelectInput
                  label="Facility"
                  value={form.facility_id}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, facility_id: value }))
                  }
                  options={[
                    { label: "No facility filter", value: "" },
                    ...facilities.map((facility) => ({
                      label: `${facility.facility_name} (${facility.facility_code})`,
                      value: facility.id,
                    })),
                  ]}
                />
                <SelectInput
                  label="Administrative unit"
                  value={form.unit_id}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, unit_id: value }))
                  }
                  options={[
                    { label: "No unit filter", value: "" },
                    ...units.map((unit) => ({
                      label: `${unit.name} (${formatRole(unit.level)})`,
                      value: unit.id,
                    })),
                  ]}
                />
                <TextInput
                  label="Date from"
                  type="date"
                  value={form.date_from}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, date_from: value }))
                  }
                />
                <TextInput
                  label="Date to"
                  type="date"
                  value={form.date_to}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, date_to: value }))
                  }
                />
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300 lg:w-fit"
                disabled={isQueueing}
                type="submit"
              >
                {isQueueing ? "Queueing report" : "Queue report"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generated reports
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Jobs queued in this browser session.
                </p>
              </div>
              <StatusPill label={`${jobs.length} jobs`} />
            </div>

            {jobError ? <InlineError className="mt-4" message={jobError} /> : null}

            <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.1fr)]">
              <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {jobs.length ? (
                  jobs.map((job) => (
                    <button
                      className={`w-full rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
                        selectedJob?.id === job.id
                          ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                      }`}
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {job.report_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(job.requested_at)} -{" "}
                            {job.output_format.toUpperCase()}
                          </p>
                        </div>
                        <StatusPill
                          label={formatRole(job.generation_status)}
                          tone={jobStatusTone(job.generation_status)}
                        />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-white/[0.02]">
                    <span className="text-4xl">📥</span>
                    <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">No jobs queued</h3>
                    <p className="mt-2 max-w-[200px] text-xs text-gray-500 dark:text-gray-400">
                      Queue a template to start the backend generation workflow. Jobs will persist on this device.
                    </p>
                  </div>
                )}
              </div>

              <JobDetailCard
                checkingJobId={checkingJobId}
                job={selectedJob}
                onCheckDownload={handleCheckDownload}
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function JobDetailCard({
  checkingJobId,
  job,
  onCheckDownload,
}: {
  checkingJobId: string;
  job: GeneratedReport | null;
  onCheckDownload: (job: GeneratedReport) => void;
}) {
  if (!job) {
    return <EmptyState>Select a generated report job to inspect it.</EmptyState>;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {job.report_name}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {job.report_code} - {job.output_format.toUpperCase()}
          </p>
        </div>
        <StatusPill
          label={formatRole(job.generation_status)}
          tone={jobStatusTone(job.generation_status)}
        />
      </div>

      <div className="mt-5 grid gap-3">
        <DetailItem label="Requested" value={formatDateTime(job.requested_at)} />
        <DetailItem
          label="Completed"
          value={job.completed_at ? formatDateTime(job.completed_at) : "Pending"}
        />
        <DetailItem
          label="Parameters"
          value={
            job.parameter_payload
              ? Object.entries(job.parameter_payload)
                  .map(([key, value]) => `${formatRole(key)}: ${value}`)
                  .join(", ")
              : "No parameters"
          }
        />
        <DetailItem label="File URI" value={job.file_uri ?? "Not available"} />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
          disabled={checkingJobId === job.id}
          type="button"
          onClick={() => onCheckDownload(job)}
        >
          {checkingJobId === job.id ? "Checking" : "Check download"}
        </button>
        {job.generation_status === "completed" && job.file_uri ? (
          <a
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            href={job.file_uri}
            rel="noreferrer"
            target="_blank"
          >
            Open file URI
          </a>
        ) : null}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function normalizePayload(form: typeof emptyReportForm): QueueReportPayload {
  return {
    output_format: form.output_format,
    facility_id: form.facility_id || null,
    unit_id: form.unit_id || null,
    date_from: form.date_from || null,
    date_to: form.date_to || null,
  };
}

function jobStatusTone(status: GeneratedReport["generation_status"]) {
  if (status === "completed") {
    return "success";
  }

  if (status === "failed") {
    return "error";
  }

  return "warning";
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
