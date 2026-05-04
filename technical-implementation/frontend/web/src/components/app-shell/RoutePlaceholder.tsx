"use client";

import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import type { UserRole } from "@/features/auth/types";

type RoutePlaceholderProps = {
  title: string;
  allowedRoles: UserRole[];
};

export function RoutePlaceholder({
  title,
  allowedRoles,
}: RoutePlaceholderProps) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This section will be implemented in a later frontend phase.
          </p>
        </section>
      </div>
    </ProtectedRoute>
  );
}
