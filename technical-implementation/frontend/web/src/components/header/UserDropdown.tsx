"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { logout } from "@/services/auth";
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
        className="dropdown-toggle flex items-center rounded-lg border border-transparent px-2 py-1.5 text-gray-700 transition-colors hover:border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:hover:border-gray-800 dark:hover:bg-white/5"
      >
        <span className="mr-3 grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
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
        className="absolute right-0 mt-4 flex w-[260px] flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {displayName}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {displayEmail}
          </span>
          <span className="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">
            {session ? formatRole(session.user.role) : "Authenticated user"}
          </span>
        </div>

        <DropdownItem
          onClick={handleSignOut}
          className="mt-4 flex items-center gap-3 border-t border-gray-200 px-3 py-3 font-medium text-error-700 rounded-lg group text-theme-sm hover:bg-error-50 dark:border-gray-800"
        >
          Sign out
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
