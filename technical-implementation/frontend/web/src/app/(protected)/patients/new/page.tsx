import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { PatientRegistrationWorkspace } from "@/features/registry/PatientRegistrationWorkspace";

export default function NewPatientPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER"]}>
      <PatientRegistrationWorkspace />
    </ProtectedRoute>
  );
}
