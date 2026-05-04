"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAuthSession } from "@/features/auth/useAuthSession";
import { clearStoredSession } from "@/shared/auth-storage";
import {
  BellIcon,
  BoxCubeIcon,
  CalenderIcon,
  DocsIcon,
  GroupIcon,
  ListIcon,
  PieChartIcon,
  TaskIcon,
} from "@/icons";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  roles?: string[];
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  // Shared / Role-specific home
  {
    icon: <BoxCubeIcon />,
    name: "Dashboard",
    path: "/",
    roles: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Today",
    path: "/",
    roles: ["HEALTH_WORKER"],
  },
  {
    icon: <DocsIcon />,
    name: "My Vaccination Card",
    path: "/self-service",
    roles: ["PATIENT"],
  },

  // Patient Self Service (PATIENT)
  {
    icon: <GroupIcon />,
    name: "QR ID",
    path: "/self-service/qr",
    roles: ["PATIENT"],
  },
  {
    icon: <CalenderIcon />,
    name: "Upcoming Doses",
    path: "/self-service/timeline",
    roles: ["PATIENT"],
  },
  {
    icon: <BellIcon />,
    name: "Alerts",
    path: "/self-service/alerts",
    roles: ["PATIENT"],
  },

  // Clinical Operations (HEALTH WORKER / ADMIN)
  {
    icon: <GroupIcon />,
    name: "Patients",
    path: "/patients",
    roles: ["ADMIN", "HEALTH_WORKER"],
  },
  {
    icon: <CalenderIcon />,
    name: "Immunizations",
    path: "/immunizations",
    roles: ["ADMIN", "HEALTH_WORKER"],
  },
  
  // Public Health Monitoring (PHO / ADMIN / HW)
  {
    icon: <PieChartIcon />,
    name: "Risk Map",
    path: "/risk-map",
    roles: ["PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <TaskIcon />,
    name: "Surveillance",
    path: "/surveillance",
    roles: ["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <GroupIcon />,
    name: "Defaulter Clusters",
    path: "/defaulters",
    roles: ["PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <DocsIcon />,
    name: "Reports",
    path: "/reports",
    roles: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
  },

  // Notifications (Shared)
  {
    icon: <BellIcon />,
    name: "Notifications",
    path: "/notifications",
    roles: ["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"],
  },

  // HW specific
  {
    icon: <ListIcon />,
    name: "Offline Queue",
    path: "/offline-queue",
    roles: ["HEALTH_WORKER"],
  },

  // Administration (ADMIN)
  {
    icon: <GroupIcon />,
    name: "Admin Console",
    path: "/admin",
    roles: ["ADMIN"],
  },
  {
    icon: <BoxCubeIcon />,
    name: "System Settings",
    path: "/settings",
    roles: ["ADMIN"],
  },
  {
    icon: <TaskIcon />,
    name: "Interoperability",
    path: "/settings/interoperability",
    roles: ["ADMIN"],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const session = useAuthSession();
  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(session?.user.role ?? ""),
  );

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        <li key={nav.name}>
          {nav.path && (
            <Link
              href={nav.path}
              className={`menu-item group ${
                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
              }`}
            >
              <span
                className={`${
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  const isActive = (path: string) =>
    path === "/"
      ? pathname === "/"
      : path === pathname || pathname.startsWith(`${path}/`);

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-gray-50 px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="NVOMS"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="NVOMS"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="NVOMS"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <h2
            className={`mb-4 flex text-[11px] font-semibold uppercase tracking-[0.12em] leading-[20px] text-gray-500 ${
              !isExpanded && !isHovered
                ? "lg:justify-center"
                : "justify-start"
            }`}
          >
            {isExpanded || isHovered || isMobileOpen ? "Workspace" : "..."}
          </h2>
          {renderMenuItems(visibleNavItems)}
        </nav>
        {isExpanded || isHovered || isMobileOpen ? (
          <div className="mt-auto p-4">
            <button
              onClick={() => clearStoredSession()}
              className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-red-700 dark:border-gray-800 dark:bg-gray-900 dark:text-red-500 dark:hover:bg-gray-800/50 dark:hover:text-red-400"
            >
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
