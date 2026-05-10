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
    <div className="enterprise-surface w-full overflow-hidden rounded-lg">
      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ChevronLeftIcon />
          {backLabel}
        </Link>
      ) : null}

      <div className="px-8 pt-8 text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-blue-light-400/30 bg-white/5 text-2xl font-bold text-blue-light-200">
            N
          </span>
          <span className="text-3xl font-semibold text-white">NVOMS</span>
        </div>
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase text-gray-400">
          {eyebrow}
          </p>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <h1 className="sr-only">{title}</h1>
        <p className="text-left text-base leading-7 text-gray-100">{description}</p>
      </div>

      <div className="p-8 pt-6">
        {children}
      </div>

      {footer ? (
        <div className="border-t border-white/10 bg-white/[0.025] px-8 py-5 text-center">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
