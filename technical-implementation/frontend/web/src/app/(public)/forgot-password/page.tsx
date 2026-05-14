"use client";

import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { MailIcon } from "@/icons";
import AuthPageFrame from "@/features/auth/components/AuthPageFrame";
import { AuthShell } from "@/features/auth/AuthShell";
import { requestPasswordReset } from "@/services/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch {
      // Show neutral success message even on error
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthPageFrame
        eyebrow="Recovery"
        title="Reset Password"
        description="Enter your registered email address to receive password reset instructions."
        backHref="/login"
        backLabel="Back to login"
      >
        {success ? (
          <div className="rounded-lg border border-success-500/30 bg-success-500/10 px-4 py-6 text-center text-sm text-success-500">
            <h3 className="mb-2 text-lg font-semibold">Check your inbox</h3>
            <p className="mt-2 text-gray-400">
              If the account exists, a reset link has been sent to {email}.
            </p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
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

            {error ? (
              <div className="rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-300">
                {error}
              </div>
            ) : null}

            <Button className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}
      </AuthPageFrame>
    </AuthShell>
  );
}
