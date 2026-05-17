import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { OutbreakCreateWorkspace } from "@/features/outbreaks/OutbreakCreateWorkspace";

export default function NewOutbreakPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER"]}>
      <OutbreakCreateWorkspace />
    </ProtectedRoute>
  );
}
