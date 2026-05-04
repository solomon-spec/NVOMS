"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ── Toast System ──────────────────────────────────────────────────────────────

type ToastTone = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  addToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const toneCls: Record<ToastTone, string> = {
    success:
      "border-success-200 bg-success-50 text-success-800 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-200",
    error:
      "border-error-200 bg-error-50 text-error-800 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-200",
    warning:
      "border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-200",
    info: "border-brand-100 bg-brand-50 text-brand-800 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200",
  };

  const icons: Record<ToastTone, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in slide-in-from-right-4 ${toneCls[toast.tone]}`}
          >
            <span className="mt-px shrink-0 font-bold">{icons[toast.tone]}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: (message: string) => {
        console.warn("[useToast] No ToastProvider found.", message);
      },
    };
  }
  return ctx;
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  isLoading = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
  tone = "danger",
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const confirmCls =
    tone === "danger"
      ? "bg-error-600 hover:bg-error-700 text-white"
      : "bg-warning-500 hover:bg-warning-600 text-white";

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl backdrop:bg-black/50 dark:border-gray-700 dark:bg-gray-900"
      onCancel={onCancel}
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          disabled={isLoading}
          type="button"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold shadow-theme-xs transition disabled:opacity-60 ${confirmCls}`}
          disabled={isLoading}
          type="button"
          onClick={onConfirm}
        >
          {isLoading ? "Processing…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────

export function AlertBanner({
  children,
  count,
  tone = "error",
}: {
  children: ReactNode;
  count?: number;
  tone?: "error" | "warning";
}) {
  const cls =
    tone === "error"
      ? "border-error-200 bg-error-50 text-error-800 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200"
      : "border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200";

  const icon = tone === "error" ? "🚨" : "⚠️";

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-5 py-4 ${cls}`} role="alert">
      <span className="text-xl">{icon}</span>
      <div className="flex-1 text-sm font-medium">{children}</div>
      {count !== undefined && (
        <span className="ml-auto shrink-0 rounded-full bg-current/10 px-2.5 py-0.5 text-xs font-bold">
          {count}
        </span>
      )}
    </div>
  );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────

export function ProgressRing({
  label,
  size = 80,
  strokeWidth = 8,
  tone = "brand",
  value,
}: {
  value: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  tone?: "brand" | "success" | "warning" | "error";
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  const colorMap = {
    brand: "stroke-brand-600",
    success: "stroke-success-500",
    warning: "stroke-warning-500",
    error: "stroke-error-500",
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-gray-100 dark:stroke-gray-800"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-700 ${colorMap[tone]}`}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-bold text-gray-900 dark:text-white">{value}%</span>
        {label && <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-tight">{label}</span>}
      </div>
    </div>
  );
}

// ── Trend Badge ───────────────────────────────────────────────────────────────

export function TrendBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const isUp = value > 0;
  const cls = isUp
    ? "text-success-700 bg-success-50 dark:text-success-300 dark:bg-success-500/10"
    : "text-error-700 bg-error-50 dark:text-error-300 dark:bg-error-500/10";
  const arrow = isUp ? "↑" : "↓";

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {arrow} {Math.abs(value)}{suffix}
    </span>
  );
}

// ── Timeline Item ─────────────────────────────────────────────────────────────

export function TimelineItem({
  date,
  description,
  isLast = false,
  title,
  tone = "brand",
}: {
  title: string;
  date: string;
  description?: string;
  isLast?: boolean;
  tone?: "brand" | "success" | "warning" | "error" | "gray";
}) {
  const dotCls = {
    brand: "bg-brand-600",
    success: "bg-success-500",
    warning: "bg-warning-500",
    error: "bg-error-500",
    gray: "bg-gray-400",
  };

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${dotCls[tone]}`} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-800" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{date}</p>
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-gray-100 dark:bg-gray-800"
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  trend?: number;
  icon?: string;
  tone?: "brand" | "success" | "warning" | "error";
};

export function MetricCard({ detail, icon, label, tone, trend, value }: MetricCardProps) {
  const toneBg = tone
    ? {
        brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
        success: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
        warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
        error: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
      }[tone]
    : "";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${toneBg}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {trend !== undefined && <TrendBadge value={trend} />}
        {detail && <p className="text-xs text-gray-500 dark:text-gray-400">{detail}</p>}
      </div>
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
  icon,
}: {
  children: ReactNode;
  className?: string;
  icon?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-white/[0.02] ${className}`}
    >
      {icon && <span className="mb-3 text-3xl">{icon}</span>}
      <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
    </div>
  );
}
