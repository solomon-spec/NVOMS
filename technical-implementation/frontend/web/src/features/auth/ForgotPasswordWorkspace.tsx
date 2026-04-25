"use client";

import Link from "next/link";
import React, { useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { MailIcon } from "@/icons";
import AuthPageFrame from "./components/AuthPageFrame";

export default function ForgotPasswordWorkspace() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter the email address linked to your NVOMS account.");
      setSubmitted(false);
      return;
    }

    setError("");
    setSubmitted(true);
  };

  return (
    <AuthPageFrame
      eyebrow="Account Recovery"
      title="Reset your password"
      description="We will send a password reset link to the email address associated with your account."
      backHref="/auth/sign-in"
      backLabel="Back to sign in"
      footer={
        <p className="text-sm text-gray-500">
          If you no longer have access to your work email, contact your system
          administrator to restore access.
        </p>
      }
    >
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
          <div className="rounded-lg border border-error-200 bg-error-25 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        ) : null}

        {submitted ? (
          <div className="rounded-lg border border-success-200 bg-success-25 px-4 py-3 text-sm leading-6 text-success-700">
            A reset link has been prepared for <strong>{email}</strong>. In the
            live backend flow, this is where the email dispatch will connect.
          </div>
        ) : null}

        <div className="space-y-3">
          <Button className="w-full">Send Reset Link</Button>
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
