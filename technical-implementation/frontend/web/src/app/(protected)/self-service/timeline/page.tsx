"use client";

import React, { useEffect, useState } from "react";
import { useSelfService } from "@/features/self-service/SelfServiceContext";
import { PatientSelector } from "@/features/self-service/components/PatientSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { listMyPatientDoses, listMyPatientSchedule, listCaregiverPatientDoses, listCaregiverPatientSchedule } from "@/services/patients";
import type { ImmunizationEvent, PatientScheduleSlot } from "@/features/registry/types";

export default function TimelinePage() {
  const session = useAuthSession();
  const { patientId, caregiverPatients } = useSelfService();
  const isCaregiver = session?.user?.role === "CAREGIVER";

  const [doses, setDoses] = useState<ImmunizationEvent[]>([]);
  const [schedule, setSchedule] = useState<PatientScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || (!patientId && isCaregiver)) return;

    const token = session.tokens.accessToken;

    const fetchPromises = isCaregiver && patientId
      ? [listCaregiverPatientDoses(token, patientId), listCaregiverPatientSchedule(token, patientId)]
      : [listMyPatientDoses(token), listMyPatientSchedule(token)];

    Promise.all(fetchPromises)
      .then(([dosesRes, scheduleRes]) => {
        setDoses(dosesRes as ImmunizationEvent[]);
        setSchedule(scheduleRes as PatientScheduleSlot[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session, isCaregiver, patientId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading timeline...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Vaccination Timeline" />
      {caregiverPatients.length > 0 && <PatientSelector />}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Administered Doses</h2>
        {doses.length === 0 ? (
          <p className="text-gray-500">No doses recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {doses.map((dose) => (
              <li key={dose.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-white/[0.02]">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{dose.vaccine.vaccine_name}</p>
                  <p className="text-sm text-gray-500">{new Date(dose.administered_at).toLocaleDateString()}</p>
                </div>
                <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                  {dose.event_status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Upcoming & Scheduled</h2>
        {schedule.length === 0 ? (
          <p className="text-gray-500">No scheduled doses.</p>
        ) : (
          <ul className="space-y-3">
            {schedule.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-white/[0.02]">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{slot.vaccine.vaccine_name}</p>
                  <p className="text-sm text-gray-500">Due: {new Date(slot.due_date).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  slot.status === 'overdue' || slot.status === 'defaulter' ? 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400' :
                  'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                }`}>
                  {slot.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
