"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAuthSession } from "@/features/auth/useAuthSession";
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
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  roles?: string[];
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <BoxCubeIcon />,
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    icon: <GroupIcon />,
    name: "Patient Registry",
    path: "/patients",
    roles: ["ADMIN", "HEALTH_WORKER"],
  },
  {
    icon: <GroupIcon />,
    name: "My Record",
    path: "/my-patient",
    roles: ["PATIENT"],
  },
  {
    icon: <CalenderIcon />,
    name: "Immunization",
    path: "/immunizations",
    roles: ["ADMIN", "HEALTH_WORKER"],
  },
  {
    icon: <TaskIcon />,
    name: "Surveillance",
    path: "/surveillance",
    roles: ["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <PieChartIcon />,
    name: "Analytics",
    path: "/analytics",
    roles: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <DocsIcon />,
    name: "Reports",
    path: "/reports",
    roles: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <BellIcon />,
    name: "Notifications",
    path: "/notifications",
    roles: ["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <ListIcon />,
    name: "Offline Sync",
    path: "/offline",
    roles: ["ADMIN", "HEALTH_WORKER"],
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
    path === pathname || pathname.startsWith(`${path}/`);

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
        <Link href="/dashboard">
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
          <div className="mt-auto space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                Signed in
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-white">
                {session?.user.displayName}
              </p>
              <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                {session?.user.facilityCode ?? session?.user.role}
              </p>
            </div>
            <SidebarWidget />
          </div>
        ) : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
