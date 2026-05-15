"use client";

import React from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";

export function GlobalHeader() {
  const session = useAuthSession();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16">
      <div className="flex items-center gap-4">
        {/* Left side, possibly breadcrumbs or mobile menu toggle */}
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">NVOMS</h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Indicators */}
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
          <span className="text-gray-600 dark:text-gray-300">Online</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
          <span>0</span>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-6">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {session?.user?.displayName || "User Name"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {session?.user?.role?.replace("_", " ").toLowerCase() || "Role"}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-sm">
            {session?.user?.displayName?.charAt(0) || "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
