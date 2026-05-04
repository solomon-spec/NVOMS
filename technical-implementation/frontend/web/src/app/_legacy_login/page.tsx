import { AuthShell } from "@/features/auth/AuthShell";
import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Access control"
      title="Coordinate vaccination and outbreak work from one secure console."
      summary="Sign in to manage patient records, immunization activity, surveillance reports, and facility-level operations."
    >
      <LoginForm />
    </AuthShell>
  );
}
