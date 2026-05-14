"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { UserRole } from "@/features/auth/types";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { fetchMe } from "@/services/auth";
import { clearStoredSession } from "@/shared/auth-storage";
import { useRef, useState } from "react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const session = useAuthSession();
  const hasStoredSession =
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem("nvoms.auth.session"));
  const isHydratingStoredSession = !session && hasStoredSession;
  const isAllowed =
    session && (!allowedRoles || allowedRoles.includes(session.user.role));

  const [isValidated, setIsValidated] = useState(false);
  const validationInFlight = useRef(false);

  useEffect(() => {
    if (isHydratingStoredSession) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }

    if (!isAllowed) {
      router.replace("/");
      return;
    }

    if (!isValidated && !validationInFlight.current && session) {
      validationInFlight.current = true;
      fetchMe(session.tokens.accessToken)
        .then(() => {
          setIsValidated(true);
        })
        .catch(() => {
          clearStoredSession();
          router.replace("/login");
        })
        .finally(() => {
          validationInFlight.current = false;
        });
    }
  }, [isAllowed, isHydratingStoredSession, router, session, isValidated]);

  if (isHydratingStoredSession || !session || session.user.mustChangePassword) {
    return <LoadingState label="Loading workspace" />;
  }

  if (!isAllowed) {
    return <LoadingState label="Checking access" />;
  }

  if (!isValidated) {
    return <LoadingState label="Validating session" />;
  }

  return children;
}

function LoadingState({ label }: { label: string }) {
  return (
    <main className="enterprise-shell grid min-h-screen place-items-center text-sm font-semibold text-gray-300">
      <span className="enterprise-card inline-flex items-center gap-3 rounded-xl px-4 py-3 shadow-theme-xs">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
          aria-hidden="true"
        />
        {label}
      </span>
    </main>
  );
}
