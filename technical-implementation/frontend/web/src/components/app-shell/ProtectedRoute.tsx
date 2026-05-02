"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { UserRole } from "@/features/auth/types";
import { useAuthSession } from "@/features/auth/useAuthSession";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const session = useAuthSession();
  const isAllowed =
    session && (!allowedRoles || allowedRoles.includes(session.user.role));

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }

    if (!isAllowed) {
      router.replace("/dashboard");
    }
  }, [isAllowed, router, session]);

  if (!session || session.user.mustChangePassword) {
    return <LoadingState label="Loading workspace" />;
  }

  if (!isAllowed) {
    return <LoadingState label="Checking access" />;
  }

  return children;
}

function LoadingState({ label }: { label: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 text-sm font-semibold text-gray-500 dark:bg-gray-950 dark:text-gray-400">
      <span className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
          aria-hidden="true"
        />
        {label}
      </span>
    </main>
  );
}
