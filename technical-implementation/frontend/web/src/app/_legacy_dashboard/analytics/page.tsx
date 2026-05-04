import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { AnalyticsWorkspace } from "@/features/analytics/AnalyticsWorkspace";

export default function AnalyticsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PUBLIC_HEALTH_OFFICIAL"]}>
      <AnalyticsWorkspace />
    </ProtectedRoute>
  );
}
