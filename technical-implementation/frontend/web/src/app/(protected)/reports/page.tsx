import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function ReportsPage() {
  return (
    <RoutePlaceholder
      title="Reports"
      allowedRoles={["ADMIN", "PUBLIC_HEALTH_OFFICIAL"]}
    />
  );
}
