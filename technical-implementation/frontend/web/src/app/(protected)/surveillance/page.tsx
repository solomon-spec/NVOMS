import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function SurveillancePage() {
  return (
    <RoutePlaceholder
      title="Surveillance"
      allowedRoles={["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"]}
    />
  );
}
