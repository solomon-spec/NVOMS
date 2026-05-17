"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/features/auth/useAuthSession";

type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

const RoleNavs: Record<string, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/" },
    { label: "Patients", href: "/patients" },
    { label: "Immunizations", href: "/immunizations" },
    { label: "Case Reports", href: "/outbreaks" },
    { label: "Reports", href: "/reports" },
    { label: "Notifications", href: "/notifications" },
    { label: "Admin Console", href: "/admin" },
    { label: "System Settings", href: "/settings" },
    { label: "Interoperability", href: "/settings/interoperability" },
  ],
  HEALTH_WORKER: [
    { label: "Today", href: "/" },
    { label: "Patients", href: "/patients" },
    { label: "Immunizations", href: "/immunizations" },
    { label: "Case Reports", href: "/outbreaks" },
    { label: "Notifications", href: "/notifications" },
    { label: "Offline Queue", href: "/offline-queue" },
  ],
  PUBLIC_HEALTH_OFFICER: [
    { label: "Dashboard", href: "/" },
    { label: "Public Health Hub", href: "/public-health" },
    { label: "Case Reports", href: "/outbreaks" },
    { label: "Reports", href: "/reports" },
    { label: "Notifications", href: "/notifications" },
  ],
  PATIENT: [
    { label: "My Vaccination Card", href: "/self-service" },
    { label: "QR ID", href: "/self-service/qr" },
    { label: "Upcoming Doses", href: "/self-service/timeline" },
    { label: "Alerts", href: "/self-service/alerts" },
  ],
};

export function RoleBasedSidebar() {
  const pathname = usePathname();
  const session = useAuthSession();

  const role = session?.user?.role || "HEALTH_WORKER"; // Default for development if needed
  const navItems = RoleNavs[role] || RoleNavs.HEALTH_WORKER;

  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
          NVOMS
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors">
          Log out
        </button>
      </div>
    </aside>
  );
}
