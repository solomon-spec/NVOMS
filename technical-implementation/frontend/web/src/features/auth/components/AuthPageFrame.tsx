import Link from "next/link";
import React from "react";
import { ChevronLeftIcon } from "@/icons";

type AuthPageFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  footer?: React.ReactNode;
};

export default function AuthPageFrame({
  eyebrow,
  title,
  description,
  children,
  backHref,
  backLabel,
  footer,
}: AuthPageFrameProps) {
  return (
    <div className="w-full max-w-lg">
      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ChevronLeftIcon />
          {backLabel}
        </Link>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-[34px]">
          {title}
        </h1>
        <p className="max-w-md text-sm leading-6 text-gray-500">{description}</p>
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-theme-xs sm:p-8">
        {children}
      </div>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}
