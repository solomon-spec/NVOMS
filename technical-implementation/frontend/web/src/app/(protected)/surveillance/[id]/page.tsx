import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { SurveillanceDetailWorkspace } from "@/features/surveillance/SurveillanceDetailWorkspace";

export default async function SurveillanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedRoute
      allowedRoles={["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"]}
    >
      <SurveillanceDetailWorkspace reportId={id} />
    </ProtectedRoute>
  );
}
