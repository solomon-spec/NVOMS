import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function ImmunizationsPage() {
  return (
    <RoutePlaceholder
      title="Immunizations"
      allowedRoles={["ADMIN", "HEALTH_WORKER"]}
    />
  );
}
