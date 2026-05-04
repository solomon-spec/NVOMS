import { RoutePlaceholder } from "@/components/app-shell/RoutePlaceholder";

export default function SelfServicePage() {
  return (
    <RoutePlaceholder
      title="My Vaccination Card"
      allowedRoles={["PATIENT"]}
    />
  );
}
