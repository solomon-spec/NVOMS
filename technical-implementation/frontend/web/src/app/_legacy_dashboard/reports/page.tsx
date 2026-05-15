import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { ReportsWorkspace } from "@/features/reports/ReportsWorkspace";

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PUBLIC_HEALTH_OFFICIAL"]}>
      <ReportsWorkspace />
    </ProtectedRoute>
  );
}
