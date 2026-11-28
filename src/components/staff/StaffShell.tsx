"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  PackageCheck,
  User,
  X,
} from "lucide-react";
import { NotificationQuickPanel } from "@/components/requester/NotificationQuickPanel";
import { BrandMark } from "@/components/ui/BrandMark";
import type { SafeUser } from "@/types/auth";

interface StaffShellProps {
  user: SafeUser;
  children: React.ReactNode;
}

const MAIN_NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard/staff",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Request Queue",
    href: "/dashboard/staff/queue",
    icon: ClipboardList,
    exact: false,
  },
] as const;

const ACTIVE_WORKFLOW_ITEMS = [
  {
    label: "Processing",
    href: "/dashboard/staff/queue?status=processing",
    statusKey: "processing",
    icon: LoaderCircle,
  },
  {
    label: "Needs Correction",
    href: "/dashboard/staff/queue?status=needs_correction",
    statusKey: "needs_correction",
    icon: AlertTriangle,
  },
  {
    label: "Ready for Release",
    href: "/dashboard/staff/queue?status=ready_for_release",
    statusKey: "ready_for_release",
    icon: PackageCheck,
  },
  {
    label: "Release Records",
    href: "/dashboard/staff/queue?status=released",
    statusKey: "released",
    icon: Archive,
  },
] as const;

const WORKFLOW_STATUS_KEYS = new Set<string>(
  ACTIVE_WORKFLOW_ITEMS.map((item) => item.statusKey)
);

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function StaffShell({ user, children }: StaffShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const activeStatusParam = searchParams.get("status");
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileNavOpen && !accountMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        setAccountMenuOpen(false);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (
        accountMenuOpen &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [mobileNavOpen, accountMenuOpen]);

  const isMainNavActive = (href: string, exact: boolean) => {
    if (href === "/dashboard/staff/queue") {
      return (
        pathname === "/dashboard/staff/queue" &&
        (!activeStatusParam || !WORKFLOW_STATUS_KEYS.has(activeStatusParam))
      );
    }
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isWorkflowItemActive = (statusKey: string) =>
    pathname === "/dashboard/staff/queue" && activeStatusParam === statusKey;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setAccountMenuOpen(false);
    setMobileNavOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const initials = getInitials(user.fullName);
  const currentYear = new Date().getFullYear();

  const renderSidebarNav = (onSelect?: () => void) => (
    <div className="space-y-6">
      {/* Main */}
      <div>
        <p className="mb-2.5 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Main
        </p>
        <ul className="space-y-1.5">
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isMainNavActive(item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onSelect}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] ${
                    active
                      ? "bg-[#174D32] text-white shadow-xs"
                      : "text-[#25352B]/85 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active
                        ? "text-white"
                        : "text-[#174D32]/80 group-hover:text-[#174D32]"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Request Workflow */}
      <div>
        <p className="mb-2.5 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Request Workflow
        </p>
        <ul className="space-y-1">
          {ACTIVE_WORKFLOW_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isWorkflowItemActive(item.statusKey);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onSelect}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] ${
                    active
                      ? "bg-[#174D32] text-white shadow-xs"
                      : "text-[#25352B]/85 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active
                        ? "text-white"
                        : "text-[#174D32]/80 group-hover:text-[#174D32]"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F5F5EF] text-[#25352B]">
      {/* Fixed Desktop Sidebar */}
      <aside
        aria-label="Registrar Staff sidebar navigation"
        className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-200/90 bg-white lg:flex xl:w-[272px]"
      >
        <div className="flex shrink-0 items-center justify-center border-b border-slate-200/80 px-5 py-7">
          <BrandMark href="/dashboard/staff" />
        </div>

        <nav
          aria-label="Staff navigation"
          className="flex-1 overflow-y-auto px-4 py-5"
        >
          {renderSidebarNav()}
        </nav>

        <div className="shrink-0 border-t border-slate-200/80 px-5 py-4">
          <div className="rounded-xl border border-[#246B45]/15 bg-[#E6EFE8]/55 px-4 py-2.5 text-center">
            <p className="text-xs font-semibold text-[#174D32]">
              Registrar Staff Workspace
            </p>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Account Status: Active
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile / Tablet Drawer Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-[#25352B]/45 backdrop-blur-[1px]"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            id="staff-mobile-sidebar"
            aria-label="Mobile staff navigation"
            className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-6">
              <div className="flex flex-1 justify-center">
                <BrandMark href="/dashboard/staff" />
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              {renderSidebarNav(() => setMobileNavOpen(false))}
            </nav>
          </aside>
        </div>
      )}

      {/* Right Column: Fixed Upperbar + Independently Scrollable Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Fixed Upperbar */}
        <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-4 shadow-2xs sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-expanded={mobileNavOpen}
              aria-controls="staff-mobile-sidebar"
              aria-label="Open navigation menu"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-[#25352B] sm:text-base">
                DNSC Registrar&apos;s Office — Staff Workspace
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                RegistrarDocs AI &middot; Document Review, Preparation &amp;
                Release
              </p>
            </div>
          </div>

          {/* Notifications Quick Panel + Staff Profile Dropdown */}
          <div className="flex shrink-0 items-center gap-2">
            <NotificationQuickPanel
              apiEndpoint="/api/staff/notifications"
              viewAllHref="/dashboard/staff/notifications"
              requestsHref="/dashboard/staff/queue"
            />

            <div ref={accountMenuRef} className="relative flex items-center">

            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-controls="staff-account-menu"
              aria-label={`Account menu for ${user.fullName}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left transition-colors hover:border-[#174D32]/40 hover:bg-[#F5F5EF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] sm:px-2.5"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#174D32] text-xs font-bold tracking-tight text-white"
              >
                {initials}
              </span>
              <span className="hidden max-w-[140px] truncate text-xs font-semibold text-[#25352B] sm:inline">
                {user.fullName}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150 ${
                  accountMenuOpen ? "rotate-180 text-[#174D32]" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {accountMenuOpen && (
              <div
                id="staff-account-menu"
                role="menu"
                aria-label="Staff account options"
                className="absolute top-full right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              >
                <div className="border-b border-slate-100 bg-[#F5F5EF]/80 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-[#25352B]">
                    {user.fullName}
                  </p>
                  {user.employeeId && (
                    <p className="mt-0.5 text-xs font-medium text-[#174D32]">
                      Employee ID: {user.employeeId}
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {user.email}
                  </p>
                </div>

                <div className="p-1.5">
                  <Link
                    href="/dashboard/staff/profile"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32]"
                  >
                    <User className="h-4 w-4 text-[#174D32]" aria-hidden="true" />
                    <span>My Profile</span>
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>{isLoggingOut ? "Logging Out..." : "Log Out"}</span>
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </header>

        {/* Independently Scrollable Main Content */}
        <div
          id="staff-scroll-container"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div className="flex min-h-full flex-col">
            <main
              id="main-content"
              className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-5 sm:py-5 lg:px-6"
            >
              {children}
            </main>

            <footer className="border-t border-slate-200/80 bg-white py-4">
              <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-5 lg:px-6">
                <p>&copy; {currentYear} RegistrarDocs AI. All rights reserved.</p>
                <p>Pilot Institution: Davao del Norte State College (DNSC)</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
