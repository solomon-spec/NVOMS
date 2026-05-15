"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuthSession } from "@/features/auth/useAuthSession";
import { useSearchParams } from "next/navigation";
import type {
  CreateDosePayload,
  HealthFacility,
  ImmunizationEvent,
  ImmunizationEventStatus,
  Patient,
  PatientScheduleSlot,
  PatientStatus,
  ScheduleSlotStatus,
  SourceChannel,
  Vaccine,
  VaccineBatch,
} from "@/features/registry/types";
import { ApiError } from "@/services/api";
import {
  createPatientDose,
  getPatientSummary,
  listFacilities,
  listPatientDoses,
  listPatients,
  listPatientSchedule,
  listVaccineBatches,
  listVaccines,
  regeneratePatientSchedule,
  updatePatientScheduleSlot,
} from "@/services/patients";
import { formatRole } from "@/shared/format";
import {
  maskIdentifier,
  maskPhone,
  PrivacyBoundaryBadge,
  PrivacyModeToggle,
  usePrivacyMode,
} from "@/shared/privacy";
import { AlertBanner, ConfirmModal } from "@/shared/workspace-ui";

const patientStatuses: Array<{ label: string; value: PatientStatus | "all" }> = [
  { label: "All active records", value: "all" },
  { label: "Registered", value: "registered" },
  { label: "Verifying", value: "verifying" },
  { label: "Draft", value: "draft" },
  { label: "Inactive", value: "inactive" },
];

const scheduleStatuses: Array<{ label: string; value: ScheduleSlotStatus }> = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Pending", value: "pending" },
  { label: "Due soon", value: "due_soon" },
  { label: "Due today", value: "due_today" },
  { label: "Overdue", value: "overdue" },
  { label: "Defaulter", value: "defaulter" },
  { label: "Administered", value: "administered" },
  { label: "Exempt", value: "exempt" },
  { label: "Cancelled", value: "cancelled" },
];

const doseStatuses: Array<{ label: string; value: ImmunizationEventStatus }> = [
  { label: "Administered", value: "administered" },
  { label: "Wasted", value: "wasted" },
  { label: "Refused", value: "refused" },
  { label: "Contraindicated", value: "contraindicated" },
];

const sourceChannels: Array<{ label: string; value: SourceChannel }> = [
  { label: "Online", value: "online" },
  { label: "Offline", value: "offline" },
  { label: "Synced", value: "synced" },
];

const actionableSlotStatuses = new Set<ScheduleSlotStatus>([
  "scheduled",
  "pending",
  "due_soon",
  "due_today",
  "overdue",
  "defaulter",
]);

const emptyDoseForm: CreateDosePayload = {
  vaccine_id: "",
  vaccine_batch_id: "",
  schedule_slot_id: "",
  facility_id: "",
  administered_at: "",
  administration_route: "",
  administration_site: "",
  event_status: "administered",
  source_channel: "online",
  local_client_record_id: "",
  notes: "",
};

const emptySlotForm = {
  status: "due_today" as ScheduleSlotStatus,
  status_reason: "",
};

export function ImmunizationWorkspace() {
  const session = useAuthSession();
  const { isPrivacyMode } = usePrivacyMode();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [batches, setBatches] = useState<VaccineBatch[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [schedule, setSchedule] = useState<PatientScheduleSlot[]>([]);
  const [doses, setDoses] = useState<ImmunizationEvent[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [doseForm, setDoseForm] = useState<CreateDosePayload>({
    ...emptyDoseForm,
    administered_at: toDatetimeLocalValue(new Date()),
  });
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [search, setSearch] = useState(patientIdFromUrl ?? "");
  const [status, setStatus] = useState<PatientStatus | "all">("registered");
  const [isLoading, setIsLoading] = useState(true);
  const [isPatientLoading, setIsPatientLoading] = useState(false);
  const [isRecordingDose, setIsRecordingDose] = useState(false);
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [patientError, setPatientError] = useState("");
  const [doseError, setDoseError] = useState("");
  const [slotError, setSlotError] = useState("");
  const [notice, setNotice] = useState("");
  const [showDoseConfirm, setShowDoseConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const token = session?.tokens.accessToken ?? "";
  const selectedSlot = schedule.find((slot) => slot.id === selectedSlotId) ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadWorkspace() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      try {
        const [patientRows, facilityRows, vaccineRows, batchRows] =
          await Promise.all([
            listPatients(token, { search, status }),
            listFacilities(token),
            listVaccines(token),
            listVaccineBatches(token),
          ]);

        if (isActive) {
          setPatients(patientRows);
          setFacilities(facilityRows);
          setVaccines(vaccineRows);
          setBatches(batchRows);
          setError("");
          setSelectedPatientId((current) => {
            if (patientIdFromUrl) {
              return patientIdFromUrl;
            }
            return current && patientRows.some((patient) => patient.id === current)
              ? current
              : patientRows[0]?.id ?? "";
          });
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

    const timer = window.setTimeout(loadWorkspace, 180);
    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [search, status, token, patientIdFromUrl]);

  useEffect(() => {
    let isActive = true;

    async function loadPatientWork() {
      if (!token || !selectedPatientId) {
        setSelectedPatient(null);
        setSchedule([]);
        setDoses([]);
        setSelectedSlotId("");
        return;
      }

      setIsPatientLoading(true);
      try {
        const listedPatient = patients.find((row) => row.id === selectedPatientId) ?? null;
        const [scheduleRows, doseRows, summaryResponse] = await Promise.all([
          listPatientSchedule(token, selectedPatientId),
          listPatientDoses(token, selectedPatientId),
          listedPatient ? Promise.resolve(null) : getPatientSummary(token, selectedPatientId),
        ]);

        if (isActive) {
          setSelectedPatient(listedPatient ?? summaryResponse?.patient ?? null);
          setSchedule(scheduleRows);
          setDoses(doseRows);
          setPatientError("");
          const nextSlot =
            scheduleRows.find((slot) => actionableSlotStatuses.has(slot.status)) ??
            scheduleRows[0] ??
            null;
          selectSlot(nextSlot);
        }
      } catch (caughtError) {
        if (isActive) {
          setPatientError(readApiError(caughtError));
        }
      } finally {
        if (isActive) {
          setIsPatientLoading(false);
        }
      }
    }

    loadPatientWork();

    return () => {
      isActive = false;
    };
  }, [patients, selectedPatientId, token]);

  useEffect(() => {
    if (selectedPatient) {
      rememberRecentPatient(selectedPatient.id);
    }
  }, [selectedPatient]);

  const queueSlots = useMemo(
    () =>
      schedule
        .filter((slot) => actionableSlotStatuses.has(slot.status))
        .sort(compareScheduleSlots),
    [schedule],
  );

  const reviewSlots = queueSlots.length ? queueSlots : [...schedule].sort(compareScheduleSlots);

  const metrics = useMemo(() => {
    const dueToday = schedule.filter((slot) => slot.status === "due_today").length;
    const overdue = schedule.filter((slot) =>
      ["overdue", "defaulter"].includes(slot.status),
    ).length;
    const administered = schedule.filter(
      (slot) => slot.status === "administered",
    ).length;

    return [
      { label: "Patients loaded", value: String(patients.length) },
      { label: "Action queue", value: String(queueSlots.length) },
      { label: "Due today", value: String(dueToday) },
      { label: "Overdue", value: String(overdue) },
      { label: "Administered slots", value: String(administered) },
      { label: "Dose records", value: String(doses.length) },
    ];
  }, [doses.length, patients.length, queueSlots.length, schedule]);

  const filteredBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          !doseForm.vaccine_id || batch.vaccine.id === doseForm.vaccine_id,
      ),
    [batches, doseForm.vaccine_id],
  );

  const selectedBatch = useMemo(
    () => filteredBatches.find((b) => b.id === doseForm.vaccine_batch_id),
    [filteredBatches, doseForm.vaccine_batch_id]
  );

  const isBatchExpired = useMemo(() => {
    if (!selectedBatch?.expiry_date) return false;
    return new Date(selectedBatch.expiry_date) < new Date();
  }, [selectedBatch]);

  function selectSlot(slot: PatientScheduleSlot | null) {
    setSelectedSlotId(slot?.id ?? "");
    setSlotForm({
      status: slot?.status ?? "due_today",
      status_reason: slot?.status_reason ?? "",
    });
    setDoseForm((current) => ({
      ...current,
      schedule_slot_id: slot?.id ?? "",
      vaccine_id: slot?.vaccine.id ?? current.vaccine_id,
    }));
  }

  async function reloadPatientWork(patientId = selectedPatientId) {
    if (!patientId || !token) {
      return;
    }

    setIsPatientLoading(true);
    try {
      const [scheduleRows, doseRows] = await Promise.all([
        listPatientSchedule(token, patientId),
        listPatientDoses(token, patientId),
      ]);
      setSchedule(scheduleRows);
      setDoses(doseRows);
      setPatientError("");
    } catch (caughtError) {
      setPatientError(readApiError(caughtError));
    } finally {
      setIsPatientLoading(false);
    }
  }

  async function handleRegenerateSchedule() {
    if (!selectedPatientId) {
      return;
    }

    setIsRegenerating(true);
    setSlotError("");
    setNotice("");
    try {
      const response = await regeneratePatientSchedule(token, selectedPatientId);
      setSchedule(response.schedule);
      selectSlot(
        response.schedule.find((slot) => actionableSlotStatuses.has(slot.status)) ??
          response.schedule[0] ??
          null,
      );
      setNotice(
        response.created
          ? `Schedule regenerated with ${response.created} new slot(s).`
          : "Schedule refreshed. No new slots were needed.",
      );
    } catch (caughtError) {
      setSlotError(readApiError(caughtError));
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleUpdateSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatientId || !selectedSlot) {
      return;
    }

    setIsUpdatingSlot(true);
    setSlotError("");
    setNotice("");
    try {
      const updated = await updatePatientScheduleSlot(
        token,
        selectedPatientId,
        selectedSlot.id,
        {
          status: slotForm.status,
          status_reason: slotForm.status_reason.trim() || null,
        },
      );
      setSchedule((current) =>
        current.map((slot) => (slot.id === updated.id ? updated : slot)),
      );
      selectSlot(updated);
      setNotice("Schedule slot updated.");
    } catch (caughtError) {
      setSlotError(readApiError(caughtError));
    } finally {
      setIsUpdatingSlot(false);
    }
  }

  async function handleRecordDose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatientId) return;
    setDoseError("");
    setNotice("");
    if (!doseForm.vaccine_id) {
      setDoseError("Select a vaccine before recording the dose.");
      return;
    }
    if (isBatchExpired) {
      setDoseError("Cannot record a dose using an expired vaccine batch.");
      return;
    }
    // Show confirm modal instead of submitting directly
    setShowDoseConfirm(true);
  }

  async function confirmAndRecordDose() {
    if (!selectedPatientId) return;
    setIsRecordingDose(true);
    try {
      const dose = await createPatientDose(
        token,
        selectedPatientId,
        normalizeDosePayload(doseForm),
      );
      setDoses((current) => [dose, ...current]);
      setDoseForm({
        ...emptyDoseForm,
        administered_at: toDatetimeLocalValue(new Date()),
      });
      setNotice("Dose recorded.");
      await reloadPatientWork(selectedPatientId);
    } catch (caughtError) {
      setDoseError(readApiError(caughtError));
    } finally {
      setIsRecordingDose(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <li>
            <Link href="/patients" className="text-gray-400 hover:text-white">
              Patients
            </Link>
          </li>
          {selectedPatient ? (
            <>
              <li className="text-gray-500">/</li>
              <li>
                <Link
                  href={`/patients/${selectedPatient.id}`}
                  className="text-gray-400 hover:text-white"
                >
                  Patient Detail
                </Link>
              </li>
            </>
          ) : null}
          <li className="text-gray-500">/</li>
          <li className="text-white">Immunization</li>
        </ol>
      </nav>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
            Immunization
          </p>
          <PrivacyBoundaryBadge />
        </div>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Due and overdue vaccination work
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Select a patient, review today&apos;s clinical queue, update schedule
              outcomes, and record doses through the patient dose API.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrivacyModeToggle />
            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${isOnline ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"}`}>
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-success-500" : "bg-warning-500 animate-pulse"}`} />
              {isOnline ? "Online" : "Offline - doses will be queued"}
            </div>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={!selectedPatientId || isPatientLoading}
              type="button"
              onClick={() => reloadPatientWork()}
            >
              Refresh selected patient
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      {!isOnline && (
        <AlertBanner tone="warning">
          <strong>You are offline.</strong> Doses recorded now will be submitted to the server when your connection is restored via the Offline Sync module.
        </AlertBanner>
      )}

      {notice ? (
        <div className="rounded-lg border border-success-200 bg-success-25 px-4 py-3 text-sm font-semibold text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
          {notice}
        </div>
      ) : null}

      {/* Confirm dose modal */}
      <ConfirmModal
        isOpen={showDoseConfirm}
        title="Confirm dose before submission"
        message={
          <div className="space-y-2">
            <p className="mb-4">This action will update the patient&apos;s official vaccination record.</p>
            <div className="grid grid-cols-[110px_1fr] gap-1 text-sm">
              <span className="font-semibold text-gray-500 dark:text-gray-400">Patient:</span>
              <span>{selectedPatient?.full_name} / {selectedPatient?.uid}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">Vaccine:</span>
              <span>{vaccines.find((v) => v.id === doseForm.vaccine_id)?.vaccine_name}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">Dose:</span>
              <span>{selectedSlot ? `${selectedSlot.vaccine.vaccine_code} due ${selectedSlot.due_date}` : formatRole(doseForm.event_status ?? "administered")}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">Date:</span>
              <span>{formatDateTime(doseForm.administered_at)}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">Batch:</span>
              <span>{selectedBatch?.batch_number ?? "No batch"}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">Route/Site:</span>
              <span>{doseForm.administration_route || "N/A"} / {doseForm.administration_site || "N/A"}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">Facility:</span>
              <span>{facilities.find((f) => f.id === doseForm.facility_id)?.facility_name ?? "Not selected"}</span>
            </div>
          </div>
        }
        confirmLabel="Confirm and Record"
        isLoading={isRecordingDose}
        onConfirm={() => { setShowDoseConfirm(false); confirmAndRecordDose(); }}
        onCancel={() => setShowDoseConfirm(false)}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(560px,1.18fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Patient queue
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <input
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Search UID or patient/caregiver terms"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as PatientStatus | "all")
                }
              >
                {patientStatuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <InlineError className="m-5" message={error} /> : null}

          <div className="max-h-[760px] overflow-y-auto p-3">
            {isLoading ? (
              <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                Loading patients...
              </p>
            ) : patients.length ? (
              <div className="space-y-2">
                {patients.map((patient) => (
                  <button
                    className={`w-full rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
                      selectedPatientId === patient.id
                        ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                    }`}
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {isPrivacyMode ? "Name hidden" : patient.full_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {maskIdentifier(patient.uid)} · {formatAge(patient.date_of_birth)}
                        </p>
                      </div>
                      <StatusPill label={formatRole(patient.status)} />
                    </div>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      {patient.primary_caregiver
                        ? `${
                            isPrivacyMode
                              ? "Caregiver hidden"
                              : patient.primary_caregiver.full_name
                          } · ${maskPhone(patient.primary_caregiver.phone_number)}`
                        : "No caregiver"}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                No patients match the current filters.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <SelectedPatientHeader
            patient={selectedPatient}
            isLoading={isPatientLoading}
            onRegenerate={handleRegenerateSchedule}
            isRegenerating={isRegenerating}
            isPrivacyMode={isPrivacyMode}
            dueCount={schedule.filter((slot) => slot.status === "due_today").length}
            overdueCount={schedule.filter((slot) =>
              ["overdue", "defaulter"].includes(slot.status),
            ).length}
          />

          {patientError ? <InlineError message={patientError} /> : null}

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(430px,1.1fr)]">
            <section
              id="immunization-schedule-review"
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Due and overdue review
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose a clinical slot to prefill the dose form, review the schedule,
                or mark an exemption, contraindication, refusal, or cancellation.
              </p>

              {slotError ? <InlineError className="mt-4" message={slotError} /> : null}

              <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {reviewSlots.length ? (
                  reviewSlots.map((slot) => (
                    <button
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
                        selectedSlotId === slot.id
                          ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                      }`}
                      key={slot.id}
                      type="button"
                      onClick={() => selectSlot(slot)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {slot.vaccine.vaccine_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Due {slot.due_date}
                        </p>
                      </div>
                      <StatusPill label={formatRole(slot.status)} />
                    </button>
                  ))
                ) : (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                    No schedule slots yet. Regenerate the selected patient&apos;s
                    schedule once vaccine schedule rules exist.
                  </p>
                )}
              </div>

              {selectedSlot ? (
                <form
                  className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-800"
                  onSubmit={handleUpdateSlot}
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Update slot status
                  </h3>
                  <div className="mt-4 grid gap-4">
                    <SelectInput
                      label="Status"
                      value={slotForm.status}
                      onChange={(value) =>
                        setSlotForm((current) => ({
                          ...current,
                          status: value as ScheduleSlotStatus,
                        }))
                      }
                      options={scheduleStatuses}
                    />
                    <TextAreaInput
                      label="Reason"
                      value={slotForm.status_reason}
                      onChange={(value) =>
                        setSlotForm((current) => ({
                          ...current,
                          status_reason: value,
                        }))
                      }
                    />
                  </div>
                  <button
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
                    disabled={isUpdatingSlot}
                    type="submit"
                  >
                    {isUpdatingSlot ? "Updating slot" : "Update slot"}
                  </button>
                </form>
              ) : null}
            </section>

            <section
              id="record-dose"
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Record dose
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Dose submission opens a confirmation step with patient, vaccine,
                dose, date/time, batch, and facility.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ActionPill href="#immunization-schedule-review" label="Review schedule" />
                <ActionPill href="#dose-history" label="Dose history" />
                <ActionPill href="#record-dose" label="Exemption/refusal" />
              </div>

              <form className="mt-5 grid gap-4" onSubmit={handleRecordDose}>
                <SelectInput
                  label="Schedule slot"
                  value={doseForm.schedule_slot_id ?? ""}
                  onChange={(value) => {
                    const slot = schedule.find((item) => item.id === value);
                    setDoseForm((current) => ({
                      ...current,
                      schedule_slot_id: value,
                      vaccine_id: slot?.vaccine.id ?? current.vaccine_id,
                    }));
                    if (slot) {
                      selectSlot(slot);
                    }
                  }}
                  options={[
                    { label: "No schedule slot", value: "" },
                    ...schedule.map((slot) => ({
                      label: `${slot.vaccine.vaccine_name} · due ${slot.due_date}`,
                      value: slot.id,
                    })),
                  ]}
                />
                <SelectInput
                  label="Vaccine"
                  value={doseForm.vaccine_id}
                  onChange={(value) =>
                    setDoseForm((current) => ({
                      ...current,
                      vaccine_id: value,
                      vaccine_batch_id: "",
                    }))
                  }
                  options={[
                    { label: "Select vaccine", value: "" },
                    ...vaccines.map((vaccine) => ({
                      label: `${vaccine.vaccine_name} (${vaccine.vaccine_code})`,
                      value: vaccine.id,
                    })),
                  ]}
                />
                <SelectInput
                  label="Vaccine batch"
                  value={doseForm.vaccine_batch_id ?? ""}
                  onChange={(value) =>
                    setDoseForm((current) => ({
                      ...current,
                      vaccine_batch_id: value,
                    }))
                  }
                  options={[
                    { label: "No batch selected", value: "" },
                    ...filteredBatches.map((batch) => ({
                      label: `${batch.batch_number} · expires ${
                        batch.expiry_date ?? "unknown"
                      }`,
                      value: batch.id,
                    })),
                  ]}
                />
                {/* Batch expiry warning */}
                {(() => {
                  if (selectedBatch?.expiry_date) {
                    const expiry = new Date(selectedBatch.expiry_date);
                    const now = new Date();
                    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
                    
                    if (daysUntilExpiry < 0) {
                      return (
                        <AlertBanner tone="error" count={1}>
                          <strong>Batch {selectedBatch.batch_number} expired on {selectedBatch.expiry_date}.</strong> Do not administer expired vaccines. Select a valid batch or contact your supervisor.
                        </AlertBanner>
                      );
                    } else if (daysUntilExpiry <= 30) {
                      return (
                        <AlertBanner tone="warning" count={1}>
                          <strong>Batch {selectedBatch.batch_number} expires soon ({selectedBatch.expiry_date}).</strong> Please ensure this is the oldest batch available.
                        </AlertBanner>
                      );
                    }
                  }
                  return null;
                })()}
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Administered at"
                    type="datetime-local"
                    value={doseForm.administered_at}
                    onChange={(value) =>
                      setDoseForm((current) => ({
                        ...current,
                        administered_at: value,
                      }))
                    }
                    required
                  />
                  <SelectInput
                    label="Facility"
                    value={doseForm.facility_id ?? ""}
                    onChange={(value) =>
                      setDoseForm((current) => ({
                        ...current,
                        facility_id: value,
                      }))
                    }
                    options={facilityOptions(facilities)}
                  />
                  <TextInput
                    label="Route"
                    value={doseForm.administration_route ?? ""}
                    onChange={(value) =>
                      setDoseForm((current) => ({
                        ...current,
                        administration_route: value,
                      }))
                    }
                  />
                  <TextInput
                    label="Site"
                    value={doseForm.administration_site ?? ""}
                    onChange={(value) =>
                      setDoseForm((current) => ({
                        ...current,
                        administration_site: value,
                      }))
                    }
                  />
                  <SelectInput
                    label="Event status"
                    value={doseForm.event_status ?? "administered"}
                    onChange={(value) =>
                      setDoseForm((current) => ({
                        ...current,
                        event_status: value as ImmunizationEventStatus,
                      }))
                    }
                    options={doseStatuses}
                  />
                  <SelectInput
                    label="Source"
                    value={doseForm.source_channel ?? "online"}
                    onChange={(value) =>
                      setDoseForm((current) => ({
                        ...current,
                        source_channel: value as SourceChannel,
                      }))
                    }
                    options={sourceChannels}
                  />
                </div>
                <TextInput
                  label="Local client record ID"
                  value={doseForm.local_client_record_id ?? ""}
                  onChange={(value) =>
                    setDoseForm((current) => ({
                      ...current,
                      local_client_record_id: value,
                    }))
                  }
                />
                <TextAreaInput
                  label="Notes"
                  value={doseForm.notes ?? ""}
                  onChange={(value) =>
                    setDoseForm((current) => ({ ...current, notes: value }))
                  }
                />

                {doseError ? <InlineError message={doseError} /> : null}

                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
                  disabled={!selectedPatientId || isRecordingDose || isBatchExpired}
                  type="submit"
                >
                  {isRecordingDose ? "Recording dose" : "Record dose"}
                </button>
              </form>
            </section>
          </div>

          <section
            id="dose-history"
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dose history
            </h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
                      {dose.notes ? ` · ${dose.notes}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                  No doses recorded for the selected patient.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function SelectedPatientHeader({
  dueCount,
  isLoading,
  isRegenerating,
  isPrivacyMode,
  onRegenerate,
  overdueCount,
  patient,
}: {
  dueCount: number;
  isLoading: boolean;
  isRegenerating: boolean;
  isPrivacyMode: boolean;
  onRegenerate: () => void;
  overdueCount: number;
  patient: Patient | null;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {patient ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
              Patient context
            </p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
              {isPrivacyMode ? "Name hidden" : patient.full_name}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {patient.uid} · {formatAge(patient.date_of_birth)} · {formatRole(patient.status)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill label={`${dueCount} due today`} />
              <StatusPill label={`${overdueCount} overdue`} />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/patients/${patient.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Back to Patient
            </Link>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isLoading || isRegenerating}
              type="button"
              onClick={onRegenerate}
            >
              {isRegenerating ? "Regenerating" : "Regenerate schedule"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Select a patient to manage immunization work.
        </p>
      )}
    </section>
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

function ActionPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600 transition hover:border-brand-200 hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-brand-500/10"
    >
      {label}
    </a>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 rounded border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-100 dark:bg-brand-50 dark:text-brand-700">
      {label}
    </span>
  );
}

function compareScheduleSlots(left: PatientScheduleSlot, right: PatientScheduleSlot) {
  const statusPriority: Record<ScheduleSlotStatus, number> = {
    overdue: 0,
    defaulter: 1,
    due_today: 2,
    due_soon: 3,
    pending: 4,
    scheduled: 5,
    administered: 6,
    exempt: 7,
    cancelled: 8,
  };

  const leftPriority = statusPriority[left.status] ?? 9;
  const rightPriority = statusPriority[right.status] ?? 9;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return new Date(left.due_date).getTime() - new Date(right.due_date).getTime();
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

type TextInputProps = {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

function TextInput({
  label,
  value,
  type = "text",
  required,
  onChange,
}: TextInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <input
        aria-label={label}
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type SelectInputProps = {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
};

function SelectInput({ label, value, options, onChange }: SelectInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <select
        aria-label={label}
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextAreaInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextAreaInput({ label, value, onChange }: TextAreaInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <textarea
        aria-label={label}
        className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function InlineError({
  className = "",
  message,
}: {
  className?: string;
  message: string;
}) {
  return (
    <div
      className={`rounded-lg border border-error-200 bg-error-25 px-4 py-3 text-sm font-medium text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300 ${className}`}
    >
      {message}
    </div>
  );
}

function normalizeDosePayload(payload: CreateDosePayload): CreateDosePayload {
  return {
    vaccine_id: payload.vaccine_id,
    vaccine_batch_id: payload.vaccine_batch_id || null,
    schedule_slot_id: payload.schedule_slot_id || null,
    facility_id: payload.facility_id || null,
    administered_at: new Date(payload.administered_at).toISOString(),
    administration_route: payload.administration_route?.trim() || null,
    administration_site: payload.administration_site?.trim() || null,
    event_status: payload.event_status ?? "administered",
    source_channel: payload.source_channel ?? "online",
    local_client_record_id: payload.local_client_record_id?.trim() || null,
    notes: payload.notes?.trim() || null,
  };
}

function facilityOptions(facilities: HealthFacility[]) {
  return [
    { label: "Not selected", value: "" },
    ...facilities.map((facility) => ({
      label: `${facility.facility_name} (${facility.facility_code})`,
      value: facility.id,
    })),
  ];
}

function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
    return `${Math.max(0, months)} mo`;
  }

  return `${Math.floor(months / 12)} yr`;
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
