"use client";

import React from "react";
import { useAuthSession } from "@/features/auth/useAuthSession";

export default function DashboardPage() {
  const session = useAuthSession();
  const role = session?.user?.role || "UNKNOWN";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          You are logged in as <span className="font-semibold">{role}</span>.
        </p>
      </header>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Dashboard
        </h2>
      </div>
    </div>
  );
}
