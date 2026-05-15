"use client";

import React from "react";
import { useSelfService } from "../SelfServiceContext";

export function PatientSelector() {
  const { caregiverPatients, patientId, setPatientId } = useSelfService();

  if (caregiverPatients.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.03]">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Viewing Record For
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Select a dependent to view their vaccination history.
        </p>
      </div>
      <select
        value={patientId ?? ""}
        onChange={(e) => setPatientId(e.target.value)}
        className="enterprise-input h-10 w-64 rounded-lg bg-gray-50 dark:bg-gray-900"
      >
        <option value="" disabled>Select a patient</option>
        {caregiverPatients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name} ({p.uid})
          </option>
        ))}
      </select>
    </div>
  );
}
