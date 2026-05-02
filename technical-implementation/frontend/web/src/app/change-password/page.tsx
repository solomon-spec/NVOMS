import { AuthShell } from "@/features/auth/AuthShell";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <AuthShell
      eyebrow="Account setup"
      title="Protect access before operational data is opened."
      summary="Complete the password update required for newly issued or reset NVOMS accounts."
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
