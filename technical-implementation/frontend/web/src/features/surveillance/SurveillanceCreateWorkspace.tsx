"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuthSession } from "@/features/auth/useAuthSession";
import type { HealthFacility, Patient } from "@/features/registry/types";
import type {
  CreateSurveillanceReportPayload,
  SurveillanceCategory,
  SurveillanceSeverity,
} from "@/features/surveillance/types";
import { ApiError } from "@/services/api";
import { listFacilities, listPatients } from "@/services/patients";
import { createSurveillanceReport } from "@/services/surveillance";
import {
  InlineError,
  SelectInput,
  StatusPill,
  TextAreaInput,
  TextInput,
} from "@/shared/workspace-ui";

const categoryOptions: Array<{
  label: string;
  value: SurveillanceCategory;
}> = [
  { label: "AEFI", value: "aefi" },
  { label: "Symptom", value: "symptom" },
  { label: "Lab follow-up", value: "lab_follow_up" },
];

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

export function SurveillanceCreateWorkspace() {
  const session = useAuthSession();
  const router = useRouter();
  const role = session?.user.role ?? "";
  const canManageReports = role === "ADMIN" || role === "HEALTH_WORKER";
  const token = session?.tokens.accessToken ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [reportForm, setReportForm] = useState(emptyReportForm);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadFormContext() {
      if (!token || !canManageReports) {
        setIsLoading(false);
        return;
      }

      try {
        const [facilityRows, patientRows] = await Promise.all([
          listFacilities(token),
          listPatients(token),
        ]);

        if (isActive) {
          setFacilities(facilityRows);
          setPatients(patientRows);
          setError("");
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

    loadFormContext();
    return () => {
      isActive = false;
    };
  }, [canManageReports, token]);

  async function handleCreateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

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
      router.push(`/surveillance/${report.id}`);
    } catch (caughtError) {
      setFormError(readApiError(caughtError));
      setIsCreating(false);
    }
  }

  if (!canManageReports) {
    return (
      <div className="p-6">
        <InlineError message="You do not have permission to create surveillance reports." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/surveillance"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          ← Back to Surveillance Queue
        </Link>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create surveillance report
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Report an AEFI or Vaccine Preventable Disease (VPD).
            </p>
          </div>
          <StatusPill label={`${patients.length} patients loaded`} />
        </div>

        {error && <InlineError className="mt-4" message={error} />}

        <form className="mt-6 grid gap-6" onSubmit={handleCreateReport}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              options={categoryOptions}
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
          <div className="flex justify-end border-t border-gray-200 pt-5 dark:border-gray-800">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700 disabled:bg-gray-300"
              disabled={isCreating || isLoading}
              type="submit"
            >
              {isCreating ? "Submitting..." : "Submit surveillance report"}
            </button>
          </div>
        </form>
      </section>
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readApiError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Could not reach the backend. Confirm the API is running on port 8000.";
}
