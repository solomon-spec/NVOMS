import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function DefaultersPage() {
  return (
    <RoutePlaceholder
      title="Defaulter Clusters"
      allowedRoles={["PUBLIC_HEALTH_OFFICIAL"]}
    />
  );
}
