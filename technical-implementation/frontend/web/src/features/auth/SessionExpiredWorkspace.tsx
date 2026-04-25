import React from "react";
import { TimeIcon } from "@/icons";
import AuthStatusCard from "./components/AuthStatusCard";

export default function SessionExpiredWorkspace() {
  return (
    <AuthStatusCard
      eyebrow="Session"
      title="Session expired"
      description="Your secure session has ended due to inactivity or token timeout. Sign in again to continue your work."
      icon={<TimeIcon className="h-6 w-6 fill-current" />}
      actions={[
        { href: "/auth/sign-in", label: "Sign In Again" },
        { href: "/auth/forgot-password", label: "Need Help Accessing?", variant: "outline" },
      ]}
    />
  );
}
