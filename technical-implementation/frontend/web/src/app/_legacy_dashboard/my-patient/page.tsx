import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { PatientSelfService } from "@/features/registry/PatientSelfService";

export default function MyPatientPage() {
  return (
    <ProtectedRoute allowedRoles={["PATIENT"]}>
      <PatientSelfService />
    </ProtectedRoute>
  );
}
