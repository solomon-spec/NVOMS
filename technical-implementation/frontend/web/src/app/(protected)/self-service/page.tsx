"use client";

import React from "react";
import { useSelfService } from "@/features/self-service/SelfServiceContext";
import { PatientSelector } from "@/features/self-service/components/PatientSelector";
import { PageHeader } from "@/components/layout/PageHeader";

export default function SelfServicePage() {
  const { patientSummary, loading, error, caregiverPatients } = useSelfService();

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading patient data...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-error-500">{error}</div>;
  }

  if (!patientSummary) {
    return <div className="p-8 text-center text-gray-500">No patient selected.</div>;
  }

  const { patient, immunization_summary } = patientSummary;

  return (
    <div className="space-y-6">
      <PageHeader title="My Vaccination Card" />

      {caregiverPatients.length > 0 && <PatientSelector />}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Patient Name</h3>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{patient.full_name}</p>
          <p className="text-sm text-gray-500">ID: {patient.uid}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Status</h3>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white capitalize">
            {immunization_summary ? immunization_summary.current_status.replace("_", " ") : "Unknown"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Upcoming Dose</h3>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {immunization_summary?.next_due_date ? new Date(immunization_summary.next_due_date).toLocaleDateString() : "Up to date"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Doses Administered</h3>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {immunization_summary?.administered_count ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
