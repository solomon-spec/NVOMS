import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function SelfServiceQrPage() {
  return <RoutePlaceholder title="QR ID" allowedRoles={["PATIENT"]} />;
}
