import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { PatientRegistryWorkspace } from "@/features/registry/PatientRegistryWorkspace";

export default function PatientsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER"]}>
      <PatientRegistryWorkspace />
    </ProtectedRoute>
  );
}
