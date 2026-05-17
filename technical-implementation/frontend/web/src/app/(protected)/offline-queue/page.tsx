import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { OfflineSyncWorkspace } from "@/features/offline/OfflineSyncWorkspace";

export default function OfflineQueuePage() {
  return (
    <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
      <OfflineSyncWorkspace />
    </ProtectedRoute>
  );
}
