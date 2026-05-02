import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { SurveillanceWorkspace } from "@/features/surveillance/SurveillanceWorkspace";

export default function SurveillancePage() {
  return (
    <ProtectedRoute
      allowedRoles={["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"]}
    >
      <SurveillanceWorkspace />
    </ProtectedRoute>
  );
}
