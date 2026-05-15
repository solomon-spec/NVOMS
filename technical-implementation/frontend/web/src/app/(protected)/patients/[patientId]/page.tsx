import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import { PatientDetailWorkspace } from "@/features/registry/PatientDetailWorkspace";

type PatientDetailPageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { patientId } = await params;

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "HEALTH_WORKER"]}>
      <PatientDetailWorkspace patientId={patientId} />
    </ProtectedRoute>
  );
}
