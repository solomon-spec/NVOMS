import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function SelfServiceTimelinePage() {
  return <RoutePlaceholder title="Upcoming Doses" allowedRoles={["PATIENT"]} />;
}
