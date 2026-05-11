import { SurveillanceDetailWorkspace } from "@/features/surveillance/SurveillanceDetailWorkspace";

export default function SurveillanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <SurveillanceDetailWorkspace reportId={params.id} />;
}
