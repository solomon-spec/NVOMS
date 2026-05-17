import React from "react";
import { LockIcon } from "@/icons";
import AuthStatusCard from "./components/AuthStatusCard";

export default function AccessDeniedWorkspace() {
  return (
    <AuthStatusCard
      eyebrow="Authorization"
      title="Access denied"
      description="Your account is signed in, but it does not currently have permission to open this workspace. Request the correct role assignment from an administrator."
      icon={<LockIcon className="h-6 w-6 fill-current" />}
      actions={[
        { href: "/login", label: "Return to sign in" },
        { href: "/", label: "Go to dashboard", variant: "outline" },
      ]}
    />
  );
}
