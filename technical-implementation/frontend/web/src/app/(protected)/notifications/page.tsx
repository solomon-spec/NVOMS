import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { NotificationsWorkspace } from "@/features/notifications/NotificationsWorkspace";

export default function NotificationsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"]}>
      <NotificationsWorkspace />
    </ProtectedRoute>
  );
}
