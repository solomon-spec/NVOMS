import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function SettingsPage() {
  return <RoutePlaceholder title="System Settings" allowedRoles={["ADMIN"]} />;
}
