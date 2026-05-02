import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import GridShape from "@/components/common/GridShape";
import { BoxCubeIcon, GroupIcon, TaskIcon } from "@/icons";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  summary: string;
};

const operationalSignals = [
  { label: "Identity", value: "JWT sessions", icon: BoxCubeIcon },
  { label: "Coverage", value: "Facility scope", icon: GroupIcon },
  { label: "Monitoring", value: "Outbreak-ready", icon: TaskIcon },
];

export function AuthShell({
  children,
  eyebrow,
  title,
  summary,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 lg:grid lg:grid-cols-[minmax(0,1fr)_440px]">
      <section className="flex min-h-screen flex-col bg-white px-6 py-8 dark:bg-gray-900 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-4">
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

          <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            Secure workspace
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          {children}
        </div>
      </section>

      <aside
        className="relative hidden overflow-hidden border-l border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 lg:flex lg:flex-col"
        aria-label="NVOMS access context"
      >
        <GridShape />

        <div className="relative z-10 flex h-full flex-col justify-between px-10 py-12">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h1>
            <p className="max-w-sm text-sm leading-7 text-gray-500 dark:text-gray-400">
              {summary}
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
                Operational console
              </p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                One workspace for daily public health work
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                Registry, immunization, surveillance, reporting, and
                administration all share the same authenticated session.
              </p>
            </div>

            <div className="grid gap-4">
              {operationalSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
                    key={signal.label}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 [&>svg]:h-5 [&>svg]:w-5">
                      <Icon aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {signal.label}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {signal.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
