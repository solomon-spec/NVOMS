"use client";

import React, { useEffect, useState } from "react";
import { useSelfService } from "@/features/self-service/SelfServiceContext";
import { PatientSelector } from "@/features/self-service/components/PatientSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { listMyPatientSchedule, listCaregiverPatientSchedule } from "@/services/patients";
import type { PatientScheduleSlot } from "@/features/registry/types";

export default function AlertsPage() {
  const session = useAuthSession();
  const { patientId, caregiverPatients } = useSelfService();
  const isCaregiver = session?.user?.role === "CAREGIVER";

  const [alerts, setAlerts] = useState<PatientScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || (!patientId && isCaregiver)) return;

    const token = session.tokens.accessToken;

    const fetchPromise = isCaregiver && patientId
      ? listCaregiverPatientSchedule(token, patientId)
      : listMyPatientSchedule(token);

    fetchPromise
      .then((scheduleRes) => {
        const filteredAlerts = scheduleRes.filter(slot =>
          ['overdue', 'due_soon', 'due_today', 'defaulter'].includes(slot.status)
        );
        setAlerts(filteredAlerts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session, isCaregiver, patientId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Alerts" />
      {caregiverPatients.length > 0 && <PatientSelector />}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-white/10 dark:bg-white/[0.03]">
        {alerts.length === 0 ? (
          <div className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active alerts</h3>
            <p className="mt-1 text-sm text-gray-500">You are all caught up with the vaccination schedule.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex gap-4 rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
                <div className="flex-1">
                  <h4 className="font-medium text-warning-800 dark:text-warning-300">
                    {alert.status === 'overdue' || alert.status === 'defaulter' ? 'Overdue Vaccination' : 'Upcoming Appointment'}
                  </h4>
                  <p className="mt-1 text-sm text-warning-700 dark:text-warning-400/80">
                    {alert.vaccine.vaccine_name} is {alert.status.replace("_", " ")}. Due date was {new Date(alert.due_date).toLocaleDateString()}.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
