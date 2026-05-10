"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import type {
  AdministrativeUnitBrief,
  CreateCaregiverPayload,
  CreatePatientPayload,
  HealthFacility,
  Patient,
  PatientSex,
} from "@/features/registry/types";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { ArrowRightIcon, CheckCircleIcon, ChevronLeftIcon } from "@/icons";
import { ApiError } from "@/services/api";
import {
  createCaregiver,
  createPatient,
  listAdministrativeUnits,
  listFacilities,
} from "@/services/patients";

type StepId = "patient" | "caregiver" | "duplicate" | "review" | "success";

type PatientFormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  sex: PatientSex | "";
  date_of_birth: string;
  medical_exception_flag: boolean;
};

type CaregiverFormState = {
  full_name: string;
  phone_number: string;
  relationship_to_patient: string;
  preferred_language: string;
  address_line: string;
  residence_unit_id: string;
  registered_facility_id: string;
};

const steps: Array<{ id: StepId; label: string }> = [
  { id: "patient", label: "Patient" },
  { id: "caregiver", label: "Caregiver" },
  { id: "duplicate", label: "Duplicate check" },
  { id: "review", label: "Review" },
  { id: "success", label: "Success" },
];

const initialPatientForm: PatientFormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  sex: "",
  date_of_birth: "",
  medical_exception_flag: false,
};

const initialCaregiverForm: CaregiverFormState = {
  full_name: "",
  phone_number: "",
  relationship_to_patient: "mother",
  preferred_language: "am",
  address_line: "",
  residence_unit_id: "",
  registered_facility_id: "",
};

export function PatientRegistrationWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const [step, setStep] = useState<StepId>("patient");
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [caregiverForm, setCaregiverForm] = useState(initialCaregiverForm);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [units, setUnits] = useState<AdministrativeUnitBrief[]>([]);
  const [isLoadingReference, setIsLoadingReference] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

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

        if (!isActive) {
          return;
        }

        setFacilities(facilityRows);
        setUnits(unitRows);
        setError("");
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

  const activeStepIndex = steps.findIndex((item) => item.id === step);

  const selectedFacility = useMemo(
    () =>
      facilities.find((facility) => facility.id === caregiverForm.registered_facility_id) ??
      null,
    [caregiverForm.registered_facility_id, facilities],
  );
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === caregiverForm.residence_unit_id) ?? null,
    [caregiverForm.residence_unit_id, units],
  );

  function goNext() {
    setValidationError("");

    if (step === "patient") {
      const message = validatePatientStep(patientForm);
      if (message) {
        setValidationError(message);
        return;
      }
      setStep("caregiver");
      return;
    }

    if (step === "caregiver") {
      const message = validateCaregiverStep(caregiverForm);
      if (message) {
        setValidationError(message);
        return;
      }
      setStep("duplicate");
      return;
    }

    if (step === "duplicate") {
      setStep("review");
    }
  }

  function goBack() {
    setValidationError("");
    if (step === "caregiver") {
      setStep("patient");
    } else if (step === "duplicate") {
      setStep("caregiver");
    } else if (step === "review") {
      setStep("duplicate");
    }
  }

  async function submitRegistration() {
    setValidationError("");
    setError("");

    const patientMessage = validatePatientStep(patientForm);
    const caregiverMessage = validateCaregiverStep(caregiverForm);
    if (patientMessage || caregiverMessage) {
      setValidationError(patientMessage || caregiverMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const caregiverPayload: CreateCaregiverPayload = {
        full_name: caregiverForm.full_name.trim(),
        phone_number: caregiverForm.phone_number.trim(),
        relationship_to_patient: caregiverForm.relationship_to_patient,
        preferred_language: caregiverForm.preferred_language,
        residence_unit_id: caregiverForm.residence_unit_id || null,
        address_line: caregiverForm.address_line.trim() || null,
        status: "active",
      };
      const caregiver = await createCaregiver(token, caregiverPayload);

      const patientPayload: CreatePatientPayload = {
        first_name: patientForm.first_name.trim(),
        middle_name: patientForm.middle_name.trim() || undefined,
        last_name: patientForm.last_name.trim() || undefined,
        sex: patientForm.sex as PatientSex,
        date_of_birth: patientForm.date_of_birth,
        primary_caregiver_id: caregiver.id,
        residence_unit_id: caregiverForm.residence_unit_id || undefined,
        registered_facility_id: caregiverForm.registered_facility_id || undefined,
        medical_exception_flag: patientForm.medical_exception_flag,
        status: "registered",
      };
      const patient = await createPatient(token, patientPayload);

      setCreatedPatient(patient);
      setStep("success");
    } catch (caughtError) {
      setError(readApiError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/patients"
            className="enterprise-muted mb-3 inline-flex items-center gap-2 text-sm font-semibold transition hover:text-white"
          >
            <ChevronLeftIcon className="h-4 w-4 fill-current" />
            Back to registry
          </Link>
          <h1 className="enterprise-title text-2xl">
            Register Patient
          </h1>
          <p className="enterprise-muted mt-1 max-w-2xl text-sm">
            Create a patient record with caregiver, facility, and location details.
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm font-medium text-error-300">
          {error}
        </div>
      ) : null}

      {validationError ? (
        <div className="rounded-lg border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-sm font-medium text-warning-300">
          {validationError}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="enterprise-card-strong rounded-xl p-5">
          <WizardStepper activeStepIndex={activeStepIndex} />

          <div className="mt-5 border-t border-white/10 pt-5">
            {step === "patient" ? (
              <PatientDetailsStep form={patientForm} setForm={setPatientForm} />
            ) : null}

            {step === "caregiver" ? (
              <CaregiverDetailsStep
                form={caregiverForm}
                facilities={facilities}
                isLoadingReference={isLoadingReference}
                setForm={setCaregiverForm}
                units={units}
              />
            ) : null}

            {step === "duplicate" ? (
              <DuplicateCheckStep patientForm={patientForm} caregiverForm={caregiverForm} />
            ) : null}

            {step === "review" ? (
              <ReviewStep
                caregiverForm={caregiverForm}
                patientForm={patientForm}
                selectedFacility={selectedFacility}
                selectedUnit={selectedUnit}
              />
            ) : null}

            {step === "success" ? <SuccessStep patient={createdPatient} /> : null}
          </div>

          {step !== "success" ? (
          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === "patient" || isSubmitting}
              className="enterprise-button-secondary inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-4 w-4 fill-current" />
              Back
            </button>

            {step === "review" ? (
              <Button
                disabled={isSubmitting}
                onClick={submitRegistration}
                endIcon={<CheckCircleIcon className="h-4 w-4 fill-current" />}
              >
                {isSubmitting ? "Registering..." : "Submit Registration"}
              </Button>
            ) : (
              <Button
                disabled={isSubmitting}
                onClick={goNext}
                endIcon={<ArrowRightIcon className="h-4 w-4 fill-current" />}
              >
                Continue
              </Button>
            )}
          </div>
          ) : null}
        </section>

        <aside className="space-y-5">
          <RegistrationProgress activeStepIndex={activeStepIndex} />
          <section className="enterprise-card rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white">Quick Search</h2>
            <div className="relative mt-4">
              <input
                className="enterprise-input h-10 px-4 text-sm"
                placeholder="Check for existing patient..."
                readOnly
              />
            </div>
            <p className="enterprise-muted mt-7 text-center text-sm">No matches found</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function WizardStepper({
  activeStepIndex,
}: {
  activeStepIndex: number;
}) {
  return (
    <ol className="grid gap-3 md:grid-cols-5">
      {steps.map((item, index) => {
        const isActive = activeStepIndex === index;
        const isComplete = activeStepIndex > index;

        return (
          <li key={item.id} className="relative flex flex-col items-center gap-2 text-center">
            <div
              className={`z-1 inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                isActive
                  ? "border-blue-light-400 bg-blue-light-500 text-white shadow-[0_0_22px_rgba(47,143,217,0.46)]"
                  : isComplete
                    ? "border-success-400/70 bg-success-500/20 text-success-300"
                    : "border-white/15 bg-[#0a1424] text-gray-400"
              }`}
            >
              {isComplete ? "✓" : index + 1}
            </div>
            {index < steps.length - 1 ? (
              <span className="absolute left-1/2 top-4 hidden h-px w-full bg-white/15 md:block" />
            ) : null}
            <span className={isActive ? "text-sm font-semibold text-white" : "text-sm text-gray-400"}>
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function RegistrationProgress({ activeStepIndex }: { activeStepIndex: number }) {
  const percent = Math.round(((activeStepIndex + 1) / steps.length) * 100);
  const remaining = steps.slice(activeStepIndex + 1);

  return (
    <section className="enterprise-card rounded-xl p-5">
      <h2 className="text-lg font-semibold text-white">Registration Progress</h2>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-light-500 to-blue-light-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="enterprise-muted mt-2 text-sm">{percent}% Complete</p>
      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-sm font-semibold text-white">Required Fields Remaining</p>
        <ul className="enterprise-muted mt-3 space-y-3 text-sm">
          {remaining.length ? (
            remaining.map((item) => <li key={item.id}>• {item.label}</li>)
          ) : (
            <li>All steps complete</li>
          )}
        </ul>
      </div>
    </section>
  );
}

function PatientDetailsStep({
  form,
  setForm,
}: {
  form: PatientFormState;
  setForm: (form: PatientFormState) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Patient details"
        description="Capture the identity details that will appear on the clinical record."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name" htmlFor="first_name">
          <input
            id="first_name"
            name="first_name"
            value={form.first_name}
            onChange={(event) => setForm({ ...form, first_name: event.target.value })}
            className={inputClassFor(form.first_name)}
          />
        </Field>
        <Field label="Middle name" htmlFor="middle_name">
          <input
            id="middle_name"
            name="middle_name"
            value={form.middle_name}
            onChange={(event) => setForm({ ...form, middle_name: event.target.value })}
            className={inputClassFor(form.middle_name)}
          />
        </Field>
        <Field label="Last name" htmlFor="last_name">
          <input
            id="last_name"
            name="last_name"
            value={form.last_name}
            onChange={(event) => setForm({ ...form, last_name: event.target.value })}
            className={inputClassFor(form.last_name)}
          />
        </Field>
        <Field label="Date of birth" htmlFor="date_of_birth">
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })}
            className={inputClassFor(form.date_of_birth)}
          />
        </Field>
        <Field label="Sex" htmlFor="sex">
          <select
            id="sex"
            name="sex"
            value={form.sex}
            onChange={(event) =>
              setForm({ ...form, sex: event.target.value as PatientSex | "" })
            }
            className={inputClassFor(form.sex)}
          >
            <option value="">Select sex</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>
        <div className="flex items-end">
          <label className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-4 text-sm font-semibold text-gray-100">
            <input
              type="checkbox"
              checked={form.medical_exception_flag}
              onChange={(event) =>
                setForm({ ...form, medical_exception_flag: event.target.checked })
              }
              className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-brand-500 focus:ring-brand-500"
            />
            Medical exception
          </label>
        </div>
      </div>
    </div>
  );
}

function CaregiverDetailsStep({
  facilities,
  form,
  isLoadingReference,
  setForm,
  units,
}: {
  form: CaregiverFormState;
  facilities: HealthFacility[];
  isLoadingReference: boolean;
  setForm: (form: CaregiverFormState) => void;
  units: AdministrativeUnitBrief[];
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Caregiver and facility"
        description="Link the patient to a responsible caregiver, health facility, and residence unit."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Caregiver full name" htmlFor="caregiver_name">
          <input
            id="caregiver_name"
            name="caregiver_name"
            value={form.full_name}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
            className={inputClassFor(form.full_name)}
          />
        </Field>
        <Field label="Caregiver phone" htmlFor="caregiver_phone">
          <input
            id="caregiver_phone"
            name="caregiver_phone"
            value={form.phone_number}
            onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
            placeholder="+2519..."
            className={inputClassFor(form.phone_number)}
          />
        </Field>
        <Field label="Relationship" htmlFor="relationship">
          <select
            id="relationship"
            name="relationship"
            value={form.relationship_to_patient}
            onChange={(event) =>
              setForm({ ...form, relationship_to_patient: event.target.value })
            }
            className={inputClassFor(form.relationship_to_patient)}
          >
            <option value="mother">Mother</option>
            <option value="father">Father</option>
            <option value="guardian">Guardian</option>
            <option value="caregiver">Caregiver</option>
          </select>
        </Field>
        <Field label="Preferred language" htmlFor="preferred_language">
          <select
            id="preferred_language"
            name="preferred_language"
            value={form.preferred_language}
            onChange={(event) =>
              setForm({ ...form, preferred_language: event.target.value })
            }
            className={inputClassFor(form.preferred_language)}
          >
            <option value="am">Amharic</option>
            <option value="om">Afaan Oromo</option>
            <option value="ti">Tigrinya</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label="Facility" htmlFor="registered_facility_id">
          <select
            id="registered_facility_id"
            name="registered_facility_id"
            value={form.registered_facility_id}
            disabled={isLoadingReference}
            onChange={(event) =>
              setForm({ ...form, registered_facility_id: event.target.value })
            }
            className={inputClassFor(form.registered_facility_id)}
          >
            <option value="">Select facility</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.facility_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Residence unit" htmlFor="residence_unit_id">
          <select
            id="residence_unit_id"
            name="residence_unit_id"
            value={form.residence_unit_id}
            disabled={isLoadingReference}
            onChange={(event) =>
              setForm({ ...form, residence_unit_id: event.target.value })
            }
            className={inputClassFor(form.residence_unit_id)}
          >
            <option value="">Select location</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} · {unit.level}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Address line" htmlFor="address_line" className="md:col-span-2">
          <input
            id="address_line"
            name="address_line"
            value={form.address_line}
            onChange={(event) => setForm({ ...form, address_line: event.target.value })}
            className={inputClassFor(form.address_line)}
          />
        </Field>
      </div>
    </div>
  );
}

function DuplicateCheckStep({
  caregiverForm,
  patientForm,
}: {
  patientForm: PatientFormState;
  caregiverForm: CaregiverFormState;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Duplicate check"
        description="Review duplicate-detection status before creating a new registry record."
      />
      <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-5 text-sm text-warning-300">
        <p className="font-semibold">Backend duplicate matching is not connected yet.</p>
        <p className="mt-2 leading-6">
          For this section, continue only after manually confirming that{" "}
          <span className="font-semibold">
            {patientForm.first_name} {patientForm.last_name}
          </span>{" "}
          and caregiver phone{" "}
          <span className="font-semibold">{caregiverForm.phone_number}</span> are not
          already present in the registry.
        </p>
      </div>
      <div className="enterprise-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white">
          Suggested backend behavior
        </h3>
        <p className="enterprise-muted mt-2 text-sm leading-6">
          The frontend should eventually call a duplicate-check API using patient
          name, date of birth, caregiver phone, and residence unit before submit.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  caregiverForm,
  patientForm,
  selectedFacility,
  selectedUnit,
}: {
  patientForm: PatientFormState;
  caregiverForm: CaregiverFormState;
  selectedFacility: HealthFacility | null;
  selectedUnit: AdministrativeUnitBrief | null;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Review and submit"
        description="Confirm the registry details before creating the official patient record."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewCard
          title="Patient"
          rows={[
            ["Name", `${patientForm.first_name} ${patientForm.middle_name} ${patientForm.last_name}`],
            ["Date of birth", patientForm.date_of_birth],
            ["Sex", patientForm.sex],
            ["Medical exception", patientForm.medical_exception_flag ? "Yes" : "No"],
          ]}
        />
        <ReviewCard
          title="Caregiver and facility"
          rows={[
            ["Caregiver", caregiverForm.full_name],
            ["Phone", caregiverForm.phone_number],
            ["Relationship", caregiverForm.relationship_to_patient],
            ["Facility", selectedFacility?.facility_name ?? "Not selected"],
            ["Residence", selectedUnit?.name ?? "Not selected"],
          ]}
        />
      </div>
    </div>
  );
}

function SuccessStep({ patient }: { patient: Patient | null }) {
  return (
    <div className="mx-auto max-w-2xl py-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success-500/10 text-success-300">
        <CheckCircleIcon className="h-7 w-7 fill-current" />
      </div>
      <h2 className="text-2xl font-bold text-white">
        Patient registered
      </h2>
      <p className="enterprise-muted mt-2 text-sm">
        {patient?.full_name ?? "The patient"} has been added to the registry.
      </p>
      {patient ? (
        <div className="enterprise-card mt-5 inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm">
          <span className="enterprise-muted">Generated UID</span>
          <span className="font-bold text-blue-light-300">{patient.uid}</span>
        </div>
      ) : null}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/patients"
          className="enterprise-button-secondary inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-theme-xs transition"
        >
          Back to registry
        </Link>
        <button
          type="button"
          disabled
          className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-gray-500"
        >
          Record first dose
        </button>
      </div>
    </div>
  );
}

function SectionTitle({
  description,
  title,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="enterprise-muted mt-1 text-sm">{description}</p>
    </div>
  );
}

function Field({
  children,
  className = "",
  htmlFor,
  label,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`} htmlFor={htmlFor}>
      <span className="mb-2 block text-sm font-medium text-gray-100">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReviewCard({ rows, title }: { title: string; rows: string[][] }) {
  return (
    <article className="enterprise-card rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        <Badge color="info">Review</Badge>
      </div>
      <dl className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="enterprise-muted">{label}</dt>
            <dd className="text-right font-semibold text-white/90">
              {value || "Not provided"}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function validatePatientStep(form: PatientFormState) {
  if (!form.first_name.trim()) {
    return "Enter the patient first name.";
  }
  if (!form.last_name.trim()) {
    return "Enter the patient last name.";
  }
  if (!form.date_of_birth) {
    return "Select the patient date of birth.";
  }
  if (new Date(form.date_of_birth) > new Date()) {
    return "Date of birth cannot be in the future.";
  }
  if (!form.sex) {
    return "Select the patient sex.";
  }
  return "";
}

function validateCaregiverStep(form: CaregiverFormState) {
  if (!form.full_name.trim()) {
    return "Enter the caregiver full name.";
  }
  if (!form.phone_number.trim()) {
    return "Enter the caregiver phone number.";
  }
  if (!form.registered_facility_id) {
    return "Select the registering facility.";
  }
  if (!form.residence_unit_id) {
    return "Select the residence unit.";
  }
  return "";
}

function readApiError(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Could not complete patient registration.";
}

function inputClassFor(value: string) {
  return `enterprise-input h-11 px-3.5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
    value ? "enterprise-input-success pr-9" : ""
  }`;
}
