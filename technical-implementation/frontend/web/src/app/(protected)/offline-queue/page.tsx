import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function OfflineQueuePage() {
  return (
    <RoutePlaceholder title="Offline Queue" allowedRoles={["HEALTH_WORKER"]} />
  );
}
