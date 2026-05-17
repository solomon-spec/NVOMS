"use client";

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AdministrativeUnitBrief,
  Caregiver,
  CreateCaregiverPayload,
  CreateDosePayload,
  CreatePatientPayload,
  HealthFacility,
  ImmunizationEvent,
  ImmunizationEventStatus,
  PatchPatientPayload,
  Patient,
  PatientScheduleSlot,
  PatientSex,
  PatientStatus,
  PatientSummary,
  ScheduleSlotStatus,
  SourceChannel,
  UpdatePatientPayload,
  Vaccine,
  VaccineBatch,
} from "@/features/registry/types";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { ApiError } from "@/services/api";
import {
  createPatient,
  createPatientDose,
  createCaregiver,
  createEpiScheduleRule,
  createEpiScheduleVersion,
  createVaccine,
  createVaccineBatch,
  deletePatient,
  getPatient,
  getPatientScheduleSlot,
  getPatientSummary,
  listAdministrativeUnits,
  listCaregivers,
  listFacilities,
  listPatientDoses,
  listPatients,
  listPatientSchedule,
  listEpiScheduleVersions,
  listVaccineBatches,
  listVaccines,
  patchPatient,
  regeneratePatientSchedule,
  updatePatient,
  updatePatientScheduleSlot,
} from "@/services/patients";
import { formatRole } from "@/shared/format";

const patientStatuses: Array<{ label: string; value: PatientStatus | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Registered", value: "registered" },
  { label: "Draft", value: "draft" },
  { label: "Verifying", value: "verifying" },
  { label: "Inactive", value: "inactive" },
  { label: "Deceased", value: "deceased" },
];

const editablePatientStatuses: Array<{ label: string; value: PatientStatus }> = [
  { label: "Registered", value: "registered" },
  { label: "Draft", value: "draft" },
  { label: "Verifying", value: "verifying" },
  { label: "Inactive", value: "inactive" },
  { label: "Deceased", value: "deceased" },
];

const sexOptions: Array<{ label: string; value: PatientSex }> = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Other", value: "other" },
  { label: "Unknown", value: "unknown" },
];

const scheduleStatuses: Array<{ label: string; value: ScheduleSlotStatus }> = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Pending", value: "pending" },
  { label: "Due soon", value: "due_soon" },
  { label: "Due today", value: "due_today" },
  { label: "Overdue", value: "overdue" },
  { label: "Missed follow-up", value: "defaulter" },
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

const initialForm: CreatePatientPayload = {
  first_name: "",
  middle_name: "",
  last_name: "",
  sex: "female",
  date_of_birth: "",
  primary_caregiver_id: "",
  residence_unit_id: "",
  registered_facility_id: "",
  medical_exception_flag: false,
  status: "registered",
};

const emptyCaregiverForm: CreateCaregiverPayload = {
  full_name: "",
  phone_number: "",
  alternate_phone_number: "",
  relationship_to_patient: "mother",
  preferred_language: "am",
  residence_unit_id: "",
  address_line: "",
  status: "active",
};

const emptyVaccineSetupForm = {
  vaccine_code: "",
  vaccine_name: "",
  dose_label: "Dose 1",
  recommended_age_days: "0",
  default_route: "IM",
  default_site: "",
  batch_number: "",
  manufacturer_name: "",
  expiry_date: "",
};

const emptyEditForm: UpdatePatientPayload = {
  first_name: "",
  middle_name: "",
  last_name: "",
  sex: "female",
  date_of_birth: "",
  residence_unit_id: null,
  registered_facility_id: null,
  medical_exception_flag: false,
  status: "registered",
  qr_code_value: "",
};

const emptyPatchForm: PatchPatientPayload = {
  status: "registered",
  medical_exception_flag: false,
  qr_code_value: "",
};

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
  status: "scheduled" as ScheduleSlotStatus,
  status_reason: "",
};

export function PatientRegistry() {
  const session = useAuthSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [units, setUnits] = useState<AdministrativeUnitBrief[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [batches, setBatches] = useState<VaccineBatch[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PatientStatus | "all">("all");
  const [form, setForm] = useState<CreatePatientPayload>(initialForm);
  const [caregiverForm, setCaregiverForm] =
    useState<CreateCaregiverPayload>(emptyCaregiverForm);
  const [vaccineSetupForm, setVaccineSetupForm] = useState(emptyVaccineSetupForm);
  const [editForm, setEditForm] = useState<UpdatePatientPayload>(emptyEditForm);
  const [patchForm, setPatchForm] = useState<PatchPatientPayload>(emptyPatchForm);
  const [doseForm, setDoseForm] = useState<CreateDosePayload>({
    ...emptyDoseForm,
    administered_at: toDatetimeLocalValue(new Date()),
  });
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [doses, setDoses] = useState<ImmunizationEvent[]>([]);
  const [schedule, setSchedule] = useState<PatientScheduleSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<PatientScheduleSlot | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCaregiverSetupOpen, setIsCaregiverSetupOpen] = useState(false);
  const [isVaccineSetupOpen, setIsVaccineSetupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCaregiver, setIsCreatingCaregiver] = useState(false);
  const [isSettingUpVaccine, setIsSettingUpVaccine] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [isPatchingPatient, setIsPatchingPatient] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [isCreatingDose, setIsCreatingDose] = useState(false);
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);
  const [isRegeneratingSchedule, setIsRegeneratingSchedule] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [setupError, setSetupError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [doseError, setDoseError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [notice, setNotice] = useState("");

  const token = session?.tokens.accessToken ?? "";

  useEffect(() => {
    let isActive = true;

    async function loadRegistry() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      try {
        const [
          patientRows,
          caregiverRows,
          facilityRows,
          unitRows,
          vaccineRows,
          batchRows,
        ] = await Promise.all([
          listPatients(token, { search, status }),
          listCaregivers(token),
          listFacilities(token),
          listAdministrativeUnits(token),
          listVaccines(token),
          listVaccineBatches(token),
        ]);

        if (isActive) {
          setPatients(patientRows);
          setCaregivers(caregiverRows);
          setFacilities(facilityRows);
          setUnits(unitRows);
          setVaccines(vaccineRows);
          setBatches(batchRows);
          setError("");
          setSelectedPatientId((current) =>
            current && patientRows.some((patient) => patient.id === current)
              ? current
              : patientRows[0]?.id ?? "",
          );
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

    const timer = window.setTimeout(loadRegistry, 180);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [reloadKey, search, status, token]);

  const loadPatientWorkspace = useCallback(
    async (patientId: string, isActive = true) => {
      const [patient, patientSummary, patientDoses, patientSchedule] =
        await Promise.all([
          getPatient(token, patientId),
          getPatientSummary(token, patientId),
          listPatientDoses(token, patientId),
          listPatientSchedule(token, patientId),
        ]);

      if (!isActive) {
        return;
      }

      setSelectedPatient(patient);
      setSummary(patientSummary);
      setDoses(patientDoses);
      setSchedule(patientSchedule);
      setEditForm(patientToUpdatePayload(patient));
      setPatchForm({
        status: patient.status,
        medical_exception_flag: patient.medical_exception_flag,
        qr_code_value: patient.qr_code_value ?? "",
      });
      setSelectedSlot(null);
      setSlotForm(emptySlotForm);
    },
    [token],
  );

  useEffect(() => {
    let isActive = true;

    async function loadSelectedPatient() {
      if (!token || !selectedPatientId) {
        setSelectedPatient(null);
        setSummary(null);
        setDoses([]);
        setSchedule([]);
        setSelectedSlot(null);
        return;
      }

      setIsDetailLoading(true);
      setDetailError("");
      try {
        await loadPatientWorkspace(selectedPatientId, isActive);
      } catch (caughtError) {
        if (isActive) {
          setDetailError(readApiError(caughtError));
        }
      } finally {
        if (isActive) {
          setIsDetailLoading(false);
        }
      }
    }

    loadSelectedPatient();

    return () => {
      isActive = false;
    };
  }, [loadPatientWorkspace, selectedPatientId, token]);

  const metrics = useMemo(() => {
    const registered = patients.filter(
      (patient) => patient.status === "registered",
    ).length;
    const medicalExceptions = patients.filter(
      (patient) => patient.medical_exception_flag,
    ).length;

    return [
      { label: "Patients", value: patients.length },
      { label: "Registered", value: registered },
      { label: "Recorded doses", value: doses.length },
      { label: "Medical exceptions", value: medicalExceptions },
    ];
  }, [doses.length, patients]);

  const filteredBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          !doseForm.vaccine_id || batch.vaccine.id === doseForm.vaccine_id,
      ),
    [batches, doseForm.vaccine_id],
  );

  async function refreshSelectedWorkspace(patientId = selectedPatientId) {
    if (!patientId) {
      return;
    }

    setIsDetailLoading(true);
    try {
      await loadPatientWorkspace(patientId);
      setDetailError("");
    } catch (caughtError) {
      setDetailError(readApiError(caughtError));
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleCreateCaregiver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSetupError("");
    setNotice("");

    if (!caregiverForm.full_name.trim() || !caregiverForm.phone_number.trim()) {
      setSetupError("Caregiver name and phone number are required.");
      return;
    }

    setIsCreatingCaregiver(true);
    try {
      const caregiver = await createCaregiver(
        token,
        normalizeCaregiverPayload(caregiverForm),
      );
      setCaregivers((current) => [caregiver, ...current]);
      setForm((current) => ({ ...current, primary_caregiver_id: caregiver.id }));
      setCaregiverForm(emptyCaregiverForm);
      setNotice("Caregiver created and selected for registration.");
    } catch (caughtError) {
      setSetupError(readApiError(caughtError));
    } finally {
      setIsCreatingCaregiver(false);
    }
  }

  async function handleSetupVaccineSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSetupError("");
    setNotice("");

    if (
      !vaccineSetupForm.vaccine_code.trim() ||
      !vaccineSetupForm.vaccine_name.trim()
    ) {
      setSetupError("Vaccine code and name are required.");
      return;
    }

    const recommendedAgeDays = Number(vaccineSetupForm.recommended_age_days);
    if (!Number.isFinite(recommendedAgeDays) || recommendedAgeDays < 0) {
      setSetupError("Recommended age must be zero or a positive number of days.");
      return;
    }

    setIsSettingUpVaccine(true);
    try {
      const vaccine = await createVaccine(token, {
        vaccine_code: vaccineSetupForm.vaccine_code.trim(),
        vaccine_name: vaccineSetupForm.vaccine_name.trim(),
        dose_sequence: 1,
        default_route: vaccineSetupForm.default_route.trim() || null,
        default_site: vaccineSetupForm.default_site.trim() || null,
        is_active: true,
      });

      let createdBatch: VaccineBatch | null = null;
      if (vaccineSetupForm.batch_number.trim()) {
        createdBatch = await createVaccineBatch(token, {
          vaccine_id: vaccine.id,
          batch_number: vaccineSetupForm.batch_number.trim(),
          manufacturer_name: vaccineSetupForm.manufacturer_name.trim() || null,
          expiry_date: vaccineSetupForm.expiry_date || null,
          source_system: "frontend",
          is_valid: true,
        });
      }

      const activeVersions = await listEpiScheduleVersions(token, "active");
      const activeVersion =
        activeVersions[0] ??
        (await createEpiScheduleVersion(token, {
          version_name: `Default EPI ${new Date().getFullYear()}`,
          effective_from: todayDateString(),
          status: "active",
          notes: "Created from the patient registry setup panel.",
        }));

      await createEpiScheduleRule(token, activeVersion.id, {
        vaccine_id: vaccine.id,
        dose_label: vaccineSetupForm.dose_label.trim() || "Dose 1",
        recommended_age_days: recommendedAgeDays,
        grace_period_days: 0,
        defaulter_threshold_days: 7,
        medical_exception_rule: null,
        is_birth_dose: recommendedAgeDays === 0,
        is_active: true,
      });

      setVaccines((current) => [vaccine, ...current]);
      if (createdBatch) {
        setBatches((current) => [createdBatch, ...current]);
      }
      setDoseForm((current) => ({
        ...current,
        vaccine_id: current.vaccine_id || vaccine.id,
        vaccine_batch_id: current.vaccine_batch_id || createdBatch?.id || "",
      }));
      setVaccineSetupForm(emptyVaccineSetupForm);
      setNotice("Vaccine, optional batch, and active schedule rule are ready.");
    } catch (caughtError) {
      setSetupError(readApiError(caughtError));
    } finally {
      setIsSettingUpVaccine(false);
    }
  }

  async function handleCreatePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    if (!token) {
      setFormError("Your session is not available. Sign in again.");
      return;
    }

    if (!form.primary_caregiver_id) {
      setFormError("Select a caregiver before registering the patient.");
      return;
    }

    setIsSubmitting(true);

    try {
      const patient = await createPatient(token, normalizeCreatePayload(form));
      setPatients((current) => [patient, ...current]);
      setSelectedPatientId(patient.id);
      setForm(initialForm);
      setIsFormOpen(false);
      setNotice("Patient registered.");
    } catch (caughtError) {
      setFormError(readApiError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdatePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient) {
      return;
    }

    setIsSavingPatient(true);
    setDetailError("");
    setNotice("");
    try {
      const patient = await updatePatient(
        token,
        selectedPatient.id,
        normalizeUpdatePayload(editForm),
      );
      applyPatientUpdate(patient);
      setNotice("Full patient profile saved.");
    } catch (caughtError) {
      setDetailError(readApiError(caughtError));
    } finally {
      setIsSavingPatient(false);
    }
  }

  async function handlePatchPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient) {
      return;
    }

    setIsPatchingPatient(true);
    setDetailError("");
    setNotice("");
    try {
      const patient = await patchPatient(
        token,
        selectedPatient.id,
        normalizePatchPayload(patchForm),
      );
      applyPatientUpdate(patient);
      setNotice("Quick patient update applied.");
    } catch (caughtError) {
      setDetailError(readApiError(caughtError));
    } finally {
      setIsPatchingPatient(false);
    }
  }

  async function handleDeletePatient() {
    if (!selectedPatient) {
      return;
    }

    const shouldDelete = window.confirm(
      `Deactivate ${selectedPatient.full_name}? This uses the patient DELETE endpoint and marks the record inactive.`,
    );
    if (!shouldDelete) {
      return;
    }

    setIsDeletingPatient(true);
    setDetailError("");
    setNotice("");
    try {
      await deletePatient(token, selectedPatient.id);
      setNotice("Patient deactivated.");
      setSelectedPatientId("");
      setReloadKey((current) => current + 1);
    } catch (caughtError) {
      setDetailError(readApiError(caughtError));
    } finally {
      setIsDeletingPatient(false);
    }
  }

  async function handleCreateDose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient) {
      return;
    }

    setDoseError("");
    setNotice("");

    if (!doseForm.vaccine_id) {
      setDoseError("Select a vaccine before recording a dose.");
      return;
    }

    setIsCreatingDose(true);
    try {
      const eventRecord = await createPatientDose(
        token,
        selectedPatient.id,
        normalizeDosePayload(doseForm),
      );
      setDoses((current) => [eventRecord, ...current]);
      setDoseForm({
        ...emptyDoseForm,
        administered_at: toDatetimeLocalValue(new Date()),
      });
      setNotice("Dose recorded.");
      await refreshScheduleOnly(selectedPatient.id);
    } catch (caughtError) {
      setDoseError(readApiError(caughtError));
    } finally {
      setIsCreatingDose(false);
    }
  }

  async function handleSelectSlot(slot: PatientScheduleSlot) {
    if (!selectedPatient) {
      return;
    }

    setScheduleError("");
    try {
      const detail = await getPatientScheduleSlot(
        token,
        selectedPatient.id,
        slot.id,
      );
      setSelectedSlot(detail);
      setSlotForm({
        status: detail.status,
        status_reason: detail.status_reason ?? "",
      });
      setDoseForm((current) => ({
        ...current,
        schedule_slot_id: detail.id,
        vaccine_id: detail.vaccine.id,
      }));
    } catch (caughtError) {
      setScheduleError(readApiError(caughtError));
    }
  }

  async function handleUpdateSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient || !selectedSlot) {
      return;
    }

    setIsUpdatingSlot(true);
    setScheduleError("");
    setNotice("");
    try {
      const updatedSlot = await updatePatientScheduleSlot(
        token,
        selectedPatient.id,
        selectedSlot.id,
        {
          status: slotForm.status,
          status_reason: slotForm.status_reason.trim() || null,
        },
      );
      setSelectedSlot(updatedSlot);
      setSchedule((current) =>
        current.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot)),
      );
      setNotice("Schedule slot updated.");
    } catch (caughtError) {
      setScheduleError(readApiError(caughtError));
    } finally {
      setIsUpdatingSlot(false);
    }
  }

  async function handleRegenerateSchedule() {
    if (!selectedPatient) {
      return;
    }

    setIsRegeneratingSchedule(true);
    setScheduleError("");
    setNotice("");
    try {
      const response = await regeneratePatientSchedule(token, selectedPatient.id);
      setSchedule(response.schedule);
      setSelectedSlot(null);
      setNotice(
        response.created
          ? `Schedule regenerated with ${response.created} new slot(s).`
          : "Schedule regenerated. No new slots were needed.",
      );
    } catch (caughtError) {
      setScheduleError(readApiError(caughtError));
    } finally {
      setIsRegeneratingSchedule(false);
    }
  }

  async function refreshScheduleOnly(patientId: string) {
    try {
      const nextSchedule = await listPatientSchedule(token, patientId);
      setSchedule(nextSchedule);
    } catch {
      // Dose recording should not be hidden if schedule refresh fails.
    }
  }

  function applyPatientUpdate(patient: Patient) {
    setSelectedPatient(patient);
    setEditForm(patientToUpdatePayload(patient));
    setPatchForm({
      status: patient.status,
      medical_exception_flag: patient.medical_exception_flag,
      qr_code_value: patient.qr_code_value ?? "",
    });
    setPatients((current) =>
      current.map((row) => (row.id === patient.id ? patient : row)),
    );
    if (summary) {
      setSummary({ ...summary, patient });
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
            Patient Registry
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Register, update, and monitor patient records
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Manage patient profiles, vaccination schedules, dose events, and
            immunization summaries from the API-backed registry workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            type="button"
            onClick={() => setIsCaregiverSetupOpen(!isCaregiverSetupOpen)}
          >
            {isCaregiverSetupOpen ? "Close caregiver setup" : "Caregiver setup"}
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            type="button"
            onClick={() => setIsVaccineSetupOpen(!isVaccineSetupOpen)}
          >
            {isVaccineSetupOpen ? "Close vaccine setup" : "Vaccine setup"}
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700"
            type="button"
            onClick={() => setIsFormOpen((current) => !current)}
          >
            {isFormOpen ? "Close registration" : "Register patient"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
            key={metric.label}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {isCaregiverSetupOpen && (
          <form
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
            onSubmit={handleCreateCaregiver}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Caregiver setup
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Patient registration requires a caregiver record.
                </p>
              </div>
              <StatusPill label={`${caregivers.length} active`} />
            </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Caregiver name"
              value={caregiverForm.full_name}
              onChange={(value) =>
                setCaregiverForm((current) => ({
                  ...current,
                  full_name: value,
                }))
              }
              required
            />
            <TextInput
              label="Phone number"
              value={caregiverForm.phone_number}
              onChange={(value) =>
                setCaregiverForm((current) => ({
                  ...current,
                  phone_number: value,
                }))
              }
              required
            />
            <TextInput
              label="Relationship"
              value={caregiverForm.relationship_to_patient}
              onChange={(value) =>
                setCaregiverForm((current) => ({
                  ...current,
                  relationship_to_patient: value,
                }))
              }
            />
            <SelectInput
              label="Residence unit"
              value={caregiverForm.residence_unit_id ?? ""}
              onChange={(value) =>
                setCaregiverForm((current) => ({
                  ...current,
                  residence_unit_id: value,
                }))
              }
              options={unitOptions(units)}
            />
          </div>
          <button
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
            disabled={isCreatingCaregiver}
            type="submit"
          >
            {isCreatingCaregiver ? "Creating caregiver" : "Create caregiver"}
          </button>
        </form>
        )}

        {isVaccineSetupOpen && (
        <form
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          onSubmit={handleSetupVaccineSchedule}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Vaccine schedule setup
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Doses and schedule regeneration require vaccine catalog data.
              </p>
            </div>
            <StatusPill label={`${vaccines.length} vaccines`} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Vaccine code"
              value={vaccineSetupForm.vaccine_code}
              onChange={(value) =>
                setVaccineSetupForm((current) => ({
                  ...current,
                  vaccine_code: value,
                }))
              }
              required
            />
            <TextInput
              label="Vaccine name"
              value={vaccineSetupForm.vaccine_name}
              onChange={(value) =>
                setVaccineSetupForm((current) => ({
                  ...current,
                  vaccine_name: value,
                }))
              }
              required
            />
            <TextInput
              label="Dose label"
              value={vaccineSetupForm.dose_label}
              onChange={(value) =>
                setVaccineSetupForm((current) => ({
                  ...current,
                  dose_label: value,
                }))
              }
            />
            <TextInput
              label="Recommended age days"
              type="number"
              value={vaccineSetupForm.recommended_age_days}
              onChange={(value) =>
                setVaccineSetupForm((current) => ({
                  ...current,
                  recommended_age_days: value,
                }))
              }
            />
            <TextInput
              label="Default route"
              value={vaccineSetupForm.default_route}
              onChange={(value) =>
                setVaccineSetupForm((current) => ({
                  ...current,
                  default_route: value,
                }))
              }
            />
            <TextInput
              label="Batch number"
              value={vaccineSetupForm.batch_number}
              onChange={(value) =>
                setVaccineSetupForm((current) => ({
                  ...current,
                  batch_number: value,
                }))
              }
            />
            <TextInput
              label="Manufacturer"
              value={vaccineSetupForm.manufacturer_name}
              onChange={(value) =>
                setVaccineSetupForm((current) => ({
                  ...current,
                  manufacturer_name: value,
                }))
              }
            />
            <TextInput
              label="Batch expiry"
              type="date"
              value={vaccineSetupForm.expiry_date}
              onChange={(value) =>
                setVaccineSetupForm((current) => ({
                  ...current,
                  expiry_date: value,
                }))
              }
            />
          </div>
          <button
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
            disabled={isSettingUpVaccine}
            type="submit"
          >
            {isSettingUpVaccine ? "Setting up vaccine" : "Create vaccine setup"}
          </button>
        </form>
        )}
      </section>

      {setupError ? <InlineError message={setupError} /> : null}

      {notice ? (
        <div className="rounded-lg border border-success-200 bg-success-25 px-4 py-3 text-sm font-semibold text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
          {notice}
        </div>
      ) : null}

      {isFormOpen ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            New patient
          </h2>
          <form
            className="mt-5 grid gap-4 lg:grid-cols-3"
            onSubmit={handleCreatePatient}
          >
            <TextInput
              label="First name"
              value={form.first_name}
              onChange={(value) => setFormField("first_name", value)}
              required
            />
            <TextInput
              label="Middle name"
              value={form.middle_name ?? ""}
              onChange={(value) => setFormField("middle_name", value)}
            />
            <TextInput
              label="Last name"
              value={form.last_name ?? ""}
              onChange={(value) => setFormField("last_name", value)}
            />
            <SelectInput
              label="Sex"
              value={form.sex}
              onChange={(value) => setFormField("sex", value as PatientSex)}
              options={sexOptions}
            />
            <TextInput
              label="Date of birth"
              type="date"
              value={form.date_of_birth}
              onChange={(value) => setFormField("date_of_birth", value)}
              required
            />
            <SelectInput
              label="Caregiver"
              value={form.primary_caregiver_id}
              onChange={(value) => setFormField("primary_caregiver_id", value)}
              options={[
                { label: "Select caregiver", value: "" },
                ...caregivers.map((caregiver) => ({
                  label: `${caregiver.full_name} (${caregiver.phone_number})`,
                  value: caregiver.id,
                })),
              ]}
            />
            <SelectInput
              label="Residence unit"
              value={form.residence_unit_id ?? ""}
              onChange={(value) => setFormField("residence_unit_id", value)}
              options={unitOptions(units)}
            />
            <SelectInput
              label="Registered facility"
              value={form.registered_facility_id ?? ""}
              onChange={(value) => setFormField("registered_facility_id", value)}
              options={facilityOptions(facilities)}
            />
            <SelectInput
              label="Status"
              value={form.status}
              onChange={(value) => setFormField("status", value as PatientStatus)}
              options={editablePatientStatuses}
            />
            <CheckboxInput
              checked={form.medical_exception_flag}
              label="Medical exception"
              onChange={(checked) =>
                setFormField("medical_exception_flag", checked)
              }
            />

            {formError ? (
              <InlineError className="lg:col-span-3" message={formError} />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-3">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Registering" : "Save patient"}
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                type="button"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </span>
              <input
                className="min-h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Search patient UID, name, caregiver phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
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

          {error ? <InlineError className="m-5" message={error} /> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">UID</th>
                  <th className="px-5 py-3">Birth date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td className="px-5 py-8 text-sm text-gray-500" colSpan={5}>
                      Loading patients...
                    </td>
                  </tr>
                ) : patients.length ? (
                  patients.map((patient) => (
                    <tr
                      className={`group transition cursor-pointer ${
                        selectedPatientId === patient.id
                          ? "bg-brand-50 border-l-4 border-brand-500 dark:bg-brand-500/10 dark:border-brand-400"
                          : "border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      }`}
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {patient.full_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {patient.primary_caregiver
                            ? patient.primary_caregiver.full_name
                            : "No caregiver"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {patient.uid}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {patient.date_of_birth}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill label={formatRole(patient.status)} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-gray-400 group-hover:text-brand-500">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-sm text-gray-500" colSpan={5}>
                      No patient records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PatientWorkspacePanel
          batches={filteredBatches}
          detailError={detailError}
          doseError={doseError}
          doseForm={doseForm}
          doses={doses}
          editForm={editForm}
          facilities={facilities}
          isCreatingDose={isCreatingDose}
          isDeletingPatient={isDeletingPatient}
          isDetailLoading={isDetailLoading}
          isPatchingPatient={isPatchingPatient}
          isRegeneratingSchedule={isRegeneratingSchedule}
          isSavingPatient={isSavingPatient}
          isUpdatingSlot={isUpdatingSlot}
          onCreateDose={handleCreateDose}
          onDeletePatient={handleDeletePatient}
          onPatchPatient={handlePatchPatient}
          onRegenerateSchedule={handleRegenerateSchedule}
          onRefresh={() => refreshSelectedWorkspace()}
          onSelectSlot={handleSelectSlot}
          onUpdatePatient={handleUpdatePatient}
          onUpdateSlot={handleUpdateSlot}
          patchForm={patchForm}
          patient={selectedPatient}
          schedule={schedule}
          scheduleError={scheduleError}
          selectedSlot={selectedSlot}
          setDoseForm={setDoseForm}
          setEditForm={setEditForm}
          setPatchForm={setPatchForm}
          setSlotForm={setSlotForm}
          slotForm={slotForm}
          summary={summary}
          units={units}
          vaccines={vaccines}
        />
      </section>
    </div>
  );

  function setFormField<Key extends keyof CreatePatientPayload>(
    key: Key,
    value: CreatePatientPayload[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }
}

type PatientWorkspacePanelProps = {
  batches: VaccineBatch[];
  detailError: string;
  doseError: string;
  doseForm: CreateDosePayload;
  doses: ImmunizationEvent[];
  editForm: UpdatePatientPayload;
  facilities: HealthFacility[];
  isCreatingDose: boolean;
  isDeletingPatient: boolean;
  isDetailLoading: boolean;
  isPatchingPatient: boolean;
  isRegeneratingSchedule: boolean;
  isSavingPatient: boolean;
  isUpdatingSlot: boolean;
  onCreateDose: (event: FormEvent<HTMLFormElement>) => void;
  onDeletePatient: () => void;
  onPatchPatient: (event: FormEvent<HTMLFormElement>) => void;
  onRegenerateSchedule: () => void;
  onRefresh: () => void;
  onSelectSlot: (slot: PatientScheduleSlot) => void;
  onUpdatePatient: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateSlot: (event: FormEvent<HTMLFormElement>) => void;
  patchForm: PatchPatientPayload;
  patient: Patient | null;
  schedule: PatientScheduleSlot[];
  scheduleError: string;
  selectedSlot: PatientScheduleSlot | null;
  setDoseForm: Dispatch<SetStateAction<CreateDosePayload>>;
  setEditForm: Dispatch<SetStateAction<UpdatePatientPayload>>;
  setPatchForm: Dispatch<SetStateAction<PatchPatientPayload>>;
  setSlotForm: Dispatch<SetStateAction<typeof emptySlotForm>>;
  slotForm: typeof emptySlotForm;
  summary: PatientSummary | null;
  units: AdministrativeUnitBrief[];
  vaccines: Vaccine[];
};

function PatientWorkspacePanel({
  batches,
  detailError,
  doseError,
  doseForm,
  doses,
  editForm,
  facilities,
  isCreatingDose,
  isDeletingPatient,
  isDetailLoading,
  isPatchingPatient,
  isRegeneratingSchedule,
  isSavingPatient,
  isUpdatingSlot,
  onCreateDose,
  onDeletePatient,
  onPatchPatient,
  onRegenerateSchedule,
  onRefresh,
  onSelectSlot,
  onUpdatePatient,
  onUpdateSlot,
  patchForm,
  patient,
  schedule,
  scheduleError,
  selectedSlot,
  setDoseForm,
  setEditForm,
  setPatchForm,
  setSlotForm,
  slotForm,
  summary,
  units,
  vaccines,
}: PatientWorkspacePanelProps) {
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20 text-center dark:border-gray-800 dark:bg-white/[0.02]">
        <span className="text-4xl">🧑🏽‍⚕️</span>
        <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">No patient selected</h3>
        <p className="mt-2 max-w-[250px] text-xs text-gray-500 dark:text-gray-400">
          Select a patient from the registry to open their details, doses, schedule, and summary tools.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 border-b border-gray-200 pb-5 dark:border-gray-800 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
              Patient detail
            </p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
              {patient.full_name}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {patient.uid} · {formatRole(patient.sex)} · born{" "}
              {patient.date_of_birth}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isDetailLoading}
              type="button"
              onClick={onRefresh}
            >
              Refresh
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-error-200 bg-error-25 px-3 text-sm font-semibold text-error-700 shadow-theme-xs transition hover:bg-error-50 disabled:opacity-60 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
              disabled={isDeletingPatient}
              type="button"
              onClick={onDeletePatient}
            >
              {isDeletingPatient ? "Deactivating" : "Deactivate"}
            </button>
          </div>
        </div>

        {detailError ? (
          <InlineError className="mt-5" message={detailError} />
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <SummaryMetric
            label="Immunization status"
            value={
              summary?.immunization_summary
                ? formatRole(summary.immunization_summary.current_status)
                : "Unknown"
            }
          />
          <SummaryMetric
            label="Next due"
            value={summary?.immunization_summary?.next_due_date ?? "None"}
          />
          <SummaryMetric
            label="Doses administered"
            value={String(summary?.immunization_summary?.administered_count ?? 0)}
          />
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        <form
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          onSubmit={onUpdatePatient}
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Full profile update
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Saves through PUT /patients/{patient.id}.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextInput
              label="First name"
              value={editForm.first_name}
              onChange={(value) =>
                setEditForm((current) => ({ ...current, first_name: value }))
              }
              required
            />
            <TextInput
              label="Middle name"
              value={editForm.middle_name ?? ""}
              onChange={(value) =>
                setEditForm((current) => ({ ...current, middle_name: value }))
              }
            />
            <TextInput
              label="Last name"
              value={editForm.last_name ?? ""}
              onChange={(value) =>
                setEditForm((current) => ({ ...current, last_name: value }))
              }
            />
            <TextInput
              label="Date of birth"
              type="date"
              value={editForm.date_of_birth}
              onChange={(value) =>
                setEditForm((current) => ({ ...current, date_of_birth: value }))
              }
              required
            />
            <SelectInput
              label="Sex"
              value={editForm.sex}
              onChange={(value) =>
                setEditForm((current) => ({
                  ...current,
                  sex: value as PatientSex,
                }))
              }
              options={sexOptions}
            />
            <SelectInput
              label="Status"
              value={editForm.status}
              onChange={(value) =>
                setEditForm((current) => ({
                  ...current,
                  status: value as PatientStatus,
                }))
              }
              options={editablePatientStatuses}
            />
            <SelectInput
              label="Residence unit"
              value={editForm.residence_unit_id ?? ""}
              onChange={(value) =>
                setEditForm((current) => ({
                  ...current,
                  residence_unit_id: value || null,
                }))
              }
              options={unitOptions(units)}
            />
            <SelectInput
              label="Registered facility"
              value={editForm.registered_facility_id ?? ""}
              onChange={(value) =>
                setEditForm((current) => ({
                  ...current,
                  registered_facility_id: value || null,
                }))
              }
              options={facilityOptions(facilities)}
            />
            <TextInput
              label="QR code value"
              value={editForm.qr_code_value ?? ""}
              onChange={(value) =>
                setEditForm((current) => ({ ...current, qr_code_value: value }))
              }
            />
            <CheckboxInput
              checked={editForm.medical_exception_flag}
              label="Medical exception"
              onChange={(checked) =>
                setEditForm((current) => ({
                  ...current,
                  medical_exception_flag: checked,
                }))
              }
            />
          </div>
          <button
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
            disabled={isSavingPatient}
            type="submit"
          >
            {isSavingPatient ? "Saving profile" : "Save with PUT"}
          </button>
        </form>

        <form
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          onSubmit={onPatchPatient}
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Quick patch
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Applies focused changes through PATCH /patients/{patient.id}.
          </p>
          <div className="mt-5 grid gap-4">
            <SelectInput
              label="Status"
              value={patchForm.status ?? patient.status}
              onChange={(value) =>
                setPatchForm((current) => ({
                  ...current,
                  status: value as PatientStatus,
                }))
              }
              options={editablePatientStatuses}
            />
            <TextInput
              label="QR code value"
              value={patchForm.qr_code_value ?? ""}
              onChange={(value) =>
                setPatchForm((current) => ({ ...current, qr_code_value: value }))
              }
            />
            <CheckboxInput
              checked={Boolean(patchForm.medical_exception_flag)}
              label="Medical exception"
              onChange={(checked) =>
                setPatchForm((current) => ({
                  ...current,
                  medical_exception_flag: checked,
                }))
              }
            />
          </div>
          <button
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
            disabled={isPatchingPatient}
            type="submit"
          >
            {isPatchingPatient ? "Applying patch" : "Save with PATCH"}
          </button>
        </form>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Vaccination schedule
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                View, inspect, update, and regenerate slots.
              </p>
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              disabled={isRegeneratingSchedule}
              type="button"
              onClick={onRegenerateSchedule}
            >
              {isRegeneratingSchedule ? "Regenerating" : "Regenerate"}
            </button>
          </div>

          {scheduleError ? (
            <InlineError className="mt-4" message={scheduleError} />
          ) : null}

          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {schedule.length ? (
              schedule.map((slot) => (
                <button
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition hover:border-brand-200 hover:bg-brand-25 dark:hover:bg-brand-500/10 ${
                    selectedSlot?.id === slot.id
                      ? "border-brand-300 bg-brand-25 dark:border-brand-500/40 dark:bg-brand-500/10"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
                  }`}
                  key={slot.id}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
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
                No schedule slots yet. Regenerate to create slots from the
                active EPI schedule.
              </p>
            )}
          </div>

          {selectedSlot ? (
            <form className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-800" onSubmit={onUpdateSlot}>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Update selected slot
              </h4>
              <div className="mt-4 grid gap-4">
                <SelectInput
                  label="Slot status"
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
                  label="Status reason"
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

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Dose events
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and record immunization events.
          </p>

          <form className="mt-5 grid gap-4" onSubmit={onCreateDose}>
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
                ...batches.map((batch) => ({
                  label: `${batch.batch_number} · expires ${batch.expiry_date}`,
                  value: batch.id,
                })),
              ]}
            />
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
                  setDoseForm((current) => ({ ...current, facility_id: value }))
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
              disabled={isCreatingDose}
              type="submit"
            >
              {isCreatingDose ? "Recording dose" : "Record dose"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Dose history
            </h4>
            <div className="mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-1">
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
                  No doses recorded for this patient.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
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
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
        className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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

type CheckboxInputProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

function CheckboxInput({ checked, label, onChange }: CheckboxInputProps) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300">
      <input
        checked={checked}
        className="h-4 w-4 accent-brand-600"
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
      {label}
    </span>
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

function patientToUpdatePayload(patient: Patient): UpdatePatientPayload {
  return {
    first_name: patient.first_name,
    middle_name: patient.middle_name ?? "",
    last_name: patient.last_name ?? "",
    sex: patient.sex,
    date_of_birth: patient.date_of_birth,
    residence_unit_id: patient.residence_unit?.id ?? null,
    registered_facility_id:
      typeof patient.registered_facility === "string"
        ? patient.registered_facility
        : null,
    medical_exception_flag: patient.medical_exception_flag,
    status: patient.status,
    qr_code_value: patient.qr_code_value ?? "",
  };
}

function normalizeCreatePayload(payload: CreatePatientPayload): CreatePatientPayload {
  return {
    ...payload,
    middle_name: payload.middle_name?.trim() || undefined,
    last_name: payload.last_name?.trim() || undefined,
    residence_unit_id: payload.residence_unit_id || undefined,
    registered_facility_id: payload.registered_facility_id || undefined,
  };
}

function normalizeCaregiverPayload(
  payload: CreateCaregiverPayload,
): CreateCaregiverPayload {
  return {
    full_name: payload.full_name.trim(),
    phone_number: payload.phone_number.trim(),
    alternate_phone_number: payload.alternate_phone_number?.trim() || null,
    relationship_to_patient:
      payload.relationship_to_patient.trim() || "caregiver",
    preferred_language: payload.preferred_language.trim() || "am",
    residence_unit_id: payload.residence_unit_id || null,
    address_line: payload.address_line?.trim() || null,
    status: payload.status,
  };
}

function normalizeUpdatePayload(payload: UpdatePatientPayload): UpdatePatientPayload {
  return {
    ...payload,
    middle_name: payload.middle_name?.trim() || null,
    last_name: payload.last_name?.trim() || null,
    residence_unit_id: payload.residence_unit_id || null,
    registered_facility_id: payload.registered_facility_id || null,
    qr_code_value: payload.qr_code_value?.trim() || null,
  };
}

function normalizePatchPayload(payload: PatchPatientPayload): PatchPatientPayload {
  return {
    ...payload,
    qr_code_value: payload.qr_code_value?.trim() || null,
  };
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

function unitOptions(units: AdministrativeUnitBrief[]) {
  return [
    { label: "Not selected", value: "" },
    ...units.map((unit) => ({
      label: `${unit.name} (${formatRole(unit.level)})`,
      value: unit.id,
    })),
  ];
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

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
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
