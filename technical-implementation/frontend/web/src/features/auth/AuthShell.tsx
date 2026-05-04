import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  summary?: string;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center">
      <section className="flex w-full max-w-2xl flex-col bg-white px-6 py-8 dark:bg-gray-900 sm:px-10 lg:px-14 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 m-4">
        <div className="flex items-center justify-center gap-4 mb-8">
          <Link href="/login" className="inline-flex items-center">
            <Image
              className="dark:hidden"
              src="/images/logo/auth-logo.svg"
              alt="NVOMS"
              width={155}
              height={32}
              priority
            />
            <Image
              className="hidden dark:block"
              src="/images/logo/logo-dark.svg"
              alt="NVOMS"
              width={155}
              height={32}
              priority
            />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          {children}
        </div>
      </section>
    </main>
  );
}
