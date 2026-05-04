import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { ImmunizationWorkspace } from "@/features/immunizations/ImmunizationWorkspace";

export default function ImmunizationsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER"]}>
      <ImmunizationWorkspace />
    </ProtectedRoute>
  );
}
