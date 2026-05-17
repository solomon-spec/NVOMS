"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type { HealthFacility } from "@/features/registry/types";
import type {
  ClinicalOutcome,
  FollowUpAction,
  LabResultStatus,
  SpecimenStatus,
  SurveillanceReport,
  SurveillanceReportStatus,
} from "@/features/outbreaks/types";
import { ApiError } from "@/services/api";
import { listFacilities } from "@/services/patients";
import {
  createSurveillanceFollowUp,
  getSurveillanceReport,
  listSurveillanceFollowUps,
  updateSurveillanceReport,
} from "@/services/outbreaks";
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



const labResultOptions = [
  { label: "Not sent", value: "not_sent" },
  { label: "Pending", value: "pending" },
  { label: "Positive", value: "positive" },
  { label: "Negative", value: "negative" },
  { label: "Inconclusive", value: "inconclusive" },
  { label: "Not Recorded", value: "" },
];

const clinicalOutcomeOptions = [
  { label: "Unknown / Ongoing", value: "unknown" },
  { label: "Recovering", value: "recovering" },
  { label: "Recovered", value: "recovered" },
  { label: "Hospitalized", value: "hospitalized" },
  { label: "Referred", value: "referred" },
  { label: "Transferred", value: "transferred" },
  { label: "Deceased", value: "deceased" },
];

const specimenStatusOptions = [
  { label: "Not collected", value: "not_collected" },
  { label: "Pending collection", value: "pending" },
  { label: "Collected", value: "collected" },
  { label: "Sent to lab", value: "sent" },
  { label: "Received by lab", value: "received" },
];

const emptyStatusForm = {
  status: "submitted" as SurveillanceReportStatus,
  follow_up_required: true,
  notes: "",
  lab_sample_taken: false,
  specimen_status: "not_collected" as SpecimenStatus,
  specimen_type: "",
  specimen_collection_date: "",
  lab_test_type: "",
  lab_result_status: "" as LabResultStatus | "",
  lab_result_date: "",
  lab_result_notes: "",
  clinical_outcome: "unknown" as ClinicalOutcome,
  clinical_outcome_date: "",
  outcome_notes: "",
  next_follow_up_date: "",
  vaccine_dose_label: "",
  vaccination_date: "",
};

const emptyFollowUpForm = {
  action_taken: "",
  due_date: "",
};


export function OutbreakDetailWorkspace({ reportId }: { reportId: string }) {
  const session = useAuthSession();
  const role = session?.user.role ?? "";
  const canManageReports = role === "ADMIN" || role === "HEALTH_WORKER";
  const token = session?.tokens.accessToken ?? "";

  const [report, setReport] = useState<SurveillanceReport | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpAction[]>([]);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);

  const [statusForm, setStatusForm] = useState(emptyStatusForm);
  const [followUpForm, setFollowUpForm] = useState(emptyFollowUpForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [notice, setNotice] = useState("");

  const facilityMap = useMemo(
    () => new Map(facilities.map((item) => [item.id, item])),
    [facilities],
  );


  useEffect(() => {
    let isActive = true;

    async function loadReportData() {
      if (!token || !reportId) return;

      setIsLoading(true);
      try {
        const [reportData, facilityRows] = await Promise.all([
          getSurveillanceReport(token, reportId),
          listFacilities(token),
        ]);

        if (!isActive) return;

        setReport(reportData);
        setFacilities(facilityRows);
        setStatusForm({
          status: reportData.status,
          follow_up_required: reportData.follow_up_required,
          notes: reportData.notes ?? "",
          lab_sample_taken: reportData.lab_sample_taken ?? false,
          specimen_status: reportData.specimen_status ?? "not_collected",
          specimen_type: reportData.specimen_type ?? "",
          specimen_collection_date: reportData.specimen_collection_date ?? "",
          lab_test_type: reportData.lab_test_type ?? "",
          lab_result_status: reportData.lab_result_status ?? "",
          lab_result_date: reportData.lab_result_date ?? "",
          lab_result_notes: reportData.lab_result_notes ?? "",
          clinical_outcome: reportData.clinical_outcome ?? "unknown",
          clinical_outcome_date: reportData.clinical_outcome_date ?? "",
          outcome_notes: reportData.outcome_notes ?? "",
          next_follow_up_date: reportData.next_follow_up_date ?? "",
          vaccine_dose_label: reportData.vaccine_dose_label ?? "",
          vaccination_date: reportData.vaccination_date ?? "",
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
        lab_sample_taken: statusForm.lab_sample_taken,
        specimen_status: statusForm.specimen_status,
        specimen_type: statusForm.specimen_type.trim() || null,
        specimen_collection_date: statusForm.specimen_collection_date || null,
        lab_test_type: statusForm.lab_test_type.trim() || null,
        lab_result_status: statusForm.lab_result_status || null,
        lab_result_date: statusForm.lab_result_date || null,
        lab_result_notes: statusForm.lab_result_notes.trim() || null,
        clinical_outcome: statusForm.clinical_outcome || null,
        clinical_outcome_date: statusForm.clinical_outcome_date || null,
        outcome_notes: statusForm.outcome_notes.trim() || null,
        next_follow_up_date: statusForm.next_follow_up_date || null,
        vaccine_dose_label: statusForm.vaccine_dose_label.trim() || null,
        vaccination_date: statusForm.vaccination_date || null,
      });
      setReport(updated);
      setNotice("Case report status updated.");
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
          href="/outbreaks"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          ← Back to Case Reports
        </Link>
      </div>

      {notice ? <Notice>{notice}</Notice> : null}

      <div className="grid gap-6">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
                  Case Details
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {report.condition_type}
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Reported {formatDateTime(report.created_at)} by{" "}
                  {report.reported_by ? shortId(report.reported_by) : "not recorded"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label={formatRole(report.surveillance_category)} />
                <StatusPill
                  label={formatRole(report.status)}
                  tone={reportStatusTone(report.status)}
                />
                <StatusPill
                  label={report.severity ? formatRole(report.severity) : "Severity not assessed"}
                  tone={severityTone(report.severity)}
                />
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Case ID" value={shortId(report.id)} />
              <DetailItem label="Facility" value={facilityLabel(report.facility, facilityMap)} />
              <DetailItem label="Onset date" value={formatPlainDate(report.onset_date)} />
              <DetailItem
                label="Follow-up"
                value={report.follow_up_required ? "Required" : "Not required"}
              />
            </div>
          </section>
          
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400 mb-4">
              Patient Context
            </h2>
            {report.patient_details ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="Patient" value={report.patient_details.full_name} />
                <DetailItem label="Identifier" value={report.patient_details.uid} />
                <DetailItem
                  label="Age / sex"
                  value={`${formatAge(report.patient_details.date_of_birth)} / ${formatRole(report.patient_details.sex)}`}
                />
                <DetailItem
                  label="Location"
                  value={report.patient_details.residence_unit?.name ?? "Not recorded yet"}
                />
                <DetailItem
                  label="Caregiver"
                  value={report.patient_details.primary_caregiver?.full_name ?? "Not recorded yet"}
                />
                <DetailItem
                  label="Caregiver phone"
                  value={report.patient_details.primary_caregiver?.phone_number ?? "Not recorded yet"}
                />
                <DetailItem
                  label="Registered facility"
                  value={report.patient_details.registered_facility ?? "Not recorded yet"}
                />
                <Link
                  href={`/patients/${report.patient_details.id}`}
                  className="flex min-h-[74px] items-center justify-center rounded-xl border border-brand-200 bg-brand-25 p-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100"
                >
                  Open patient profile
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Patient context not recorded yet.</p>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
                  Case Report
                </p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {report.condition_type}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {report.disease_suspected || "Suspected disease not recorded yet"} -{" "}
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
              <DetailItem label="Onset date" value={formatPlainDate(report.onset_date)} />
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
                value={report.severity ? formatRole(report.severity) : "Not recorded yet"}
              />

              <DetailItem
                label="Clinical Outcome"
                value={report.clinical_outcome ? formatRole(report.clinical_outcome) : "Not recorded yet"}
              />
              <DetailItem
                label="Lab Status"
                value={report.lab_sample_taken ? `${report.lab_test_type || "Specimen taken"} (${report.lab_result_status ? formatRole(report.lab_result_status) : "Pending"})` : "Not recorded yet"}
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

          <section className="grid gap-6 lg:grid-cols-3">
            <CaseInfoCard title="Vaccine Link">
              {report.surveillance_category === "aefi" ? (
                <div className="grid gap-3">
                  <DetailItem
                    label="Vaccine"
                    value={
                      report.aefi_immunization_event?.vaccine.vaccine_name ??
                      report.aefi_vaccine?.vaccine_name ??
                      "Not recorded yet"
                    }
                  />
                  <DetailItem
                    label="Dose"
                    value={report.vaccine_dose_label || "Not recorded yet"}
                  />
                  <DetailItem
                    label="Vaccination date"
                    value={
                      report.vaccination_date
                        ? formatPlainDate(report.vaccination_date)
                        : report.aefi_immunization_event
                          ? formatDateTime(report.aefi_immunization_event.administered_at)
                          : "Not recorded yet"
                    }
                  />
                  <DetailItem
                    label="Batch / lot"
                    value={
                      report.aefi_immunization_event?.vaccine_batch?.batch_number ??
                      report.aefi_vaccine_batch?.batch_number ??
                      "Not recorded yet"
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Not applicable for this case type.
                </p>
              )}
            </CaseInfoCard>

            <CaseInfoCard title="Lab Result">
              <div className="grid gap-3">
                <DetailItem label="Specimen status" value={formatRole(report.specimen_status)} />
                <DetailItem label="Specimen type" value={report.specimen_type || "Not recorded yet"} />
                <DetailItem
                  label="Collection date"
                  value={
                    report.specimen_collection_date
                      ? formatPlainDate(report.specimen_collection_date)
                      : "Not recorded yet"
                  }
                />
                <DetailItem
                  label="Result"
                  value={report.lab_result_status ? formatRole(report.lab_result_status) : "Not recorded yet"}
                />
                <DetailItem
                  label="Result date"
                  value={report.lab_result_date ? formatPlainDate(report.lab_result_date) : "Not recorded yet"}
                />
                <DetailItem label="Result notes" value={report.lab_result_notes || "Not recorded yet"} />
              </div>
            </CaseInfoCard>

            <CaseInfoCard title="Outcome and Follow-up">
              <div className="grid gap-3">
                <DetailItem
                  label="Outcome"
                  value={report.clinical_outcome ? formatRole(report.clinical_outcome) : "Not recorded yet"}
                />
                <DetailItem
                  label="Outcome date"
                  value={
                    report.clinical_outcome_date
                      ? formatPlainDate(report.clinical_outcome_date)
                      : "Not recorded yet"
                  }
                />
                <DetailItem
                  label="Next follow-up"
                  value={
                    report.next_follow_up_date
                      ? formatPlainDate(report.next_follow_up_date)
                      : "Not recorded yet"
                  }
                />
                <DetailItem label="Outcome notes" value={report.outcome_notes || "Not recorded yet"} />
              </div>
            </CaseInfoCard>
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

                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    <input
                      checked={statusForm.lab_sample_taken}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      type="checkbox"
                      onChange={(event) =>
                        setStatusForm({ ...statusForm, lab_sample_taken: event.target.checked })
                      }
                    />
                    Lab sample taken
                  </label>
                  <SelectInput
                    label="Specimen status"
                    value={statusForm.specimen_status}
                    onChange={(value) =>
                      setStatusForm({ ...statusForm, specimen_status: value as SpecimenStatus })
                    }
                    options={specimenStatusOptions}
                  />
                  <TextInput
                    label="Specimen type"
                    value={statusForm.specimen_type}
                    onChange={(value) => setStatusForm({ ...statusForm, specimen_type: value })}
                  />
                  <TextInput
                    label="Collection date"
                    type="date"
                    value={statusForm.specimen_collection_date}
                    onChange={(value) =>
                      setStatusForm({ ...statusForm, specimen_collection_date: value })
                    }
                  />
                  <TextInput
                    label="Lab test type"
                    value={statusForm.lab_test_type}
                    onChange={(value) => setStatusForm({ ...statusForm, lab_test_type: value })}
                  />
                  <SelectInput
                    label="Lab result"
                    value={statusForm.lab_result_status}
                    onChange={(value) =>
                      setStatusForm({ ...statusForm, lab_result_status: value as LabResultStatus | "" })
                    }
                    options={labResultOptions}
                  />
                  <TextInput
                    label="Result date"
                    type="date"
                    value={statusForm.lab_result_date}
                    onChange={(value) => setStatusForm({ ...statusForm, lab_result_date: value })}
                  />
                  <TextAreaInput
                    label="Lab result notes"
                    value={statusForm.lab_result_notes}
                    onChange={(value) => setStatusForm({ ...statusForm, lab_result_notes: value })}
                  />
                  <SelectInput
                    label="Clinical outcome"
                    value={statusForm.clinical_outcome}
                    onChange={(value) =>
                      setStatusForm({ ...statusForm, clinical_outcome: value as ClinicalOutcome })
                    }
                    options={clinicalOutcomeOptions}
                  />
                  <TextInput
                    label="Outcome date"
                    type="date"
                    value={statusForm.clinical_outcome_date}
                    onChange={(value) =>
                      setStatusForm({ ...statusForm, clinical_outcome_date: value })
                    }
                  />
                  <TextInput
                    label="Next follow-up date"
                    type="date"
                    value={statusForm.next_follow_up_date}
                    onChange={(value) =>
                      setStatusForm({ ...statusForm, next_follow_up_date: value })
                    }
                  />
                  <TextAreaInput
                    label="Outcome notes"
                    value={statusForm.outcome_notes}
                    onChange={(value) => setStatusForm({ ...statusForm, outcome_notes: value })}
                  />
                  {report.surveillance_category === "aefi" ? (
                    <>
                      <TextInput
                        label="Dose label"
                        value={statusForm.vaccine_dose_label}
                        onChange={(value) =>
                          setStatusForm({ ...statusForm, vaccine_dose_label: value })
                        }
                      />
                      <TextInput
                        label="Vaccination date"
                        type="date"
                        value={statusForm.vaccination_date}
                        onChange={(value) =>
                          setStatusForm({ ...statusForm, vaccination_date: value })
                        }
                      />
                    </>
                  ) : null}
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

function severityTone(severity: SurveillanceReport["severity"]) {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "moderate") return "warning";
  if (severity === "low") return "success";
  return "gray";
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

function formatPlainDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatAge(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "Unknown age";
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasBirthdayPassed) years -= 1;
  return years >= 1 ? `${years} yr` : "Under 1 yr";
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

function CaseInfoCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
        {title}
      </h2>
      {children}
    </section>
  );
}
