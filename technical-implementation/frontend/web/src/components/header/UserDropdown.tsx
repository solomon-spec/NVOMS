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
        className="dropdown-toggle flex items-center rounded-lg border border-transparent px-2 py-1.5 text-gray-300 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white"
      >
        <span className="mr-3 grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-brand-500/15 text-sm font-semibold text-blue-light-300">
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
        className="enterprise-surface absolute right-0 mt-4 flex w-[260px] flex-col rounded-xl p-3 shadow-theme-lg"
      >
        <div>
          <span className="block font-medium text-gray-100 text-theme-sm">
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
          className="mt-2 flex items-center gap-3 border-t border-white/10 px-3 py-3 font-medium text-warning-400 rounded-lg group text-theme-sm hover:bg-warning-500/10"
        >
          Sign out all devices
        </DropdownItem>

        <DropdownItem
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-3 font-medium text-error-400 rounded-lg group text-theme-sm hover:bg-error-500/10"
        >
          Sign out
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
