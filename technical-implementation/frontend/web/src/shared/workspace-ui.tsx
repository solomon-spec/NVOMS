import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function MetricCard({ detail, label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
      ) : null}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "brand",
}: {
  label: string;
  tone?: "brand" | "success" | "warning" | "error" | "gray";
}) {
  const tones = {
    brand:
      "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    success:
      "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300",
    warning:
      "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300",
    error:
      "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

export function InlineError({
  className = "",
  message,
}: {
  className?: string;
  message: string;
}) {
  return (
    <div
      className={`rounded-lg border border-error-200 bg-error-25 px-4 py-3 text-sm font-medium text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300 ${className}`}
    >
      {message}
    </div>
  );
}

export function Notice({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "brand";
}) {
  const tones = {
    success:
      "border-success-200 bg-success-25 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300",
    warning:
      "border-warning-200 bg-warning-25 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300",
    brand:
      "border-brand-100 bg-brand-50 text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300",
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tones[tone]}`}>
      {children}
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

export function TextInput({
  label,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: TextInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <input
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type SelectInputProps = {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
};

export function SelectInput({
  label,
  onChange,
  options,
  value,
}: SelectInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <select
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextAreaInputProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function TextAreaInput({
  label,
  onChange,
  placeholder,
  value,
}: TextAreaInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <textarea
        className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function EmptyState({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 ${className}`}
    >
      {children}
    </div>
  );
}
