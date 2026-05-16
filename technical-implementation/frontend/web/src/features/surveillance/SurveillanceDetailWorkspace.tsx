"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type { HealthFacility } from "@/features/registry/types";
import type {
  AlertStatus,
  OutbreakAlert,
  SurveillanceReport,
  SurveillanceReportStatus,
} from "@/features/surveillance/types";
import { ApiError } from "@/services/api";
import { listFacilities } from "@/services/patients";
import {
  createSurveillanceFollowUp,
  getSurveillanceReport,
  listOutbreakAlerts,
  listSurveillanceFollowUps,
  updateOutbreakAlertStatus,
  updateSurveillanceReport,
} from "@/services/surveillance";
import { formatRole } from "@/shared/format";
import {
  EmptyState,
  InlineError,
  Notice,
  SelectInput,
  StatusPill,
  TextAreaInput,
  TextInput,
} from "@/shared/workspace-ui";

const reportStatusOptions: Array<{
  label: string;
  value: SurveillanceReportStatus;
}> = [
  { label: "Submitted", value: "submitted" },
  { label: "Queued", value: "queued" },
  { label: "Under follow-up", value: "under_follow_up" },
  { label: "Closed", value: "closed" },
];

const alertStatusOptions: Array<{ label: string; value: AlertStatus }> = [
  { label: "Potential", value: "potential" },
  { label: "Under review", value: "under_review" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Dismissed", value: "dismissed" },
  { label: "False alarm", value: "false_alarm" },
];

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

export function SurveillanceDetailWorkspace({ reportId }: { reportId: string }) {
  const session = useAuthSession();
  const role = session?.user.role ?? "";
  const canManageReports = role === "ADMIN" || role === "HEALTH_WORKER";
  const canVerifyAlerts = role === "ADMIN" || role === "PUBLIC_HEALTH_OFFICIAL";
  const token = session?.tokens.accessToken ?? "";

  const [report, setReport] = useState<SurveillanceReport | null>(null);
  const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
  const [followUps, setFollowUps] = useState<
    Awaited<ReturnType<typeof listSurveillanceFollowUps>>
  >([]);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);

  const [statusForm, setStatusForm] = useState(emptyStatusForm);
  const [followUpForm, setFollowUpForm] = useState(emptyFollowUpForm);
  const [alertStatusForm, setAlertStatusForm] = useState(emptyAlertStatusForm);
  const [selectedAlertId, setSelectedAlertId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isUpdatingAlert, setIsUpdatingAlert] = useState(false);
  
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [alertError, setAlertError] = useState("");
  const [notice, setNotice] = useState("");

  const facilityMap = useMemo(
    () => new Map(facilities.map((item) => [item.id, item])),
    [facilities],
  );

  const selectedAlert = alerts.find((alert) => alert.id === selectedAlertId) ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadReportData() {
      if (!token || !reportId) return;

      setIsLoading(true);
      try {
        const [reportData, alertRows, facilityRows] = await Promise.all([
          getSurveillanceReport(token, reportId),
          listOutbreakAlerts(token, { status: "all" }),
          listFacilities(token),
        ]);

        if (!isActive) return;

        setReport(reportData);
        setAlerts(alertRows);
        setFacilities(facilityRows);
        setStatusForm({
          status: reportData.status,
          follow_up_required: reportData.follow_up_required,
          notes: reportData.notes ?? "",
        });
        setError("");
      } catch (caughtError) {
        if (isActive) setError(readApiError(caughtError));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadReportData();
    return () => {
      isActive = false;
    };
  }, [reportId, token]);

  useEffect(() => {
    let isActive = true;

    async function loadFollowUps() {
      if (!token || !reportId || !canManageReports) {
        return;
      }

      setIsFollowUpLoading(true);
      try {
        const rows = await listSurveillanceFollowUps(token, reportId);
        if (isActive) setFollowUps(rows);
      } catch {
        // Silently ignore
      } finally {
        if (isActive) setIsFollowUpLoading(false);
      }
    }

    loadFollowUps();
    return () => {
      isActive = false;
    };
  }, [canManageReports, reportId, token]);

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

  const linkedAlerts = useMemo(() => {
    if (!report) return [];
    const suspectedDisease = report.disease_suspected?.toLowerCase();
    return alerts.filter((alert) => {
      const matchesReport = alert.surveillance_report === report.id;
      const matchesDisease =
        suspectedDisease &&
        alert.disease_code.toLowerCase().includes(suspectedDisease);
      return matchesReport || matchesDisease;
    });
  }, [alerts, report]);

  async function handleUpdateReportStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report) return;

    setDetailError("");
    setNotice("");
    setIsUpdatingReport(true);
    try {
      const updated = await updateSurveillanceReport(token, report.id, {
        status: statusForm.status,
        follow_up_required: statusForm.follow_up_required,
        notes: statusForm.notes.trim() || null,
      });
      setReport(updated);
      setNotice("Surveillance status updated.");
    } catch (caughtError) {
      setDetailError(readApiError(caughtError));
    } finally {
      setIsUpdatingReport(false);
    }
  }

  async function handleCreateFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report) return;

    setDetailError("");
    setNotice("");
    if (!followUpForm.action_taken.trim()) {
      setDetailError("Enter the follow-up action before saving.");
      return;
    }

    setIsCreatingFollowUp(true);
    try {
      const followUp = await createSurveillanceFollowUp(token, report.id, {
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
    if (!selectedAlert) return;

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
      setNotice("Outbreak alert status updated.");
    } catch (caughtError) {
      setAlertError(readApiError(caughtError));
    } finally {
      setIsUpdatingAlert(false);
    }
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading report details...</div>;
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <InlineError message={error || "Report not found."} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/surveillance"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          ← Back to Surveillance Queue
        </Link>
      </div>

      {notice ? <Notice>{notice}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
                  Surveillance Report
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

            {detailError ? <InlineError className="mt-4" message={detailError} /> : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Facility" value={facilityLabel(report.facility, facilityMap)} />
              <DetailItem label="Onset date" value={report.onset_date} />
              <DetailItem
                label="Temperature"
                value={
                  report.body_temperature_c
                    ? `${report.body_temperature_c} °C`
                    : "Not recorded"
                }
              />
              <DetailItem
                label="Severity"
                value={report.severity ? formatRole(report.severity) : "Not assessed"}
              />
            </div>

            {report.notes && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Notes
                </h3>
                <p className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
                  {report.notes}
                </p>
              </div>
            )}

            <div className="mt-6">
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
          </section>

          {canManageReports ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Update Report Status & Follow-up
              </h2>
              <div className="grid gap-5 lg:grid-cols-2">
                <form className="grid gap-4" onSubmit={handleUpdateReportStatus}>
                  <SelectInput
                    label="Status"
                    value={statusForm.status}
                    onChange={(value) =>
                      setStatusForm({
                        ...statusForm,
                        status: value as SurveillanceReportStatus,
                      })
                    }
                    options={reportStatusOptions}
                  />
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    <input
                      checked={statusForm.follow_up_required}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      type="checkbox"
                      onChange={(event) =>
                        setStatusForm({
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
                      setStatusForm({ ...statusForm, notes: value })
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

                <form className="grid gap-4 border-t border-gray-200 pt-5 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0 dark:border-gray-800" onSubmit={handleCreateFollowUp}>
                  <TextAreaInput
                    label="New follow-up action"
                    value={followUpForm.action_taken}
                    onChange={(value) =>
                      setFollowUpForm({
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
                      setFollowUpForm({ ...followUpForm, due_date: value })
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

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Follow-up timeline
                </h3>
                <div className="mt-4 space-y-3">
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
            </section>
          ) : (
            <Notice tone="brand">
              The backend allows public health officials to view reports here,
              while report detail mutations and follow-up actions remain
              health-worker/admin APIs.
            </Notice>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Linked Outbreak Alerts
            </h2>

            <div className="grid gap-3">
              {linkedAlerts.length ? (
                linkedAlerts.map((alert) => (
                  <button
                    className={`w-full rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
                      selectedAlertId === alert.id
                        ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                    }`}
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
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
                  </button>
                ))
              ) : (
                <EmptyState>
                  No outbreak alerts are linked to this report or suspected disease.
                </EmptyState>
              )}
            </div>

            {selectedAlert && (
              <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Alert Verification
                </h3>
                
                {alertError ? <InlineError className="mb-4" message={alertError} /> : null}
                
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">Source:</span> {formatRole(selectedAlert.alert_source)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">Verified at:</span> {selectedAlert.verified_at ? formatDateTime(selectedAlert.verified_at) : "Pending"}
                  </p>
                  {selectedAlert.notes && (
                    <p className="mt-2 text-sm italic text-gray-600 dark:text-gray-400">
                      &quot;{selectedAlert.notes}&quot;
                    </p>
                  )}
                </div>

                {canVerifyAlerts ? (
                  <form className="grid gap-4" onSubmit={handleUpdateAlertStatus}>
                    <SelectInput
                      label="Verification Status"
                      value={alertStatusForm.status}
                      onChange={(value) =>
                        setAlertStatusForm({ ...alertStatusForm, status: value as AlertStatus })
                      }
                      options={alertStatusOptions}
                    />
                    <TextAreaInput
                      label="Verification notes"
                      value={alertStatusForm.notes}
                      onChange={(value) => setAlertStatusForm({ ...alertStatusForm, notes: value })}
                    />
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
                      disabled={isUpdatingAlert}
                      type="submit"
                    >
                      {isUpdatingAlert ? "Updating alert..." : "Update alert status"}
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
                    Alert status transitions are available to public health officials and admins.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// Helpers
function facilityLabel(facilityId: string | null, facilityMap: Map<string, HealthFacility>) {
  if (!facilityId) return "No facility";
  const facility = facilityMap.get(facilityId);
  return facility
    ? `${facility.facility_name} (${facility.facility_code})`
    : `Facility ${shortId(facilityId)}`;
}

function reportStatusTone(status: SurveillanceReportStatus) {
  if (status === "closed") return "success";
  if (status === "under_follow_up") return "warning";
  return "brand";
}

function alertStatusTone(status: AlertStatus) {
  if (status === "confirmed") return "error";
  if (status === "dismissed" || status === "false_alarm") return "success";
  if (status === "under_review") return "warning";
  return "brand";
}

function formatRisk(value: string | null) {
  if (!value) return "Not scored";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  return `${Math.round(numeric * 100)}%`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function readApiError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Could not reach the backend. Confirm the API is running on port 8000.";
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
