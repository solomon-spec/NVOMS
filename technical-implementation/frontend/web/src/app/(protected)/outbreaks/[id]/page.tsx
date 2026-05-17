import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { OutbreakDetailWorkspace } from "@/features/outbreaks/OutbreakDetailWorkspace";

export default async function OutbreakDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedRoute
      allowedRoles={["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"]}
    >
      <OutbreakDetailWorkspace reportId={id} />
    </ProtectedRoute>
  );
}
