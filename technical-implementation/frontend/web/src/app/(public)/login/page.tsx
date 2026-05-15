"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon, LockIcon, MailIcon } from "@/icons";
import AuthPageFrame from "@/features/auth/components/AuthPageFrame";
import { AuthShell } from "@/features/auth/AuthShell";
import { saveStoredSession } from "@/shared/auth-storage";
import { login } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Enter both your work email and password to continue.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const loginResponse = await login(email, password);
      saveStoredSession(loginResponse);

      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthPageFrame
        eyebrow="Secure Access"
        title="Sign in to NVOMS"
        description="Use your assigned facility or district account to continue into the vaccination and outbreak monitoring workspace."
        footer={
          <div className="space-y-3 text-sm leading-6 text-[#545f72]">
            <p>
              New accounts are provisioned by an administrator. If you need access,
              contact your system administrator or district focal person.
            </p>
          </div>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <Label>Email Address</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <MailIcon className="h-5 w-5 fill-current" />
                </span>
                <Input
                  type="email"
                  name="email"
                  placeholder="name@facility.gov.et"
                  className="pl-11"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-brand-700 transition-colors hover:text-brand-600"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <LockIcon className="h-5 w-5 fill-current" />
                </span>
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  className="pl-11 pr-11"
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
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
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Checkbox
              checked={rememberMe}
              onChange={setRememberMe}
              label="Keep me signed in on this device"
            />
          </div>

          {error ? (
            <div className="rounded border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </div>
        </form>
      </AuthPageFrame>
    </AuthShell>
  );
}
