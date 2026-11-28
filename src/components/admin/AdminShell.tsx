"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldCheck,
  UserCheck,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import type { SafeUser } from "@/types/auth";

interface AdminShellProps {
  user: SafeUser;
  children: React.ReactNode;
}

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard/admin",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Accounts",
    items: [
      {
        label: "User Management",
        href: "/dashboard/admin/users",
        icon: Users,
        exact: false,
      },
      {
        label: "Student Approvals",
        href: "/dashboard/admin/approvals",
        icon: UserCheck,
        exact: false,
      },
      {
        label: "Staff Management",
        href: "/dashboard/admin/staff",
        icon: UserCog,
        exact: false,
      },
    ],
  },
  {
    title: "Catalog & Content",
    items: [
      {
        label: "Document Types",
        href: "/dashboard/admin/document-types",
        icon: FileText,
        exact: false,
      },
      {
        label: "Requirements",
        href: "/dashboard/admin/requirements",
        icon: ListChecks,
        exact: false,
      },
      {
        label: "FAQ Management",
        href: "/dashboard/admin/faqs",
        icon: HelpCircle,
        exact: false,
      },
      {
        label: "AI Knowledge Sources",
        href: "/dashboard/admin/knowledge-sources",
        icon: BookOpen,
        exact: false,
      },
    ],
  },
  {
    title: "Oversight",
    items: [
      {
        label: "Reports & Analytics",
        href: "/dashboard/admin/reports",
        icon: BarChart3,
        exact: false,
      },
      {
        label: "AI Feedback Analyzer",
        href: "/dashboard/admin/feedback-analyzer",
        icon: MessageSquareText,
        exact: false,
      },
      {
        label: "Audit Logs",
        href: "/dashboard/admin/audit-logs",
        icon: ClipboardList,
        exact: false,
      },
    ],
  },
] as const;

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

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

  const renderNav = (onSelect?: () => void) => (
    <div className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {group.title}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <li key={item.href}>
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
      ))}
    </div>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F5F5EF] text-[#25352B]">
      {/* Fixed Desktop Sidebar */}
      <aside
        aria-label="Administrator sidebar navigation"
        className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-200/90 bg-white lg:flex xl:w-[272px]"
      >
        <div className="flex shrink-0 items-center justify-center border-b border-slate-200/80 px-5 py-6">
          <BrandMark href="/dashboard/admin" />
        </div>

        <nav
          aria-label="Admin navigation"
          className="flex-1 overflow-y-auto px-4 py-4"
        >
          {renderNav()}
        </nav>

        <div className="shrink-0 border-t border-slate-200/80 px-5 py-3.5">
          <div className="rounded-xl border border-[#246B45]/15 bg-[#E6EFE8]/55 px-4 py-2.5 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#174D32]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Admin Control Panel</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Role: Administrator
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-[#25352B]/45 backdrop-blur-[1px]"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-5">
              <div className="flex flex-1 justify-center">
                <BrandMark href="/dashboard/admin" />
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-[#25352B] hover:bg-[#E6EFE8] hover:text-[#174D32]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-4">
              {renderNav(() => setMobileNavOpen(false))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-4 shadow-2xs sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-[#25352B] hover:bg-[#E6EFE8] hover:text-[#174D32] lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-[#25352B] sm:text-base">
                DNSC Registrar&apos;s Office — Administration
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                RegistrarDocs AI &middot; System Governance, Accounts &amp;
                Catalog Management
              </p>
            </div>
          </div>

          <div ref={accountMenuRef} className="relative flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-[#174D32]/40 hover:bg-[#F5F5EF]"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#174D32] text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden max-w-[140px] truncate text-xs font-semibold text-[#25352B] sm:inline">
                {user.fullName}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform ${
                  accountMenuOpen ? "rotate-180 text-[#174D32]" : ""
                }`}
              />
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute top-full right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              >
                <div className="border-b border-slate-100 bg-[#F5F5EF]/80 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-[#25352B]">
                    {user.fullName}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#174D32]">
                    System Administrator
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {user.email}
                  </p>
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>{isLoggingOut ? "Logging Out..." : "Log Out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col">
            <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
              {children}
            </main>
            <footer className="border-t border-slate-200/80 bg-white py-4">
              <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
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
