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
        { href: "/auth/sign-in", label: "Return to Sign In" },
        { href: "/all-components", label: "Open Component Library", variant: "outline" },
      ]}
    />
  );
}
