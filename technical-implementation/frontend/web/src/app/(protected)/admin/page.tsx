import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function AdminPage() {
  return <RoutePlaceholder title="Admin Console" allowedRoles={["ADMIN"]} />;
}
