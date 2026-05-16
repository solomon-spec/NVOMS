"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { logout, logoutAll } from "@/services/auth";
import { clearStoredSession } from "@/shared/auth-storage";
import { formatRole } from "@/shared/format";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

export default function UserDropdown() {
  const router = useRouter();
  const session = useAuthSession();
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function handleSignOut() {
    closeDropdown();
    clearStoredSession();
    router.replace("/login");

    if (session) {
      try {
        await logout(session);
      } catch {
        // Local sign out should not depend on the API being reachable.
      }
    }
  }

  async function handleSignOutAll() {
    closeDropdown();
    clearStoredSession();
    router.replace("/login");

    if (session) {
      try {
        await logoutAll(session);
      } catch {
        // Local sign out should not depend on the API being reachable.
      }
    }
  }

  const displayName = session?.user.displayName ?? "NVOMS user";
  const displayEmail = session?.user.email ?? "workspace@nvoms.local";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center rounded border border-transparent px-2 py-1.5 text-[var(--nv-text)] transition-colors hover:border-[var(--nv-border)] hover:bg-[var(--nv-panel)]"
      >
        <span className="mr-3 grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[var(--nv-border)] bg-[var(--nv-panel-strong)] text-sm font-semibold text-[var(--nv-heading)]">
          {initials}
        </span>

        <span className="block mr-1 max-w-[120px] truncate font-medium text-theme-sm">
          {displayName}
        </span>

        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="enterprise-surface absolute right-0 mt-4 flex w-[260px] flex-col rounded p-3"
      >
        <div>
        <span className="block font-medium text-[var(--nv-text)] text-theme-sm">
            {displayName}
          </span>
          <span className="enterprise-muted mt-0.5 block text-theme-xs">
            {displayEmail}
          </span>
          <span className="enterprise-muted mt-1 block text-theme-xs">
            {session ? formatRole(session.user.role) : "Authenticated user"}
          </span>
        </div>

        <DropdownItem
          onClick={handleSignOutAll}
          className="mt-2 flex items-center gap-3 border-t border-[var(--nv-border)] px-3 py-3 font-medium text-warning-700 rounded group text-theme-sm hover:bg-warning-50 dark:text-warning-300 dark:hover:bg-warning-500/10"
        >
          Sign out all devices
        </DropdownItem>

        <DropdownItem
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-3 font-medium text-error-700 rounded group text-theme-sm hover:bg-error-50 dark:text-error-300 dark:hover:bg-error-500/10"
        >
          Sign out
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
