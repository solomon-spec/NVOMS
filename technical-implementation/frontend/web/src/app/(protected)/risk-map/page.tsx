import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function RiskMapPage() {
  return (
    <RoutePlaceholder
      title="Risk Map"
      allowedRoles={["PUBLIC_HEALTH_OFFICIAL"]}
    />
  );
}
