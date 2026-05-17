import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { OutbreakReportsWorkspace } from "@/features/outbreaks/OutbreakReportsWorkspace";

export default function OutbreaksPage() {
  return (
    <ProtectedRoute
      allowedRoles={["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"]}
    >
      <OutbreakReportsWorkspace />
    </ProtectedRoute>
  );
}
