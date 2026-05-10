"use client";

import React from "react";
import { ProtectedRoute } from "@/components/app-shell/ProtectedRoute";
import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import Backdrop from "@/components/layout/Backdrop";
import { useSidebar } from "@/context/SidebarContext";
import { ToastProvider } from "@/shared/workspace-ui";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "pl-0"
    : isExpanded || isHovered
      ? "lg:pl-[220px]"
      : "lg:pl-[76px]";

  return (
    <ProtectedRoute>
      <ToastProvider>
        <div className="enterprise-shell xl:flex">
          <AppSidebar />
          <Backdrop />
          <div
            className={`min-w-0 flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
          >
            <AppHeader />
            <main className="mx-auto max-w-[1600px] p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </ProtectedRoute>
  );
}
