import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { AdminConsoleWorkspace } from "@/features/admin/AdminConsoleWorkspace";

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <AdminConsoleWorkspace />
    </ProtectedRoute>
  );
}
