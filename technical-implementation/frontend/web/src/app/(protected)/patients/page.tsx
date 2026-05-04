import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function PatientsPage() {
  return (
    <RoutePlaceholder
      title="Patients"
      allowedRoles={["ADMIN", "HEALTH_WORKER"]}
    />
  );
}
