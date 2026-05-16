import { AuthShell } from "@/features/auth/AuthShell";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <AuthShell>
      <ChangePasswordForm />
    </AuthShell>
  );
}
