import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  summary?: string;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="auth-medical-bg flex flex-col items-center justify-center px-4 py-8">
      <section className="flex w-full max-w-[460px] flex-col items-center justify-center">
        {children}
      </section>
    </main>
  );
}
