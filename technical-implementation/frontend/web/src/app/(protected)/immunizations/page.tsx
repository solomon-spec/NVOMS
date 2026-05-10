import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { ImmunizationWorkspace } from "@/features/immunizations/ImmunizationWorkspace";
import { Suspense } from "react";

export default function ImmunizationsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER"]}>
      <Suspense fallback={<p className="p-4 text-sm text-gray-500">Loading workspace...</p>}>
        <ImmunizationWorkspace />
      </Suspense>
    </ProtectedRoute>
  );
}
