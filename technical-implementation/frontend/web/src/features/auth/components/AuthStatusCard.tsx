import Link from "next/link";
import React from "react";

type AuthStatusAction = {
  href: string;
  label: string;
  variant?: "primary" | "outline";
};

type AuthStatusCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  actions: AuthStatusAction[];
};

export default function AuthStatusCard({
  eyebrow,
  title,
  description,
  icon,
  actions,
}: AuthStatusCardProps) {
  return (
    <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-theme-xs">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-brand-100 bg-brand-25 text-brand-600">
        {icon}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="max-w-md text-sm leading-6 text-gray-500">{description}</p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={
              action.variant === "outline"
                ? "inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 hover:text-gray-900 sm:w-auto sm:min-w-[168px]"
                : "inline-flex w-full items-center justify-center rounded-lg border border-brand-600 bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition hover:border-brand-700 hover:bg-brand-600 sm:w-auto sm:min-w-[168px]"
            }
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
