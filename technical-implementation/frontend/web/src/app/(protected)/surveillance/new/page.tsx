import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { SurveillanceCreateWorkspace } from "@/features/surveillance/SurveillanceCreateWorkspace";

export default function NewSurveillancePage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER"]}>
      <SurveillanceCreateWorkspace />
    </ProtectedRoute>
  );
}
