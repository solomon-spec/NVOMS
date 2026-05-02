import React from "react";

export default function SidebarWidget() {
  return (
    <div
      className={`
        mx-auto mb-8 w-full max-w-60 rounded-xl border border-gray-200 bg-white px-4 py-5 text-left shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]`}
    >
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-gray-700 dark:text-white">
        Workspace Scope
      </h3>
      <p className="mb-4 text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        Navigation is filtered by role so each signed-in user sees the modules
        available for their operational responsibilities.
      </p>
      <div className="rounded-lg border border-brand-100 bg-brand-25 px-3 py-2 text-sm font-medium text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400">
        Registry, immunization, surveillance, and reporting share one session.
      </div>
    </div>
  );
}
