"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
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
    roles: ["PATIENT", "CAREGIVER"],
  },

  // Patient Self Service (PATIENT)
  {
    icon: <GroupIcon />,
    name: "QR ID",
    path: "/self-service/qr",
    roles: ["PATIENT", "CAREGIVER"],
  },
  {
    icon: <CalenderIcon />,
    name: "Upcoming Doses",
    path: "/self-service/timeline",
    roles: ["PATIENT", "CAREGIVER"],
  },
  {
    icon: <BellIcon />,
    name: "Alerts",
    path: "/self-service/alerts",
    roles: ["PATIENT", "CAREGIVER"],
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
    name: "Public Health Hub",
    path: "/public-health",
    roles: ["ADMIN", "PUBLIC_HEALTH_OFFICIAL"],
  },
  {
    icon: <TaskIcon />,
    name: "Case Reports",
    path: "/outbreaks",
    roles: ["ADMIN", "HEALTH_WORKER", "PUBLIC_HEALTH_OFFICIAL"],
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
  const router = useRouter();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const session = useAuthSession();
  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(session?.user.role ?? ""),
  );

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-2">
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
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-[var(--nv-border)] bg-[var(--nv-panel)] px-5 text-[var(--nv-text)] transition-all duration-300 ease-in-out lg:mt-0
        ${
          isExpanded || isMobileOpen
            ? "w-[220px]"
            : isHovered
            ? "w-[220px]"
            : "w-[76px]"
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
        <Link href="/" className="flex items-center gap-3">
          {isExpanded || isHovered || isMobileOpen ? (
              <span className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded border border-[var(--nv-border)] bg-[var(--nv-surface)] text-[var(--nv-heading)]">
                <GroupIcon className="h-4 w-4" />
              </span>
              <span className="text-xl font-bold tracking-tight text-[var(--nv-heading)]">NVOMS</span>
            </span>
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded border border-[var(--nv-border)] bg-[var(--nv-surface)] text-[var(--nv-heading)]">
              <GroupIcon className="h-4 w-4" />
            </span>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <h2
            className={`mb-4 flex text-[11px] font-semibold uppercase tracking-[0.16em] leading-[20px] text-[var(--nv-muted)] ${
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
              onClick={() => {
                clearStoredSession();
                router.replace("/login");
              }}
            className="enterprise-button-secondary flex w-full items-center justify-center rounded px-4 py-2 text-sm font-medium text-error-700 transition-colors hover:text-error-800"
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
