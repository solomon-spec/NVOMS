"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";
import {
  getMyPatient,
  listCaregiverPatients,
} from "@/services/patients";
import type { Patient, PatientSummary } from "@/features/registry/types";

type SelfServiceContextType = {
  patientId: string | null;
  patientSummary: PatientSummary | null;
  caregiverPatients: Patient[];
  setPatientId: (id: string) => void;
  loading: boolean;
  error: string | null;
};

const SelfServiceContext = createContext<SelfServiceContextType | null>(null);

export function SelfServiceProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthSession();
  const role = session?.user?.role;
  const isCaregiver = role === "CAREGIVER";

  const [caregiverPatients, setCaregiverPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function init() {
      if (!session) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        if (isCaregiver) {
          const response = await listCaregiverPatients(session.tokens.accessToken);
          if (!isActive) {
            return;
          }

          setCaregiverPatients(response);
          if (response.length > 0) {
            const selectedPatient = response.find((row) => row.id === patientId) ?? response[0];
            setPatientId(selectedPatient.id);
            setPatientSummary({
              patient: selectedPatient,
              immunization_summary: null,
            });
          } else {
            setPatientId(null);
            setPatientSummary(null);
          }
        } else {
          const summary = await getMyPatient(session.tokens.accessToken);
          if (!isActive) {
            return;
          }

          setPatientSummary(summary);
          setPatientId(summary.patient.id);
        }
      } catch {
        if (isActive) {
          setError("Could not load patient information.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      isActive = false;
    };
  }, [session, isCaregiver, patientId]);

  useEffect(() => {
    if (!isCaregiver || !patientId) {
      return;
    }

    const selectedPatient = caregiverPatients.find((row) => row.id === patientId);
    if (selectedPatient) {
      setPatientSummary({
        patient: selectedPatient,
        immunization_summary: null,
      });
    }
  }, [caregiverPatients, isCaregiver, patientId]);

  return (
    <SelfServiceContext.Provider
      value={{
        patientId,
        patientSummary,
        caregiverPatients,
        setPatientId,
        loading,
        error,
      }}
    >
      {children}
    </SelfServiceContext.Provider>
  );
}

export function useSelfService() {
  const ctx = useContext(SelfServiceContext);
  if (!ctx) {
    throw new Error("useSelfService must be used within SelfServiceProvider");
  }
  return ctx;
}
