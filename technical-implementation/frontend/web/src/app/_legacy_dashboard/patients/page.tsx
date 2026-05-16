import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { PatientRegistry } from "@/features/registry/PatientRegistry";

export default function PatientsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER"]}>
      <PatientRegistry />
    </ProtectedRoute>
  );
}
