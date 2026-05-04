"use client";

import React, { useState } from "react";
import UsersTab from "./components/UsersTab";
import RolesTab from "./components/RolesTab";
import FacilitiesTab from "./components/FacilitiesTab";
import AdminUnitsTab from "./components/AdminUnitsTab";
import { useAuthSession } from "@/features/auth/useAuthSession";

type TabId = "users" | "roles" | "facilities" | "admin-units" | "settings" | "audit";

const tabs: Array<{ id: TabId; label: string; badge?: string }> = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles" },
  { id: "facilities", label: "Facilities" },
  { id: "admin-units", label: "Administrative Units" },
  { id: "settings", label: "System Settings" },
  { id: "audit", label: "Audit Logs" },
];

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<TabId>("users");
  const session = useAuthSession();

  if (session && session.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            You must be an administrator to access this console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Administration
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Admin Console
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Manage users, roles, facilities, administrative units, and system configuration.
        </p>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 dark:border-gray-800">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Admin tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative whitespace-nowrap border-b-2 px-4 py-4 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "users" && <UsersTab />}
          {activeTab === "roles" && <RolesTab />}
          {activeTab === "facilities" && <FacilitiesTab />}
          {activeTab === "admin-units" && <AdminUnitsTab />}
          {activeTab === "settings" && <SystemSettingsStub />}
          {activeTab === "audit" && <AuditLogsStub />}
        </div>
      </div>
    </div>
  );
}

function SystemSettingsStub() {
  const settings = [
    {
      title: "SMS Gateway",
      description: "Configure Twilio or Africa's Talking SMS credentials for vaccination reminders and outbreak alerts.",
      icon: "📱",
      status: "Not configured",
    },
    {
      title: "EPI Schedule Management",
      description: "Manage active EPI schedule versions and vaccine dose rules. Use the vaccination schedule page for this.",
      icon: "📋",
      status: "Use Immunization module",
    },
    {
      title: "DHIS2 Integration",
      description: "Configure DHIS2 sync credentials to push vaccination records to the national HMIS.",
      icon: "🔗",
      status: "Not implemented",
    },
    {
      title: "FHIR Exchange",
      description: "Configure FHIR R4 endpoint for interoperability with external health systems.",
      icon: "⚕️",
      status: "Not implemented",
    },
    {
      title: "Notification Templates",
      description: "Manage SMS and email message templates for reminders, alerts, and account notifications.",
      icon: "✉️",
      status: "Not implemented",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Settings</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          System-level configuration. Backend support is required before these settings can be managed through this console.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {settings.map((setting) => (
          <div
            key={setting.title}
            className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-white/[0.02]"
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl">{setting.icon}</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{setting.title}</h3>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{setting.description}</p>
                <span className="mt-3 inline-flex rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">
                  {setting.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogsStub() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Logs</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          A record of all administrative actions taken in the system. Requires a backend audit log endpoint.
        </p>
      </div>
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-white/[0.02]">
        <span className="text-4xl">📜</span>
        <h3 className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Audit log endpoint not yet available</h3>
        <p className="mt-2 max-w-xs text-xs text-gray-500 dark:text-gray-400">
          When the backend exposes a{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">/api/v1/audit-logs/</code> endpoint,
          this panel will display user login events, data changes, and administrative actions with timestamps.
        </p>
      </div>
    </div>
  );
}
