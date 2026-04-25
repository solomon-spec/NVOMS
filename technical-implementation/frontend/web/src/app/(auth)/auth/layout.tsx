import type React from "react";
import Image from "next/image";
import Link from "next/link";
import GridShape from "@/components/common/GridShape";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-4">
          <Link href="/auth/sign-in" className="inline-flex items-center">
            <Image
              src="/images/logo/auth-logo.svg"
              alt="NVOMS"
              width={155}
              height={32}
              priority
            />
          </Link>

          <Link
            href="/all-components"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50"
          >
            Component Library
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>
      </section>

      <aside className="relative hidden overflow-hidden border-l border-gray-200 bg-gray-50 lg:flex lg:flex-col">
        <GridShape />

        <div className="relative z-10 flex h-full flex-col justify-between px-10 py-12">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
              National Vaccination and Outbreak Monitoring System
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
              Secure access for public health operations
            </h2>
            <p className="max-w-sm text-sm leading-7 text-gray-500">
              This workspace is designed for structured daily operations across
              registry, immunization, surveillance, reporting, and audit-ready
              administration.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">
                Access Model
              </p>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">
                Role-based internal accounts
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Facility, district, and administrative users are granted access
                according to their assigned role and operational scope.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs">
                <p className="text-sm font-semibold text-gray-900">
                  Registry and immunization
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Patient records, dose tracking, and scheduled follow-up work.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs">
                <p className="text-sm font-semibold text-gray-900">
                  Surveillance and reporting
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Case monitoring, operational visibility, and accountability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
