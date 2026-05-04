import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { OfflineSyncWorkspace } from "@/features/offline/OfflineSyncWorkspace";

export default function SyncPage() {
  return (
    <ProtectedRoute allowedRoles={["HEALTH_WORKER", "ADMIN"]}>
      <OfflineSyncWorkspace />
    </ProtectedRoute>
  );
}
