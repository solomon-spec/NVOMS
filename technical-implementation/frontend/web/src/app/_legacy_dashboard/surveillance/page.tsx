import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { SurveillanceQueueWorkspace } from "@/features/surveillance/SurveillanceQueueWorkspace";

export default function SurveillancePage() {
  return (
    <ProtectedRoute
      allowedRoles={["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"]}
    >
      <SurveillanceQueueWorkspace />
    </ProtectedRoute>
  );
}
