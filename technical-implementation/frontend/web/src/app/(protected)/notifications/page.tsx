import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function NotificationsPage() {
  return (
    <RoutePlaceholder
      title="Notifications"
      allowedRoles={["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"]}
    />
  );
}
