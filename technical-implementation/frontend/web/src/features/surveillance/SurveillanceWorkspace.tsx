"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type {
  AdministrativeUnitBrief,
  HealthFacility,
  Patient,
} from "@/features/registry/types";
import type {
  AlertStatus,
  CreateSurveillanceReportPayload,
  OutbreakAlert,
  SurveillanceCategory,
  SurveillanceReport,
  SurveillanceReportStatus,
  SurveillanceSeverity,
} from "@/features/surveillance/types";
import { ApiError } from "@/services/api";
import {
  listAdministrativeUnits,
  listFacilities,
  listPatients,
} from "@/services/patients";
import {
  createSurveillanceFollowUp,
  createSurveillanceReport,
  listOutbreakAlerts,
  listSurveillanceFollowUps,
  listSurveillanceReports,
  updateOutbreakAlertStatus,
  updateSurveillanceReport,
} from "@/services/surveillance";
import { formatRole } from "@/shared/format";
import {
  AlertBanner,
  EmptyState,
  InlineError,
  MetricCard,
  Notice,
  SelectInput,
  StatusPill,
  TextAreaInput,
  TextInput,
} from "@/shared/workspace-ui";

const categoryOptions: Array<{
  label: string;
  value: SurveillanceCategory | "all";
}> = [
  { label: "All categories", value: "all" },
  { label: "AEFI", value: "aefi" },
  { label: "Symptom", value: "symptom" },
  { label: "Lab follow-up", value: "lab_follow_up" },
];

const reportStatusOptions: Array<{
  label: string;
  value: SurveillanceReportStatus | "all";
}> = [
  { label: "All statuses", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Queued", value: "queued" },
  { label: "Under follow-up", value: "under_follow_up" },
  { label: "Closed", value: "closed" },
];

const editableReportStatuses: Array<{
  label: string;
  value: SurveillanceReportStatus;
}> = reportStatusOptions.filter(
  (option): option is { label: string; value: SurveillanceReportStatus } =>
    option.value !== "all",
);

const severityOptions: Array<{
  label: string;
  value: SurveillanceSeverity | "";
}> = [
  { label: "Not assessed", value: "" },
  { label: "Low", value: "low" },
  { label: "Moderate", value: "moderate" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

const alertStatusOptions: Array<{ label: string; value: AlertStatus | "all" }> =
  [
    { label: "All alert statuses", value: "all" },
    { label: "Potential", value: "potential" },
    { label: "Under review", value: "under_review" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Dismissed", value: "dismissed" },
    { label: "False alarm", value: "false_alarm" },
  ];

const editableAlertStatuses: Array<{ label: string; value: AlertStatus }> =
  alertStatusOptions.filter(
    (option): option is { label: string; value: AlertStatus } =>
      option.value !== "all",
  );

const emptyReportForm = {
  patient: "",
  facility: "",
  surveillance_category: "symptom" as SurveillanceCategory,
  condition_type: "",
  disease_suspected: "",
  onset_date: today(),
  body_temperature_c: "",
  severity: "" as SurveillanceSeverity | "",
  follow_up_required: true,
  notes: "",
  symptoms: "",
};

const emptyStatusForm = {
  status: "submitted" as SurveillanceReportStatus,
  follow_up_required: true,
  notes: "",
};

const emptyFollowUpForm = {
  action_taken: "",
  due_date: "",
};

const emptyAlertStatusForm = {
  status: "under_review" as AlertStatus,
  notes: "",
};

export function SurveillanceWorkspace() {
  const session = useAuthSession();
  const role = session?.user.role ?? "";
  const canManageReports = role === "ADMIN" || role === "HEALTH_WORKER";
  const canVerifyAlerts = role === "ADMIN" || role === "PUBLIC_HEALTH_OFFICIAL";
  const token = session?.tokens.accessToken ?? "";

  const [reports, setReports] = useState<SurveillanceReport[]>([]);
  const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
  const [followUps, setFollowUps] = useState<
    Awaited<ReturnType<typeof listSurveillanceFollowUps>>
  >([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [units, setUnits] = useState<AdministrativeUnitBrief[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SurveillanceCategory | "all">("all");
  const [status, setStatus] = useState<SurveillanceReportStatus | "all">("all");
  const [facility, setFacility] = useState("");
  const [alertStatus, setAlertStatus] = useState<AlertStatus | "all">("all");
  const [alertDisease, setAlertDisease] = useState("");
  const [reportForm, setReportForm] = useState(emptyReportForm);
  const [statusForm, setStatusForm] = useState(emptyStatusForm);
  const [followUpForm, setFollowUpForm] = useState(emptyFollowUpForm);
  const [alertStatusForm, setAlertStatusForm] = useState(emptyAlertStatusForm);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isUpdatingAlert, setIsUpdatingAlert] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [alertError, setAlertError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const selectedReport =
    reports.find((report) => report.id === selectedReportId) ?? null;
  const selectedAlert =
    alerts.find((alert) => alert.id === selectedAlertId) ?? null;

  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const facilityMap = useMemo(
    () => new Map(facilities.map((item) => [item.id, item])),
    [facilities],
  );
  const unitMap = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );

  useEffect(() => {
    let isActive = true;

    async function loadWorkspace() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      try {
        const [
          reportRows,
          alertRows,
          facilityRows,
          unitRows,
          patientRows,
        ] = await Promise.all([
          listSurveillanceReports(token, {
            search,
            category,
            status,
            facility,
          }),
          listOutbreakAlerts(token, {
            status: alertStatus,
            disease: alertDisease,
          }),
          listFacilities(token),
          listAdministrativeUnits(token),
          canManageReports
            ? listPatients(token)
            : Promise.resolve([]),
        ]);

        if (!isActive) {
          return;
        }

        setReports(reportRows);
        setAlerts(alertRows);
        setFacilities(facilityRows);
        setUnits(unitRows);
        setPatients(patientRows);
        setError("");
        setSelectedReportId((current) =>
          current && reportRows.some((report) => report.id === current)
            ? current
            : reportRows[0]?.id ?? "",
        );
        setSelectedAlertId((current) =>
          current && alertRows.some((alert) => alert.id === current)
            ? current
            : alertRows[0]?.id ?? "",
        );
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

    const timer = window.setTimeout(loadWorkspace, 180);
    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [
    alertDisease,
    alertStatus,
    canManageReports,
    category,
    facility,
    reloadKey,
    search,
    status,
    token,
  ]);

  useEffect(() => {
    if (!selectedReport) {
      setStatusForm(emptyStatusForm);
      return;
    }

    setStatusForm({
      status: selectedReport.status,
      follow_up_required: selectedReport.follow_up_required,
      notes: selectedReport.notes ?? "",
    });
  }, [selectedReport]);

  useEffect(() => {
    if (!selectedAlert) {
      setAlertStatusForm(emptyAlertStatusForm);
      return;
    }

    setAlertStatusForm({
      status: selectedAlert.status,
      notes: selectedAlert.notes ?? "",
    });
  }, [selectedAlert]);

  useEffect(() => {
    let isActive = true;

    async function loadFollowUps() {
      if (!token || !selectedReportId || !canManageReports) {
        setFollowUps([]);
        return;
      }

      setIsFollowUpLoading(true);
      try {
        const rows = await listSurveillanceFollowUps(token, selectedReportId);
        if (isActive) {
          setFollowUps(rows);
          setDetailError("");
        }
      } catch (caughtError) {
        if (isActive) {
          setDetailError(readApiError(caughtError));
        }
      } finally {
        if (isActive) {
          setIsFollowUpLoading(false);
        }
      }
    }

    loadFollowUps();
    return () => {
      isActive = false;
    };
  }, [canManageReports, selectedReportId, token]);

  const linkedAlerts = useMemo(() => {
    if (!selectedReport) {
      return [];
    }

    const suspectedDisease = selectedReport.disease_suspected?.toLowerCase();
    return alerts.filter((alert) => {
      const matchesReport = alert.surveillance_report === selectedReport.id;
      const matchesDisease =
        suspectedDisease &&
        alert.disease_code.toLowerCase().includes(suspectedDisease);
      return matchesReport || matchesDisease;
    });
  }, [alerts, selectedReport]);

  const metrics = useMemo(() => {
    const activeCases = reports.filter((report) => report.status !== "closed").length;
    const highSeverity = reports.filter((report) =>
      ["high", "critical"].includes(report.severity ?? ""),
    ).length;
    const followUpRequired = reports.filter(
      (report) => report.follow_up_required,
    ).length;
    const confirmedAlerts = alerts.filter(
      (alert) => alert.status === "confirmed",
    ).length;

    return [
      { label: "Reports", value: String(reports.length) },
      { label: "Active cases", value: String(activeCases) },
      { label: "Needs follow-up", value: String(followUpRequired) },
      { label: "High severity", value: String(highSeverity) },
      { label: "Visible alerts", value: String(alerts.length) },
      { label: "Confirmed alerts", value: String(confirmedAlerts) },
    ];
  }, [alerts, reports]);

  async function refreshWorkspace() {
    setReloadKey((current) => current + 1);
  }

  async function handleCreateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    if (!reportForm.patient || !reportForm.condition_type.trim()) {
      setFormError("Select a patient and enter a condition type.");
      return;
    }

    setIsCreating(true);
    try {
      const report = await createSurveillanceReport(
        token,
        normalizeReportPayload(reportForm),
      );
      setReports((current) => [report, ...current]);
      setSelectedReportId(report.id);
      setReportForm({ ...emptyReportForm, onset_date: today() });
      setIsCreateOpen(false);
      setNotice("Surveillance report submitted.");
    } catch (caughtError) {
      setFormError(readApiError(caughtError));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateReportStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReport) {
      return;
    }

    setDetailError("");
    setNotice("");
    setIsUpdatingReport(true);
    try {
      const updated = await updateSurveillanceReport(token, selectedReport.id, {
        status: statusForm.status,
        follow_up_required: statusForm.follow_up_required,
        notes: statusForm.notes.trim() || null,
      });
      setReports((current) =>
        current.map((report) => (report.id === updated.id ? updated : report)),
      );
      setNotice("Surveillance status updated.");
    } catch (caughtError) {
      setDetailError(readApiError(caughtError));
    } finally {
      setIsUpdatingReport(false);
    }
  }

  async function handleCreateFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReport) {
      return;
    }

    setDetailError("");
    setNotice("");
    if (!followUpForm.action_taken.trim()) {
      setDetailError("Enter the follow-up action before saving.");
      return;
    }

    setIsCreatingFollowUp(true);
    try {
      const followUp = await createSurveillanceFollowUp(token, selectedReport.id, {
        action_taken: followUpForm.action_taken.trim(),
        assigned_to: null,
        due_date: followUpForm.due_date || null,
      });
      setFollowUps((current) => [followUp, ...current]);
      setFollowUpForm(emptyFollowUpForm);
      setNotice("Follow-up action recorded.");
    } catch (caughtError) {
      setDetailError(readApiError(caughtError));
    } finally {
      setIsCreatingFollowUp(false);
    }
  }

  async function handleUpdateAlertStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAlert) {
      return;
    }

    setAlertError("");
    setNotice("");
    setIsUpdatingAlert(true);
    try {
      const updated = await updateOutbreakAlertStatus(token, selectedAlert.id, {
        status: alertStatusForm.status,
        notes: alertStatusForm.notes.trim() || null,
      });
      setAlerts((current) =>
        current.map((alert) => (alert.id === updated.id ? updated : alert)),
      );
      setSelectedAlertId(updated.id);
      setNotice("Outbreak alert status updated.");
    } catch (caughtError) {
      setAlertError(readApiError(caughtError));
    } finally {
      setIsUpdatingAlert(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Surveillance
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Monitor cases, follow-up actions, and outbreak alerts
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Review patient-linked surveillance reports, update workflow status,
              and verify outbreak alerts using the active surveillance API.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isLoading}
              type="button"
              onClick={refreshWorkspace}
            >
              Refresh
            </button>
            {canManageReports ? (
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700"
                type="button"
                onClick={() => setIsCreateOpen((current) => !current)}
              >
                {isCreateOpen ? "Close form" : "New report"}
              </button>
            ) : null}
          </div>
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

      {/* Confirmed outbreak alert banner */}
      {alerts.filter((a) => a.status === "confirmed").length > 0 && (
        <AlertBanner
          tone="error"
          count={alerts.filter((a) => a.status === "confirmed").length}
        >
          <strong>
            {alerts.filter((a) => a.status === "confirmed").length} confirmed outbreak alert
            {alerts.filter((a) => a.status === "confirmed").length > 1 ? "s" : ""}
          </strong>{" "}
          — immediate public health action is required. Scroll to the Outbreak Alerts section below to review and update status.
        </AlertBanner>
      )}

      {notice ? <Notice>{notice}</Notice> : null}

      {isCreateOpen && canManageReports ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create surveillance report
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Uses POST /surveillance/ and links the report to an existing
                patient record.
              </p>
            </div>
            <StatusPill label={`${patients.length} patients loaded`} />
          </div>

          <form className="mt-5 grid gap-4" onSubmit={handleCreateReport}>
            <div className="grid gap-4 lg:grid-cols-3">
              <SelectInput
                label="Patient"
                value={reportForm.patient}
                onChange={(value) =>
                  setReportForm((current) => ({ ...current, patient: value }))
                }
                options={[
                  { label: "Select patient", value: "" },
                  ...patients.map((patient) => ({
                    label: `${patient.full_name} (${patient.uid})`,
                    value: patient.id,
                  })),
                ]}
              />
              <SelectInput
                label="Facility"
                value={reportForm.facility}
                onChange={(value) =>
                  setReportForm((current) => ({ ...current, facility: value }))
                }
                options={facilityOptions(facilities)}
              />
              <SelectInput
                label="Category"
                value={reportForm.surveillance_category}
                onChange={(value) =>
                  setReportForm((current) => ({
                    ...current,
                    surveillance_category: value as SurveillanceCategory,
                  }))
                }
                options={categoryOptions.filter(
                  (option): option is { label: string; value: SurveillanceCategory } =>
                    option.value !== "all",
                )}
              />
              <TextInput
                label="Condition type"
                required
                value={reportForm.condition_type}
                onChange={(value) =>
                  setReportForm((current) => ({
                    ...current,
                    condition_type: value,
                  }))
                }
              />
              <TextInput
                label="Disease suspected"
                value={reportForm.disease_suspected}
                onChange={(value) =>
                  setReportForm((current) => ({
                    ...current,
                    disease_suspected: value,
                  }))
                }
              />
              <TextInput
                label="Onset date"
                required
                type="date"
                value={reportForm.onset_date}
                onChange={(value) =>
                  setReportForm((current) => ({ ...current, onset_date: value }))
                }
              />
              <TextInput
                label="Body temperature C"
                type="number"
                value={reportForm.body_temperature_c}
                onChange={(value) =>
                  setReportForm((current) => ({
                    ...current,
                    body_temperature_c: value,
                  }))
                }
              />
              <SelectInput
                label="Severity"
                value={reportForm.severity}
                onChange={(value) =>
                  setReportForm((current) => ({
                    ...current,
                    severity: value as SurveillanceSeverity | "",
                  }))
                }
                options={severityOptions}
              />
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <input
                  checked={reportForm.follow_up_required}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  type="checkbox"
                  onChange={(event) =>
                    setReportForm((current) => ({
                      ...current,
                      follow_up_required: event.target.checked,
                    }))
                  }
                />
                Follow-up required
              </label>
            </div>
            <TextAreaInput
              label="Symptoms"
              placeholder="Comma separated labels, for example: Fever=39, Rash, Weakness"
              value={reportForm.symptoms}
              onChange={(value) =>
                setReportForm((current) => ({ ...current, symptoms: value }))
              }
            />
            <TextAreaInput
              label="Notes"
              value={reportForm.notes}
              onChange={(value) =>
                setReportForm((current) => ({ ...current, notes: value }))
              }
            />
            {formError ? <InlineError message={formError} /> : null}
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300 lg:w-fit"
              disabled={isCreating}
              type="submit"
            >
              {isCreating ? "Submitting report" : "Submit surveillance report"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(560px,1.1fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Case/report list
            </h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <input
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Search condition, disease, or patient name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as SurveillanceCategory | "all")
                }
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as SurveillanceReportStatus | "all")
                }
              >
                {reportStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              className="mt-3 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={facility}
              onChange={(event) => setFacility(event.target.value)}
            >
              {facilityOptions(facilities).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error ? <InlineError className="m-5" message={error} /> : null}

          <div className="max-h-[820px] overflow-y-auto p-3">
            {isLoading ? (
              <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                Loading surveillance reports...
              </p>
            ) : reports.length ? (
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    className={`w-full rounded-xl border border-l-4 p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${severityBorderClass(report.severity)} ${
                      selectedReportId === report.id
                        ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                    }`}
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReportId(report.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {report.condition_type}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {patientLabel(report.patient, patientMap)} - onset{" "}
                          {report.onset_date}
                        </p>
                      </div>
                      <StatusPill
                        label={formatRole(report.status)}
                        tone={reportStatusTone(report.status)}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill label={formatRole(report.surveillance_category)} />
                      {report.severity ? (
                        <StatusPill
                          label={formatRole(report.severity)}
                          tone={severityTone(report.severity)}
                        />
                      ) : null}
                      {report.follow_up_required ? (
                        <StatusPill label="Follow-up" tone="warning" />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState>No surveillance reports match the current filters.</EmptyState>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <ReportDetailPanel
            canManageReports={canManageReports}
            detailError={detailError}
            followUpForm={followUpForm}
            followUps={followUps}
            isCreatingFollowUp={isCreatingFollowUp}
            isFollowUpLoading={isFollowUpLoading}
            isUpdatingReport={isUpdatingReport}
            linkedAlerts={linkedAlerts}
            report={selectedReport}
            statusForm={statusForm}
            facilityLabel={(id) => facilityLabel(id, facilityMap)}
            onCreateFollowUp={handleCreateFollowUp}
            onFollowUpFormChange={setFollowUpForm}
            onStatusFormChange={setStatusForm}
            onUpdateStatus={handleUpdateReportStatus}
          />

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Outbreak alerts
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Uses GET /alerts/ and official alert status transitions.
                </p>
              </div>
              <StatusPill label={`${alerts.length} alerts`} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SelectInput
                label="Alert status"
                value={alertStatus}
                onChange={(value) => setAlertStatus(value as AlertStatus | "all")}
                options={alertStatusOptions}
              />
              <TextInput
                label="Disease filter"
                value={alertDisease}
                onChange={setAlertDisease}
              />
            </div>

            {alertError ? <InlineError className="mt-4" message={alertError} /> : null}

            <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.1fr)]">
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {alerts.length ? (
                  alerts.map((alert) => (
                    <button
                      className={`w-full rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
                        selectedAlertId === alert.id
                          ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                      }`}
                      key={alert.id}
                      type="button"
                      onClick={() => setSelectedAlertId(alert.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {alert.disease_code}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {unitLabel(alert.unit, unitMap)} -{" "}
                            {formatDateTime(alert.triggered_at)}
                          </p>
                        </div>
                        <StatusPill
                          label={formatRole(alert.status)}
                          tone={alertStatusTone(alert.status)}
                        />
                      </div>
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Source {formatRole(alert.alert_source)} - risk{" "}
                        {formatRisk(alert.risk_probability)}
                      </p>
                    </button>
                  ))
                ) : (
                  <EmptyState>No outbreak alerts match the current filters.</EmptyState>
                )}
              </div>

              <AlertDetailPanel
                alert={selectedAlert}
                canVerifyAlerts={canVerifyAlerts}
                form={alertStatusForm}
                isUpdating={isUpdatingAlert}
                unitLabel={(id) => unitLabel(id, unitMap)}
                onChange={setAlertStatusForm}
                onSubmit={handleUpdateAlertStatus}
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function ReportDetailPanel({
  canManageReports,
  detailError,
  facilityLabel,
  followUpForm,
  followUps,
  isCreatingFollowUp,
  isFollowUpLoading,
  isUpdatingReport,
  linkedAlerts,
  onCreateFollowUp,
  onFollowUpFormChange,
  onStatusFormChange,
  onUpdateStatus,
  report,
  statusForm,
}: {
  canManageReports: boolean;
  detailError: string;
  facilityLabel: (id: string | null) => string;
  followUpForm: typeof emptyFollowUpForm;
  followUps: Awaited<ReturnType<typeof listSurveillanceFollowUps>>;
  isCreatingFollowUp: boolean;
  isFollowUpLoading: boolean;
  isUpdatingReport: boolean;
  linkedAlerts: OutbreakAlert[];
  onCreateFollowUp: (event: FormEvent<HTMLFormElement>) => void;
  onFollowUpFormChange: (value: typeof emptyFollowUpForm) => void;
  onStatusFormChange: (value: typeof emptyStatusForm) => void;
  onUpdateStatus: (event: FormEvent<HTMLFormElement>) => void;
  report: SurveillanceReport | null;
  statusForm: typeof emptyStatusForm;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {report ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
                Selected report
              </p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {report.condition_type}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {report.disease_suspected || "No suspected disease"} -{" "}
                {formatDateTime(report.created_at)}
              </p>
            </div>
            <StatusPill
              label={formatRole(report.status)}
              tone={reportStatusTone(report.status)}
            />
          </div>

          {detailError ? <InlineError message={detailError} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Facility" value={facilityLabel(report.facility)} />
            <DetailItem label="Onset date" value={report.onset_date} />
            <DetailItem
              label="Temperature"
              value={
                report.body_temperature_c
                  ? `${report.body_temperature_c} C`
                  : "Not recorded"
              }
            />
            <DetailItem
              label="FHIR observation"
              value={report.fhir_observation_id ?? "Not linked"}
            />
          </div>

          {report.notes ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Notes
              </h3>
              <p className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
                {report.notes}
              </p>
            </div>
          ) : null}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Symptoms
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.symptoms.length ? (
                report.symptoms.map((symptom) => (
                  <StatusPill
                    key={symptom.id}
                    label={`${symptom.symptom_label}${
                      symptom.observation_value
                        ? `: ${symptom.observation_value}`
                        : ""
                    }`}
                    tone={symptom.is_present ? "warning" : "gray"}
                  />
                ))
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  No symptom observations attached.
                </span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Alert visibility
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {linkedAlerts.length ? (
                linkedAlerts.map((alert) => (
                  <div
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                    key={alert.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {alert.disease_code}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Risk {formatRisk(alert.risk_probability)}
                        </p>
                      </div>
                      <StatusPill
                        label={formatRole(alert.status)}
                        tone={alertStatusTone(alert.status)}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState className="sm:col-span-2">
                  No outbreak alerts are linked to this report or suspected disease.
                </EmptyState>
              )}
            </div>
          </div>

          {canManageReports ? (
            <div className="grid gap-5 border-t border-gray-200 pt-5 dark:border-gray-800 2xl:grid-cols-2">
              <form className="grid gap-4" onSubmit={onUpdateStatus}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Update report status
                </h3>
                <SelectInput
                  label="Status"
                  value={statusForm.status}
                  onChange={(value) =>
                    onStatusFormChange({
                      ...statusForm,
                      status: value as SurveillanceReportStatus,
                    })
                  }
                  options={editableReportStatuses}
                />
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  <input
                    checked={statusForm.follow_up_required}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    type="checkbox"
                    onChange={(event) =>
                      onStatusFormChange({
                        ...statusForm,
                        follow_up_required: event.target.checked,
                      })
                    }
                  />
                  Follow-up required
                </label>
                <TextAreaInput
                  label="Status notes"
                  value={statusForm.notes}
                  onChange={(value) =>
                    onStatusFormChange({ ...statusForm, notes: value })
                  }
                />
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
                  disabled={isUpdatingReport}
                  type="submit"
                >
                  {isUpdatingReport ? "Updating status" : "Update status"}
                </button>
              </form>

              <form className="grid gap-4" onSubmit={onCreateFollowUp}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Add follow-up action
                </h3>
                <TextAreaInput
                  label="Action"
                  value={followUpForm.action_taken}
                  onChange={(value) =>
                    onFollowUpFormChange({
                      ...followUpForm,
                      action_taken: value,
                    })
                  }
                />
                <TextInput
                  label="Due date"
                  type="date"
                  value={followUpForm.due_date}
                  onChange={(value) =>
                    onFollowUpFormChange({ ...followUpForm, due_date: value })
                  }
                />
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
                  disabled={isCreatingFollowUp}
                  type="submit"
                >
                  {isCreatingFollowUp ? "Saving action" : "Save follow-up"}
                </button>
              </form>
            </div>
          ) : (
            <Notice tone="brand">
              The backend allows public health officials to view reports here,
              while report detail mutations and follow-up actions remain
              health-worker/admin APIs.
            </Notice>
          )}

          {canManageReports ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Follow-up timeline
              </h3>
              <div className="mt-3 space-y-3">
                {isFollowUpLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Loading follow-up actions...
                  </p>
                ) : followUps.length ? (
                  followUps.map((followUp) => (
                    <div
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                      key={followUp.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {followUp.action_taken}
                        </p>
                        <StatusPill
                          label={formatRole(followUp.status)}
                          tone={
                            followUp.status === "completed" ? "success" : "warning"
                          }
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Due {followUp.due_date ?? "not scheduled"} - created{" "}
                        {formatDateTime(followUp.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState>No follow-up actions recorded yet.</EmptyState>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState>Select a surveillance report to view details.</EmptyState>
      )}
    </section>
  );
}

function AlertDetailPanel({
  alert,
  canVerifyAlerts,
  form,
  isUpdating,
  onChange,
  onSubmit,
  unitLabel,
}: {
  alert: OutbreakAlert | null;
  canVerifyAlerts: boolean;
  form: typeof emptyAlertStatusForm;
  isUpdating: boolean;
  onChange: (value: typeof emptyAlertStatusForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  unitLabel: (id: string) => string;
}) {
  if (!alert) {
    return <EmptyState>Select an alert to review the outbreak signal.</EmptyState>;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {alert.disease_code}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {unitLabel(alert.unit)} - {formatDateTime(alert.triggered_at)}
          </p>
        </div>
        <StatusPill
          label={formatRole(alert.status)}
          tone={alertStatusTone(alert.status)}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <DetailItem label="Risk probability" value={formatRisk(alert.risk_probability)} />
        <DetailItem label="Source" value={formatRole(alert.alert_source)} />
        <DetailItem
          label="Verified at"
          value={alert.verified_at ? formatDateTime(alert.verified_at) : "Pending"}
        />
      </div>

      {alert.notes ? (
        <p className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {alert.notes}
        </p>
      ) : null}

      {canVerifyAlerts ? (
        <form className="mt-5 grid gap-4 border-t border-gray-200 pt-5 dark:border-gray-800" onSubmit={onSubmit}>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Update alert status
          </h3>
          <SelectInput
            label="Status"
            value={form.status}
            onChange={(value) =>
              onChange({ ...form, status: value as AlertStatus })
            }
            options={editableAlertStatuses}
          />
          <TextAreaInput
            label="Verification notes"
            value={form.notes}
            onChange={(value) => onChange({ ...form, notes: value })}
          />
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
            disabled={isUpdating}
            type="submit"
          >
            {isUpdating ? "Updating alert" : "Update alert"}
          </button>
        </form>
      ) : (
        <p className="mt-5 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
          Alert status transitions are available to public health officials and
          admins.
        </p>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function normalizeReportPayload(
  payload: typeof emptyReportForm,
): CreateSurveillanceReportPayload {
  return {
    patient: payload.patient,
    facility: payload.facility || null,
    surveillance_category: payload.surveillance_category,
    condition_type: payload.condition_type.trim(),
    disease_suspected: payload.disease_suspected.trim() || null,
    onset_date: payload.onset_date,
    body_temperature_c: payload.body_temperature_c || null,
    severity: payload.severity || null,
    follow_up_required: payload.follow_up_required,
    notes: payload.notes.trim() || null,
    symptoms: parseSymptoms(payload.symptoms),
  };
}

function parseSymptoms(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [rawLabel, ...rest] = item.split(/[:=]/);
      const label = rawLabel.trim();
      const observationValue = rest.join(":").trim();
      return {
        symptom_code: label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .toUpperCase(),
        symptom_label: label,
        is_present: true,
        observation_value: observationValue || null,
      };
    });
}

function facilityOptions(facilities: HealthFacility[]) {
  return [
    { label: "All facilities", value: "" },
    ...facilities.map((item) => ({
      label: `${item.facility_name} (${item.facility_code})`,
      value: item.id,
    })),
  ];
}

function patientLabel(patientId: string, patientMap: Map<string, Patient>) {
  const patient = patientMap.get(patientId);
  return patient ? patient.full_name : `Patient ${shortId(patientId)}`;
}

function facilityLabel(
  facilityId: string | null,
  facilityMap: Map<string, HealthFacility>,
) {
  if (!facilityId) {
    return "No facility";
  }

  const facility = facilityMap.get(facilityId);
  return facility
    ? `${facility.facility_name} (${facility.facility_code})`
    : `Facility ${shortId(facilityId)}`;
}

function unitLabel(unitId: string, unitMap: Map<string, AdministrativeUnitBrief>) {
  const unit = unitMap.get(unitId);
  return unit ? `${unit.name} (${unit.code})` : `Unit ${shortId(unitId)}`;
}

function reportStatusTone(status: SurveillanceReportStatus) {
  if (status === "closed") {
    return "success";
  }

  if (status === "under_follow_up") {
    return "warning";
  }

  return "brand";
}

function severityTone(severity: SurveillanceSeverity) {
  if (severity === "critical" || severity === "high") {
    return "error";
  }

  if (severity === "moderate") {
    return "warning";
  }

  return "success";
}

function severityBorderClass(severity: SurveillanceSeverity | null | undefined): string {
  if (severity === "critical") return "border-l-error-600";
  if (severity === "high") return "border-l-orange-500";
  if (severity === "moderate") return "border-l-warning-400";
  return "border-l-transparent";
}

function alertStatusTone(status: AlertStatus) {
  if (status === "confirmed") {
    return "error";
  }

  if (status === "dismissed" || status === "false_alarm") {
    return "success";
  }

  if (status === "under_review") {
    return "warning";
  }

  return "brand";
}

function formatRisk(value: string | null) {
  if (!value) {
    return "Not scored";
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return value;
  }

  return `${Math.round(numeric * 100)}%`;
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

function shortId(value: string) {
  return value.slice(0, 8);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Could not reach the backend. Confirm the API is running on port 8000.";
}
