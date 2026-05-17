"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuthSession } from "@/features/auth/useAuthSession";
import { useSearchParams } from "next/navigation";
import type {
  CreateDosePayload,
  HealthFacility,
  ImmunizationEvent,
  ImmunizationHistorySummary,
  ImmunizationEventStatus,
  Patient,
  PatientDiseaseSchedule,
  PatientScheduleSlot,
  PatientStatus,
  ScheduleSlotStatus,
  SourceChannel,
  Vaccine,
  VaccineBatch,
} from "@/features/registry/types";
import { ApiError } from "@/services/api";
import {
  createPatientOutcome,
  getPatientSummary,
  listFacilities,
  listPatientDiseaseSchedules,
  listPatientVaccinationHistory,
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

const supportedDiseases = [
  {
    key: "measles",
    label: "Measles",
    keywords: ["measles", "mr", "mcv"],
  },
  {
    key: "polio",
    label: "Polio",
    keywords: ["polio", "opv", "ipv"],
  },
  {
    key: "cholera",
    label: "Cholera",
    keywords: ["cholera", "ocv"],
  },
] as const;

type SupportedDiseaseKey = (typeof supportedDiseases)[number]["key"];
type DiseaseStatus =
  | "protected"
  | "completed"
  | "refused"
  | "contraindicated"
  | "due_today"
  | "due_soon"
  | "overdue"
  | "scheduled"
  | "not_started";

type DiseaseCardData = {
  key: SupportedDiseaseKey;
  label: string;
  administeredCount: number;
  lastDose: ImmunizationEvent | null;
  diseaseSchedule: PatientDiseaseSchedule | null;
  nextActionSlot: PatientScheduleSlot | null;
  status: DiseaseStatus;
  currentDueDate: string | null;
  isComplete: boolean;
};

const actionableSlotStatuses = new Set<ScheduleSlotStatus>([
  "scheduled",
  "pending",
  "due_soon",
  "due_today",
  "overdue",
  "defaulter",
]);

const emptyDoseForm: CreateDosePayload = {
  disease: null,
  vaccine_id: "",
  vaccine_batch_id: "",
  schedule_slot_id: "",
  facility_id: "",
  administered_at: "",
  administration_route: "",
  administration_site: "",
  event_status: "administered",
  next_due_date: "",
  disease_completed: false,
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
  const [diseaseSchedules, setDiseaseSchedules] = useState<PatientDiseaseSchedule[]>([]);
  const [historySummary, setHistorySummary] = useState<ImmunizationHistorySummary[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
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
        setDiseaseSchedules([]);
        setHistorySummary([]);
        setSelectedSlotId("");
        return;
      }

      setIsPatientLoading(true);
      try {
        const listedPatient = patients.find((row) => row.id === selectedPatientId) ?? null;
        const [
          scheduleRows,
          diseaseScheduleRows,
          historySummaryRows,
          historyDetailRows,
          summaryResponse,
        ] = await Promise.all([
          listPatientSchedule(token, selectedPatientId),
          listPatientDiseaseSchedules(token, selectedPatientId),
          listPatientVaccinationHistory(token, selectedPatientId, false),
          listPatientVaccinationHistory(token, selectedPatientId, true),
          listedPatient ? Promise.resolve(null) : getPatientSummary(token, selectedPatientId),
        ]);

        if (isActive) {
          setSelectedPatient(listedPatient ?? summaryResponse?.patient ?? null);
          setSchedule(scheduleRows);
          setDiseaseSchedules(diseaseScheduleRows);
          setHistorySummary(historySummaryRows as ImmunizationHistorySummary[]);
          const detailRows = historyDetailRows as ImmunizationEvent[];
          setDoses(detailRows);
          setSelectedHistoryId((current) =>
            current && detailRows.some((dose) => dose.id === current)
              ? current
              : detailRows[0]?.id ?? "",
          );
          setPatientError("");
          const nextSlot =
            scheduleRows.find(
              (slot) =>
                getDiseaseKey(slot.vaccine) &&
                actionableSlotStatuses.has(slot.status),
            ) ??
            scheduleRows.find((slot) => getDiseaseKey(slot.vaccine)) ??
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

  const diseaseCards = useMemo(
    () =>
      supportedDiseases.map((disease) => {
        const diseaseSchedule =
          diseaseSchedules.find((row) => row.disease === disease.key) ?? null;
        const diseaseSlots = schedule
          .filter((slot) => getDiseaseKey(slot.vaccine) === disease.key)
          .sort(compareScheduleSlots);
        const diseaseDoses = doses
          .filter((dose) => dose.disease === disease.key || getDiseaseKey(dose.vaccine) === disease.key)
          .sort(
            (left, right) =>
              new Date(right.administered_at).getTime() -
              new Date(left.administered_at).getTime(),
          );
        const nextActionSlot =
          diseaseSlots.find((slot) => actionableSlotStatuses.has(slot.status)) ??
          diseaseSlots[0] ??
          null;
        const status = deriveDiseaseStatus(diseaseSchedule, diseaseSlots, diseaseDoses);

        return {
          ...disease,
          administeredCount: diseaseDoses.filter(
            (dose) => dose.event_status === "administered",
          ).length,
          lastDose: diseaseDoses[0] ?? null,
          diseaseSchedule,
          nextActionSlot,
          status,
          currentDueDate: diseaseSchedule?.current_due_date ?? nextActionSlot?.due_date ?? null,
          isComplete: Boolean(diseaseSchedule?.is_complete),
        };
      }),
    [diseaseSchedules, doses, schedule],
  );

  const selectedDisease =
    doseForm.disease ??
    getDiseaseKey(selectedSlot?.vaccine ?? null) ??
    getDiseaseKey(vaccines.find((vaccine) => vaccine.id === doseForm.vaccine_id) ?? null);

  const metrics = useMemo(() => {
    const dueToday = schedule.filter((slot) => slot.status === "due_today").length;
    const overdue = schedule.filter((slot) =>
      ["overdue", "defaulter"].includes(slot.status),
    ).length;

    return [
      { label: "Patients loaded", value: String(patients.length) },
      { label: "Diseases tracked", value: String(supportedDiseases.length) },
      { label: "Due today", value: String(dueToday) },
      { label: "Overdue", value: String(overdue) },
      { label: "Complete/protected", value: `${diseaseCards.filter((card) => card.isComplete || card.status === "protected").length}/3` },
      { label: "Dose records", value: String(doses.length) },
    ];
  }, [diseaseCards, doses.length, patients.length, schedule]);

  const latestDose = useMemo(
    () =>
      [...doses].sort(
        (left, right) =>
          new Date(right.administered_at).getTime() -
          new Date(left.administered_at).getTime(),
      )[0] ?? null,
    [doses],
  );

  const selectedHistoryDose = useMemo(
    () => doses.find((dose) => dose.id === selectedHistoryId) ?? doses[0] ?? null,
    [doses, selectedHistoryId],
  );

  const historyByDisease = useMemo(
    () =>
      supportedDiseases.map((disease) => {
        const compactRecords = historySummary
          .filter((record) => record.disease === disease.key)
          .sort(
            (left, right) =>
              new Date(right.administered_at).getTime() -
              new Date(left.administered_at).getTime(),
          );
        const detailRecords = doses.filter(
          (dose) => dose.disease === disease.key || getDiseaseKey(dose.vaccine) === disease.key,
        );
        return {
          ...disease,
          compactRecords,
          detailRecords,
          latestRecord: compactRecords[0] ?? null,
        };
      }),
    [doses, historySummary],
  );

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
      disease: getDiseaseKey(slot?.vaccine ?? null) ?? current.disease,
      schedule_slot_id: slot?.id ?? "",
      vaccine_id: slot?.vaccine.id ?? current.vaccine_id,
    }));
  }

  function selectDisease(diseaseKey: SupportedDiseaseKey) {
    const slot =
      diseaseCards.find((card) => card.key === diseaseKey)?.nextActionSlot ?? null;
    const vaccine =
      vaccines.find((candidate) => getDiseaseKey(candidate) === diseaseKey) ?? null;

    if (slot) {
      selectSlot(slot);
      return;
    }

    setSelectedSlotId("");
    setSlotForm(emptySlotForm);
    setDoseForm((current) => ({
      ...current,
      disease: diseaseKey,
      schedule_slot_id: "",
      vaccine_id: vaccine?.id ?? "",
      vaccine_batch_id: "",
    }));
  }

  async function reloadPatientWork(patientId = selectedPatientId) {
    if (!patientId || !token) {
      return;
    }

    setIsPatientLoading(true);
    try {
      const [scheduleRows, diseaseScheduleRows, historySummaryRows, historyDetailRows] = await Promise.all([
        listPatientSchedule(token, patientId),
        listPatientDiseaseSchedules(token, patientId),
        listPatientVaccinationHistory(token, patientId, false),
        listPatientVaccinationHistory(token, patientId, true),
      ]);
      setSchedule(scheduleRows);
      setDiseaseSchedules(diseaseScheduleRows);
      setHistorySummary(historySummaryRows as ImmunizationHistorySummary[]);
      const detailRows = historyDetailRows as ImmunizationEvent[];
      setDoses(detailRows);
      setSelectedHistoryId((current) =>
        current && detailRows.some((dose) => dose.id === current)
          ? current
          : detailRows[0]?.id ?? "",
      );
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
        response.schedule.find(
          (slot) =>
            getDiseaseKey(slot.vaccine) && actionableSlotStatuses.has(slot.status),
        ) ??
          response.schedule.find((slot) => getDiseaseKey(slot.vaccine)) ??
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
    if (!selectedDisease) {
      setDoseError("Select one of the three supported diseases before recording the outcome.");
      return;
    }
    if (!doseForm.vaccine_id) {
      setDoseError("Select a product/dose before recording the outcome.");
      return;
    }
    if (!doseForm.disease_completed && !doseForm.next_due_date) {
      setDoseError("Enter the next due date, or mark this vaccination as completed.");
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
      const dose = await createPatientOutcome(
        token,
        selectedPatientId,
        normalizeDosePayload({ ...doseForm, disease: selectedDisease }),
      );
      setDoses((current) => [dose, ...current]);
      setSelectedHistoryId(dose.id);
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
            <Link href="/patients" className="text-[var(--nv-muted)] hover:text-[var(--nv-heading)]">
              Patients
            </Link>
          </li>
          {selectedPatient ? (
            <>
              <li className="text-[var(--nv-subtle)]">/</li>
              <li>
                <Link
                  href={`/patients/${selectedPatient.id}`}
                  className="text-[var(--nv-muted)] hover:text-[var(--nv-heading)]"
                >
                  Patient Detail
                </Link>
              </li>
            </>
          ) : null}
          <li className="text-[var(--nv-subtle)]">/</li>
          <li className="text-[var(--nv-heading)]">Immunization</li>
        </ol>
      </nav>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
            Immunization workflow
          </p>
          <PrivacyBoundaryBadge />
        </div>
        <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Manage Measles, Polio, and Cholera vaccinations
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Focused vaccination work for the three supported diseases: Measles,
              Polio, and Cholera.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrivacyModeToggle />
            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${isOnline ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"}`}>
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-success-500" : "bg-warning-500 animate-pulse"}`} />
              {isOnline ? "Online and ready to save" : "Offline - save for later sync"}
            </div>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={!selectedPatientId || isPatientLoading}
              type="button"
              onClick={() => reloadPatientWork()}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <WorkflowStep index="1" label="Select patient" active />
          <WorkflowStep index="2" label="Check due dates" active={Boolean(selectedPatientId)} />
          <WorkflowStep index="3" label="Add vaccination" active={Boolean(selectedSlotId || doseForm.vaccine_id)} />
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
        title="Confirm official record"
        message={
          <div className="space-y-2">
            <p className="mb-4">Review these details before saving to the patient&apos;s vaccination record.</p>
            <div className="grid grid-cols-[110px_1fr] gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="font-semibold text-gray-500 dark:text-gray-400">Patient:</span>
              <span>{selectedPatient?.full_name} / {selectedPatient?.uid}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">Disease:</span>
              <span>{selectedDisease ? diseaseLabel(selectedDisease) : "Not selected"}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">Product:</span>
              <span>{vaccines.find((v) => v.id === doseForm.vaccine_id)?.vaccine_name ?? "Not selected"}</span>
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
              <span className="font-semibold text-gray-500 dark:text-gray-400">Next:</span>
              <span>{doseForm.disease_completed ? "Vaccination completed" : doseForm.next_due_date || "Not set"}</span>
            </div>
          </div>
        }
        confirmLabel="Save vaccination record"
        cancelLabel="Go back"
        isLoading={isRecordingDose}
        onConfirm={() => { setShowDoseConfirm(false); confirmAndRecordDose(); }}
        onCancel={() => setShowDoseConfirm(false)}
      />

      <section className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              1. Select patient
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Search by patient, caregiver, or UID.
            </p>
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

          <div className="max-h-[320px] overflow-y-auto p-4">
            {isLoading ? (
              <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                Loading patients...
              </p>
            ) : patients.length ? (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {patients.map((patient) => (
                  <button
                    className={`min-h-[120px] w-full rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
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
                      <StatusPill label={formatRole(patient.status)} status={patient.status} />
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

        <SelectedPatientHeader
          patient={selectedPatient}
          isLoading={isPatientLoading}
          onRegenerate={handleRegenerateSchedule}
          isRegenerating={isRegenerating}
          isPrivacyMode={isPrivacyMode}
          latestDose={latestDose}
          diseaseCards={diseaseCards}
          dueCount={schedule.filter((slot) => slot.status === "due_today").length}
          overdueCount={schedule.filter((slot) =>
            ["overdue", "defaulter"].includes(slot.status),
          ).length}
        />

        {patientError ? <InlineError message={patientError} /> : null}

        <section
          id="immunization-schedule-review"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
        >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                2. Disease due dates
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review each disease schedule and choose one to prefill the vaccination form.
              </p>

              {slotError ? <InlineError className="mt-4" message={slotError} /> : null}

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {diseaseCards.map((card) => (
                  <DiseaseCard
                    key={card.key}
                    disease={card}
                    isSelected={selectedDisease === card.key}
                    onSelect={() => selectDisease(card.key)}
                  />
                ))}
              </div>

              {selectedSlot ? (
                <form
                  className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-800"
                  onSubmit={handleUpdateSlot}
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Update disease schedule status
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
                    {isUpdatingSlot ? "Updating status" : "Update status"}
                  </button>
                </form>
              ) : null}
            </section>

            <section
              id="record-dose"
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                3. Add vaccination record
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Save the administered vaccine or document refusal, contraindication, or wastage.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ActionPill href="#immunization-schedule-review" label="Due dates" />
                <ActionPill href="#dose-history" label="Vaccination history" />
                <ActionPill href="#record-dose" label="Add record" />
              </div>

              <form className="mt-5 grid gap-4" onSubmit={handleRecordDose}>
                <div className="grid gap-4 lg:grid-cols-3">
                  <SelectInput
                    label="Disease"
                    value={selectedDisease ?? ""}
                    onChange={(value) => {
                      if (isSupportedDiseaseKey(value)) {
                        selectDisease(value);
                      }
                    }}
                    options={[
                      { label: "Select disease", value: "" },
                      ...supportedDiseases.map((disease) => ({
                        label: disease.label,
                        value: disease.key,
                      })),
                    ]}
                  />
                  <SelectInput
                    label="Product / dose"
                    value={doseForm.vaccine_id}
                    onChange={(value) => {
                      const matchingSlot = schedule.find((slot) => slot.vaccine.id === value);
                      const diseaseKey = getDiseaseKey(vaccines.find((vaccine) => vaccine.id === value) ?? matchingSlot?.vaccine ?? null);
                      if (matchingSlot) {
                        selectSlot(matchingSlot);
                      }
                      setDoseForm((current) => ({
                        ...current,
                        disease: diseaseKey ?? current.disease,
                        vaccine_id: value,
                        vaccine_batch_id: "",
                        schedule_slot_id: matchingSlot?.id ?? current.schedule_slot_id,
                      }));
                    }}
                    options={[
                      { label: "Select product/dose", value: "" },
                      ...vaccines.filter((vaccine) => {
                        const key = getDiseaseKey(vaccine);
                        return selectedDisease ? key === selectedDisease : Boolean(key);
                      }).map((vaccine) => ({
                        label: `${vaccine.vaccine_name} (${vaccine.vaccine_code})`,
                        value: vaccine.id,
                      })),
                    ]}
                  />
                  <TextInput
                    label="Date and time"
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
                    label="Outcome"
                    value={doseForm.event_status ?? "administered"}
                    onChange={(value) =>
                      setDoseForm((current) => ({
                        ...current,
                        event_status: value as ImmunizationEventStatus,
                      }))
                    }
                    options={doseStatuses}
                  />
                </div>
                {selectedDisease &&
                !vaccines.some((vaccine) => getDiseaseKey(vaccine) === selectedDisease) ? (
                  <AlertBanner tone="warning">
                    No product is configured for {diseaseLabel(selectedDisease)}. Run{" "}
                    <code>python manage.py seed_supported_vaccines</code> or add the
                    product in the vaccine registry.
                  </AlertBanner>
                ) : null}
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
                    label="Next due date"
                    type="date"
                    value={doseForm.next_due_date ?? ""}
                    onChange={(value) =>
                      setDoseForm((current) => ({
                        ...current,
                        next_due_date: value,
                      }))
                    }
                    disabled={Boolean(doseForm.disease_completed)}
                  />
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
                    <input
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      checked={Boolean(doseForm.disease_completed)}
                      type="checkbox"
                      onChange={(event) =>
                        setDoseForm((current) => ({
                          ...current,
                          disease_completed: event.target.checked,
                          next_due_date: event.target.checked ? "" : current.next_due_date,
                        }))
                      }
                    />
                    Vaccination completed
                  </label>
                  <TextAreaInput
                    label="Clinical note"
                    value={doseForm.notes ?? ""}
                    onChange={(value) =>
                      setDoseForm((current) => ({ ...current, notes: value }))
                    }
                  />
                </div>

                <details className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200">
                    More details
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <SelectInput
                      label="Batch"
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
                      label="Recording mode"
                      value={doseForm.source_channel ?? "online"}
                      onChange={(value) =>
                        setDoseForm((current) => ({
                          ...current,
                          source_channel: value as SourceChannel,
                        }))
                      }
                      options={sourceChannels}
                    />
                    <TextInput
                      label="Offline reference ID"
                      value={doseForm.local_client_record_id ?? ""}
                      onChange={(value) =>
                        setDoseForm((current) => ({
                          ...current,
                          local_client_record_id: value,
                        }))
                      }
                    />
                  </div>
                </details>

                {doseError ? <InlineError message={doseError} /> : null}

                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
                  disabled={!selectedPatientId || isRecordingDose || isBatchExpired}
                  type="submit"
                >
                  {isRecordingDose ? "Saving record" : "Save vaccination record"}
                </button>
              </form>
            </section>

          <section
            id="dose-history"
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Vaccination history
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  History is grouped by disease. Select any administration to review the full record.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="grid gap-3 lg:grid-cols-3">
                {historyByDisease.map((group) => (
                  <DiseaseHistorySummary
                    key={group.key}
                    group={group}
                    selectedHistoryId={selectedHistoryId}
                    onSelect={setSelectedHistoryId}
                  />
                ))}
              </div>
              <AdministrationDetailPanel dose={selectedHistoryDose} />
            </div>
          </section>
      </section>
    </div>
  );
}

function SelectedPatientHeader({
  diseaseCards,
  dueCount,
  isLoading,
  isRegenerating,
  isPrivacyMode,
  latestDose,
  onRegenerate,
  overdueCount,
  patient,
}: {
  diseaseCards: DiseaseCardData[];
  dueCount: number;
  isLoading: boolean;
  isRegenerating: boolean;
  isPrivacyMode: boolean;
  latestDose: ImmunizationEvent | null;
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
              Selected patient
            </p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
              {isPrivacyMode ? "Name hidden" : patient.full_name}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {patient.uid} · {formatAge(patient.date_of_birth)} · {formatRole(patient.status)}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <PatientContextTile
                label="Complete/protected"
                value={`${diseaseCards.filter((card) => card.isComplete || card.status === "protected").length}/3 diseases`}
                tone="success"
              />
              <PatientContextTile label="Needs action" value={String(dueCount + overdueCount)} tone={dueCount || overdueCount ? "warning" : "neutral"} />
              <PatientContextTile
                label="Last dose"
                value={latestDose ? latestDose.vaccine.vaccine_name : "None"}
                tone={latestDose ? "success" : "neutral"}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {diseaseCards.map((card) => (
                <StatusPill
                  key={card.key}
                  label={`${card.label}: ${diseaseStatusLabel(card.status)}`}
                  status={diseaseStatusToStatus(card.status)}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/patients/${patient.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Patient detail
            </Link>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isLoading || isRegenerating}
              type="button"
              onClick={onRegenerate}
            >
              {isRegenerating ? "Recalculating" : "Recalculate"}
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

function WorkflowStep({
  active,
  index,
  label,
}: {
  active: boolean;
  index: string;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        active
          ? "border-brand-200 bg-brand-25 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100"
          : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400"
      }`}
    >
      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          active
            ? "bg-brand-600 text-white"
            : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        }`}
      >
        {index}
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

type ContextTone = "neutral" | "success" | "warning" | "error";

function PatientContextTile({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: ContextTone;
  value: string;
}) {
  const toneClass: Record<ContextTone, string> = {
    neutral: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300",
    success: "border-success-200 bg-success-50 text-success-800 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-200",
    warning: "border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200",
    error: "border-error-200 bg-error-50 text-error-800 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass[tone]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function DiseaseCard({
  disease,
  isSelected,
  onSelect,
}: {
  disease: DiseaseCardData;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`min-h-[178px] rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
        isSelected
          ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
      }`}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {disease.label}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {disease.administeredCount
              ? `${disease.administeredCount} administered record${disease.administeredCount > 1 ? "s" : ""}`
              : "No administered record"}
          </p>
        </div>
        <StatusPill
          label={diseaseStatusLabel(disease.status)}
          status={diseaseStatusToStatus(disease.status)}
        />
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <p>
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            Next:
          </span>{" "}
          {disease.isComplete
            ? "Vaccination completed"
            : disease.currentDueDate
              ? `Due ${disease.currentDueDate}`
              : disease.nextActionSlot
                ? `${disease.nextActionSlot.vaccine.vaccine_name} due ${disease.nextActionSlot.due_date}`
                : "No due date set"}
        </p>
        <p>
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            Last:
          </span>{" "}
          {disease.lastDose
            ? `${disease.lastDose.vaccine.vaccine_name} on ${formatDateTime(disease.lastDose.administered_at)}`
            : "None"}
        </p>
      </div>

      <span className="mt-4 inline-flex rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
        Add vaccination
      </span>
    </button>
  );
}

type DiseaseHistoryGroup = {
  key: SupportedDiseaseKey;
  label: string;
  compactRecords: ImmunizationHistorySummary[];
  detailRecords: ImmunizationEvent[];
  latestRecord: ImmunizationHistorySummary | null;
};

function DiseaseHistorySummary({
  group,
  onSelect,
  selectedHistoryId,
}: {
  group: DiseaseHistoryGroup;
  onSelect: (id: string) => void;
  selectedHistoryId: string;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {group.label}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {group.compactRecords.length
              ? `${group.compactRecords.length} administration${group.compactRecords.length > 1 ? "s" : ""}`
              : "No administration yet"}
          </p>
        </div>
        {group.latestRecord ? (
          <StatusPill
            label={formatRole(group.latestRecord.event_status)}
            status={group.latestRecord.event_status}
          />
        ) : null}
      </div>

      {group.latestRecord ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-300">
          <p className="font-semibold text-gray-800 dark:text-gray-100">
            Latest: {group.latestRecord.vaccine_name}
          </p>
          <p className="mt-1">{formatDateTime(group.latestRecord.administered_at)}</p>
          <p className="mt-1">
            {group.latestRecord.disease_completed
              ? "Vaccination completed"
              : group.latestRecord.next_due_date
                ? `Next due ${group.latestRecord.next_due_date}`
                : "Next due date not set"}
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {group.compactRecords.length ? (
          group.compactRecords.map((record) => (
            <button
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                selectedHistoryId === record.id
                  ? "border-brand-300 bg-brand-25 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-100"
                  : "border-gray-200 bg-white text-gray-600 hover:border-brand-200 hover:bg-brand-25 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-brand-500/10"
              }`}
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
            >
              <span className="block font-semibold">{record.vaccine_name}</span>
              <span className="mt-1 block">
                {formatDateTime(record.administered_at)}
                {record.batch_number ? ` · ${record.batch_number}` : ""}
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            No records for this disease.
          </p>
        )}
      </div>
    </article>
  );
}

function AdministrationDetailPanel({ dose }: { dose: ImmunizationEvent | null }) {
  if (!dose) {
    return (
      <aside className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Administration details
        </h3>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Select a summary record to view the administration details.
        </p>
      </aside>
    );
  }

  const disease = dose.disease ?? getDiseaseKey(dose.vaccine);

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
            Selected administration
          </p>
          <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
            {dose.vaccine.vaccine_name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {diseaseLabelOrOther(disease)} · {formatDateTime(dose.administered_at)}
          </p>
        </div>
        <StatusPill label={formatRole(dose.event_status)} status={dose.event_status} />
      </div>

      <div className="mt-5 grid gap-3">
        <DetailRow label="Product code" value={dose.vaccine.vaccine_code} />
        <DetailRow
          label="Batch"
          value={
            dose.vaccine_batch
              ? `${dose.vaccine_batch.batch_number} · expires ${dose.vaccine_batch.expiry_date}`
              : "No batch recorded"
          }
        />
        <DetailRow
          label="Next due"
          value={
            dose.disease_completed
              ? "Vaccination completed"
              : dose.next_due_date ?? "Not set"
          }
        />
        <DetailRow label="Route" value={dose.administration_route || "Not recorded"} />
        <DetailRow label="Site" value={dose.administration_site || "Not recorded"} />
        <DetailRow label="Facility" value={dose.facility || "Not recorded"} />
        <DetailRow label="Source" value={formatRole(dose.source_channel)} />
        <DetailRow label="Notes" value={dose.notes || "No notes"} />
      </div>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
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

function StatusPill({
  label,
  status,
}: {
  label: string;
  status?: ScheduleSlotStatus | ImmunizationEventStatus | PatientStatus;
}) {
  const toneClass = statusToneClass(status);

  return (
    <span className={`inline-flex shrink-0 rounded border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {label}
    </span>
  );
}

function statusToneClass(status?: ScheduleSlotStatus | ImmunizationEventStatus | PatientStatus) {
  if (status === "overdue" || status === "defaulter") {
    return "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200";
  }
  if (status === "due_today" || status === "due_soon" || status === "pending") {
    return "border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200";
  }
  if (status === "administered" || status === "registered") {
    return "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-200";
  }
  if (status === "exempt" || status === "cancelled" || status === "inactive" || status === "deceased") {
    return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300";
  }
  if (status === "refused" || status === "contraindicated" || status === "wasted") {
    return "border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200";
  }
  return "border-brand-100 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-100";
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

function getDiseaseKey(
  vaccine: (VaccineBriefLike & { antigen?: { name?: string | null; code?: string | null } | null }) | null,
): SupportedDiseaseKey | null {
  if (!vaccine) {
    return null;
  }

  const searchable = [
    vaccine.vaccine_name,
    vaccine.vaccine_code,
    vaccine.antigen?.name,
    vaccine.antigen?.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    supportedDiseases.find((disease) =>
      disease.keywords.some((keyword) => searchable.includes(keyword)),
    )?.key ?? null
  );
}

type VaccineBriefLike = {
  vaccine_code: string;
  vaccine_name: string;
};

function deriveDiseaseStatus(
  diseaseSchedule: PatientDiseaseSchedule | null,
  slots: PatientScheduleSlot[],
  doses: ImmunizationEvent[],
): DiseaseStatus {
  if (diseaseSchedule?.is_complete) {
    return "completed";
  }
  if (diseaseSchedule?.status) {
    return diseaseSchedule.status;
  }
  if (slots.some((slot) => slot.status === "overdue" || slot.status === "defaulter")) {
    return "overdue";
  }
  if (slots.some((slot) => slot.status === "due_today")) {
    return "due_today";
  }
  if (slots.some((slot) => slot.status === "due_soon" || slot.status === "pending")) {
    return "due_soon";
  }
  if (doses.some((dose) => dose.event_status === "administered")) {
    return "protected";
  }
  if (slots.some((slot) => slot.status === "scheduled")) {
    return "scheduled";
  }

  return "not_started";
}

function diseaseStatusLabel(status: DiseaseStatus) {
  const labels: Record<DiseaseStatus, string> = {
    protected: "Protected",
    completed: "Completed",
    refused: "Refused",
    contraindicated: "Contraindicated",
    due_today: "Due today",
    due_soon: "Due soon",
    overdue: "Overdue",
    scheduled: "Scheduled",
    not_started: "Not started",
  };

  return labels[status];
}

function diseaseStatusToStatus(status: DiseaseStatus): ScheduleSlotStatus {
  const statusMap: Record<DiseaseStatus, ScheduleSlotStatus> = {
    protected: "administered",
    completed: "administered",
    refused: "exempt",
    contraindicated: "exempt",
    due_today: "due_today",
    due_soon: "due_soon",
    overdue: "overdue",
    scheduled: "scheduled",
    not_started: "pending",
  };

  return statusMap[status];
}

function diseaseLabel(key: SupportedDiseaseKey) {
  return supportedDiseases.find((disease) => disease.key === key)?.label ?? key;
}

function diseaseLabelOrOther(key: SupportedDiseaseKey | null) {
  return key ? diseaseLabel(key) : "Other";
}

function isSupportedDiseaseKey(value: string): value is SupportedDiseaseKey {
  return supportedDiseases.some((disease) => disease.key === value);
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
  disabled?: boolean;
  onChange: (value: string) => void;
};

function TextInput({
  label,
  value,
  type = "text",
  required,
  disabled,
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
        disabled={disabled}
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
    disease: payload.disease ?? null,
    vaccine_id: payload.vaccine_id,
    vaccine_batch_id: payload.vaccine_batch_id || null,
    schedule_slot_id: payload.schedule_slot_id || null,
    facility_id: payload.facility_id || null,
    administered_at: new Date(payload.administered_at).toISOString(),
    administration_route: payload.administration_route?.trim() || null,
    administration_site: payload.administration_site?.trim() || null,
    event_status: payload.event_status ?? "administered",
    next_due_date: payload.disease_completed ? null : payload.next_due_date || null,
    disease_completed: Boolean(payload.disease_completed),
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
