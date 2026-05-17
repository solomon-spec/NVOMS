"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PasswordField } from "@/features/auth/PasswordField";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { AlertIcon, ArrowRightIcon, CheckCircleIcon, CloseLineIcon } from "@/icons";
import { ApiError } from "@/services/api";
import { changePassword } from "@/services/auth";
import {
  clearStoredSession,
  updateStoredTokens,
} from "@/shared/auth-storage";

export function ChangePasswordForm() {
  const router = useRouter();
  const session = useAuthSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
    }
  }, [router, session]);

  const passwordChecks = useMemo(
    () => [
      { label: "At least 8 characters", met: newPassword.length >= 8 },
      {
        label: "Different from current password",
        met: currentPassword.length > 0 && currentPassword !== newPassword,
      },
      {
        label: "Confirmation matches",
        met: confirmPassword.length > 0 && confirmPassword === newPassword,
      },
    ],
    [confirmPassword, currentPassword, newPassword],
  );

  const canSubmit =
    Boolean(session?.tokens.accessToken) &&
    passwordChecks.every((check) => check.met) &&
    !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await changePassword({
        currentPassword,
        newPassword,
        accessToken: session?.tokens.accessToken ?? "",
      });
      updateStoredTokens(response.tokens);
      router.replace("/");
    } catch (caughtError) {
      setError(readChangePasswordError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignOut() {
    clearStoredSession();
    router.replace("/login");
  }

  return (
    <div className="w-full max-w-[500px] rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Password update
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Set your permanent password
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Some new accounts require this step before clinical and public health
          tools are available.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <PasswordField
          id="current-password"
          label="Current password"
          value={currentPassword}
          autoComplete="current-password"
          placeholder="Temporary or current password"
          onChange={setCurrentPassword}
        />

        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          autoComplete="new-password"
          placeholder="Create a new password"
          onChange={setNewPassword}
        />

        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          autoComplete="new-password"
          placeholder="Repeat the new password"
          onChange={setConfirmPassword}
        />

        <div
          className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
          aria-label="Password requirements"
        >
          {passwordChecks.map((check) => (
            <span
              className={`inline-flex items-center gap-2 ${
                check.met
                  ? "font-semibold text-success-700 dark:text-success-400"
                  : ""
              }`}
              key={check.label}
            >
              <span
                className={`[&>svg]:h-4 [&>svg]:w-4 ${
                  check.met
                    ? "text-success-600 dark:text-success-400"
                    : "text-gray-400 dark:text-gray-600"
                }`}
              >
                <CheckCircleIcon aria-hidden="true" />
              </span>
              {check.label}
            </span>
          ))}
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

        <div className="grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            type="button"
            onClick={handleSignOut}
          >
            <span className="[&>svg]:h-4 [&>svg]:w-4">
              <CloseLineIcon aria-hidden="true" />
            </span>
            <span>Sign out</span>
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:border-brand-700 hover:bg-brand-600 disabled:cursor-not-allowed disabled:border-brand-300 disabled:bg-brand-300 dark:disabled:border-brand-800 dark:disabled:bg-brand-800"
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
            <span>{isSubmitting ? "Updating" : "Update password"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function readChangePasswordError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "The current password is incorrect or your session has expired.";
    }

    if (error.status === 422 || error.status === 400) {
      return error.message;
    }

    return error.message;
  }

  return "Could not update the password. Confirm the API is still running.";
}
