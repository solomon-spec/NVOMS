"use client";

import { useEffect, useState } from "react";

import { EyeCloseIcon, EyeIcon, LockIcon } from "@/icons";

const PRIVACY_MODE_KEY = "nvoms.privacyMode";
const PRIVACY_MODE_EVENT = "nvoms:privacy-mode-change";

function readPrivacyMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PRIVACY_MODE_KEY) === "on";
}

export function usePrivacyMode() {
  const [isPrivacyMode, setLocalPrivacyMode] = useState(() => readPrivacyMode());

  useEffect(() => {
    const handleChange = () => setLocalPrivacyMode(readPrivacyMode());
    window.addEventListener("storage", handleChange);
    window.addEventListener(PRIVACY_MODE_EVENT, handleChange);

    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(PRIVACY_MODE_EVENT, handleChange);
    };
  }, []);

  function setPrivacyMode(nextValue: boolean) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRIVACY_MODE_KEY, nextValue ? "on" : "off");
      window.dispatchEvent(new Event(PRIVACY_MODE_EVENT));
    }

    setLocalPrivacyMode(nextValue);
  }

  return {
    isPrivacyMode,
    setPrivacyMode,
    togglePrivacyMode: () => setPrivacyMode(!isPrivacyMode),
  };
}

export function PrivacyModeToggle({ className = "" }: { className?: string }) {
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

  return (
    <button
      type="button"
      aria-pressed={isPrivacyMode}
      title={isPrivacyMode ? "Privacy mode is on" : "Privacy mode is off"}
      onClick={togglePrivacyMode}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded border px-3 text-sm font-semibold transition ${
        isPrivacyMode
          ? "border-warning-100 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-200"
          : "border-[var(--nv-border)] bg-[var(--nv-surface)] text-[var(--nv-heading)] hover:bg-[var(--nv-panel)]"
      } ${className}`}
    >
      <span className="relative grid h-4 w-4 place-items-center">
        {isPrivacyMode ? (
          <EyeCloseIcon className="h-4 w-4 fill-current" />
        ) : (
          <EyeIcon className="h-4 w-4 fill-current" />
        )}
      </span>
      <span className="hidden sm:inline">
        {isPrivacyMode ? "Privacy on" : "Privacy off"}
      </span>
    </button>
  );
}

export function PrivacyBoundaryBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border border-brand-100 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-100 ${className}`}
    >
      <LockIcon className="h-3.5 w-3.5 fill-current" />
      Operational access
    </span>
  );
}

export function maskIdentifier(value: string | null | undefined) {
  if (!value) {
    return "Not assigned";
  }

  if (value.length <= 6) {
    return `${value.slice(0, 2)}...`;
  }

  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

export function maskPhone(value: string | null | undefined) {
  if (!value) {
    return "No phone";
  }

  const lastDigits = value.replace(/\D/g, "").slice(-4);
  return lastDigits ? `***-***-${lastDigits}` : "Masked phone";
}

export function privateName(isPrivacyMode: boolean, fallback = "Name hidden") {
  return isPrivacyMode ? fallback : null;
}
