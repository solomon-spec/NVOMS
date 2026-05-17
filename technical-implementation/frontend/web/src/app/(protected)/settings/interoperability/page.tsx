import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { InteroperabilityWorkspace } from "@/features/admin/InteroperabilityWorkspace";

export default function InteroperabilityPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <InteroperabilityWorkspace />
    </ProtectedRoute>
  );
}
