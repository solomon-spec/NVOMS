"use client";

import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import React from "react";
import { SelfServiceProvider } from "@/features/self-service/SelfServiceContext";

export default function SelfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["PATIENT", "CAREGIVER"]}>
      <SelfServiceProvider>
        {children}
      </SelfServiceProvider>
    </ProtectedRoute>
  );
}
