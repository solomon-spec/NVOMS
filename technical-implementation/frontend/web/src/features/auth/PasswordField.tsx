"use client";

import { useState } from "react";

import { EyeCloseIcon, EyeIcon, LockIcon } from "@/icons";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function PasswordField({
  id,
  label,
  value,
  autoComplete,
  placeholder,
  onChange,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 [&>svg]:h-5 [&>svg]:w-5">
          <LockIcon aria-hidden="true" />
        </span>
        <input
          className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-12 text-sm text-gray-900 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.05] dark:hover:text-gray-300 [&>svg]:h-5 [&>svg]:w-5"
          type="button"
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? (
            <EyeCloseIcon aria-hidden="true" />
          ) : (
            <EyeIcon aria-hidden="true" />
          )}
        </button>
      </div>
    </label>
  );
}
