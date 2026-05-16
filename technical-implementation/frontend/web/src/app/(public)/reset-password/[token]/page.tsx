"use client";

import { useRouter, useParams } from "next/navigation";
import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { LockIcon, EyeIcon, EyeCloseIcon } from "@/icons";
import AuthPageFrame from "@/features/auth/components/AuthPageFrame";
import { AuthShell } from "@/features/auth/AuthShell";
import { confirmPasswordReset } from "@/services/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim()) {
      setError("Please enter a new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await confirmPasswordReset(token, password);
      router.push("/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthPageFrame
        eyebrow="Account setup"
        title="Set New Password"
        description="Choose a new permanent password for your NVOMS account."
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
                  placeholder="Enter new password"
                  className="pl-11 pr-11"
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeIcon className="h-5 w-5 fill-current" /> : <EyeCloseIcon className="h-5 w-5 fill-current" />}
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
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  className="pl-11"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-300">
              {error}
            </div>
          ) : null}

          <Button className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Set Password"}
          </Button>
        </form>
      </AuthPageFrame>
    </AuthShell>
  );
}
