"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PasswordField } from "@/features/auth/PasswordField";
import { AlertIcon, ArrowRightIcon, MailIcon } from "@/icons";
import { ApiError } from "@/services/api";
import { login } from "@/services/auth";
import { getStoredSession, saveStoredSession } from "@/shared/auth-storage";

const savedEmailKey = "nvoms.auth.email";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(savedEmailKey) ?? "";
  });
  const [password, setPassword] = useState("");
  const [shouldRememberEmail, setShouldRememberEmail] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      router.replace(
        session.user.mustChangePassword ? "/change-password" : "/dashboard",
      );
    }
  }, [router]);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !isSubmitting,
    [email, password, isSubmitting],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const session = await login(email.trim(), password);
      saveStoredSession(session);

      if (shouldRememberEmail) {
        window.localStorage.setItem(savedEmailKey, email.trim());
      } else {
        window.localStorage.removeItem(savedEmailKey);
      }

      router.replace(
        session.user.mustChangePassword ? "/change-password" : "/dashboard",
      );
    } catch (caughtError) {
      setError(readLoginError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[460px] rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Secure sign in
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Access your workspace
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Use the account issued for your facility, surveillance unit, or
          administrative role.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <label className="block" htmlFor="email">
          <span className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Email address
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 [&>svg]:h-5 [&>svg]:w-5">
              <MailIcon aria-hidden="true" />
            </span>
            <input
              className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              placeholder="name@example.org"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </label>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          autoComplete="current-password"
          placeholder="Enter your password"
          onChange={setPassword}
        />

        <div className="flex flex-col gap-3 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
            <input
              className="h-4 w-4 rounded border-gray-300 accent-brand-600"
              type="checkbox"
              checked={shouldRememberEmail}
              onChange={(event) => setShouldRememberEmail(event.target.checked)}
            />
            <span>Remember email</span>
          </label>
          <span className="sm:text-right">Password resets are handled by admins</span>
        </div>

        {error ? (
          <div
            className="flex items-start gap-3 rounded-lg border border-error-200 bg-error-25 px-4 py-3 text-sm font-medium leading-6 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
            role="alert"
          >
            <span className="mt-0.5 shrink-0 [&>svg]:h-5 [&>svg]:w-5">
              <AlertIcon aria-hidden="true" />
            </span>
            <span>{error}</span>
          </div>
        ) : null}

        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:border-brand-700 hover:bg-brand-600 disabled:cursor-not-allowed disabled:border-brand-300 disabled:bg-brand-300 dark:disabled:border-brand-800 dark:disabled:bg-brand-800"
          disabled={!canSubmit}
          type="submit"
        >
          {isSubmitting ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden="true"
            />
          ) : (
            <span className="[&>svg]:h-4 [&>svg]:w-4">
              <ArrowRightIcon aria-hidden="true" />
            </span>
          )}
          <span>{isSubmitting ? "Signing in" : "Sign in"}</span>
        </button>
      </form>
    </div>
  );
}

function readLoginError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 423) {
      return error.message;
    }

    if (error.status === 401) {
      return "The email or password is incorrect.";
    }

    if (error.status === 403) {
      return "This account is not allowed to sign in.";
    }

    return error.message;
  }

  return "Could not reach the backend. Confirm the API is running on port 8000.";
}
