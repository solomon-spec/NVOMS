import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { SystemSettingsWorkspace } from "@/features/admin/SystemSettingsWorkspace";

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <SystemSettingsWorkspace />
    </ProtectedRoute>
  );
}
