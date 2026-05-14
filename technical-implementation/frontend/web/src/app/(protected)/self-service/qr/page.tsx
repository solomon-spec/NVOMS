"use client";

import React from "react";
import { useSelfService } from "@/features/self-service/SelfServiceContext";
import { PatientSelector } from "@/features/self-service/components/PatientSelector";
import { PageHeader } from "@/components/layout/PageHeader";

export default function QRPage() {
  const { patientSummary, loading, caregiverPatients } = useSelfService();

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!patientSummary) {
    return <div className="p-8 text-center text-gray-500">No patient selected.</div>;
  }

  const { patient } = patientSummary;

  return (
    <div className="space-y-6">
      <PageHeader title="QR ID" />
      {caregiverPatients.length > 0 && <PatientSelector />}

      <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white text-center shadow-theme-md dark:border-white/10 dark:bg-[#08111f]">
        <div className="bg-brand-500 p-6 text-white">
          <h2 className="text-lg font-bold">NVOMS Patient ID</h2>
        </div>
        <div className="p-8">
          <div className="mx-auto mb-6 flex h-48 w-48 items-center justify-center rounded-xl border-4 border-gray-100 bg-white">
            {/* Placeholder QR */}
            <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-1 p-2">
               {Array.from({ length: 16 }).map((_, i) => (
                 <div key={i} className={`rounded-sm ${i % 3 === 0 || i % 5 === 0 ? 'bg-gray-800' : 'bg-gray-200'}`} />
               ))}
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{patient.full_name}</h3>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">UID: {patient.uid}</p>
        </div>
        <div className="bg-gray-50 px-6 py-4 dark:bg-white/[0.02]">
          <p className="text-xs text-gray-500">Show this QR code at any health facility.</p>
        </div>
      </div>
    </div>
  );
}
