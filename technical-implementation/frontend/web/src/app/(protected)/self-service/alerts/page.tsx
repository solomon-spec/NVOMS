import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function SelfServiceAlertsPage() {
  return <RoutePlaceholder title="Alerts" allowedRoles={["PATIENT"]} />;
}
