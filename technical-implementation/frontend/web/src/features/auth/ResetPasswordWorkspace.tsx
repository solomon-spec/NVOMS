"use client";

import Link from "next/link";
import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon, LockIcon } from "@/icons";
import AuthPageFrame from "./components/AuthPageFrame";

export default function ResetPasswordWorkspace() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Enter and confirm your new password to continue.");
      setComplete(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("The two password entries do not match.");
      setComplete(false);
      return;
    }

    setError("");
    setComplete(true);
  };

  return (
    <AuthPageFrame
      eyebrow="New Credentials"
      title="Create a new password"
      description="Choose a strong password for your NVOMS account. This demo flow stores no credentials yet."
      backHref="/auth/sign-in"
      backLabel="Back to sign in"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <div>
            <Label>New Password</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <LockIcon className="h-5 w-5 fill-current" />
              </span>
              <Input
                type={showPassword ? "text" : "password"}
                name="new-password"
                placeholder="Create a new password"
                className="pl-11 pr-11"
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeIcon className="h-5 w-5 fill-current" />
                ) : (
                  <EyeCloseIcon className="h-5 w-5 fill-current" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label>Confirm Password</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <LockIcon className="h-5 w-5 fill-current" />
              </span>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm-password"
                placeholder="Re-enter your new password"
                className="pl-11 pr-11"
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((current) => !current)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeIcon className="h-5 w-5 fill-current" />
                ) : (
                  <EyeCloseIcon className="h-5 w-5 fill-current" />
                )}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-error-200 bg-error-25 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        ) : null}

        {complete ? (
          <div className="rounded-lg border border-success-200 bg-success-25 px-4 py-3 text-sm leading-6 text-success-700">
            Your password update has been staged successfully. Connect this page
            to the backend reset endpoint to complete the live flow.
          </div>
        ) : null}

        <div className="space-y-3">
          <Button className="w-full">Update Password</Button>
          <Link
            href="/auth/sign-in"
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 hover:text-gray-900"
          >
            Return to Sign In
          </Link>
        </div>
      </form>
    </AuthPageFrame>
  );
}
