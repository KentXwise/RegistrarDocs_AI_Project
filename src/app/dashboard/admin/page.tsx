import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  ListChecks,
  PackageCheck,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { requirePageRole } from "@/lib/auth/rbac";
import { getAdminDashboardOverview } from "@/lib/db/admin-users";
import { listCalendarEventsForUser } from "@/lib/db/calendar";
import { OfficeCalendarWorkspace } from "@/components/calendar/OfficeCalendarWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard | RegistrarDocs AI",
  description:
    "System overview, student registration approvals, Staff management, catalog configuration, and audit oversight for DNSC RegistrarDocs AI.",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  const adminUser = await requirePageRole("admin");
  const [overview, calendarData] = await Promise.all([
    getAdminDashboardOverview(),
    listCalendarEventsForUser(adminUser),
  ]);
  const initialDateIso = new Date().toISOString();

  const summaryCards = [
    {
      label: "Total Registered Users",
      value: overview.userStats.totalUsers,
      icon: Users,
      href: "/dashboard/admin/users",
    },
    {
      label: "Active Requesters",
      value: overview.userStats.activeRequesters,
      icon: UserCheck,
      href: "/dashboard/admin/users",
    },
    {
      label: "Active Staff",
      value: overview.userStats.activeStaff,
      icon: UserCog,
      href: "/dashboard/admin/staff",
    },
    {
      label: "Pending Student Approvals",
      value: overview.userStats.pendingApprovals,
      icon: Clock,
      href: "/dashboard/admin/approvals",
      highlight: overview.userStats.pendingApprovals > 0,
    },
    {
      label: "Total Document Requests",
      value: overview.requestStats.total,
      icon: FileText,
    },
    {
      label: "Submitted / Pending",
      value: overview.requestStats.pending,
      icon: ClipboardList,
    },
    {
      label: "Under Processing",
      value: overview.requestStats.processing,
      icon: ListChecks,
    },
    {
      label: "Ready for Release",
      value: overview.requestStats.readyForRelease,
      icon: PackageCheck,
    },
    {
      label: "Released Requests",
      value: overview.requestStats.released,
      icon: CheckCircle2,
    },
  ];

  const quickModules = [
    {
      title: "Student Approvals",
      desc: "Review pending registrations and verify Student IDs",
      href: "/dashboard/admin/approvals",
      icon: UserCheck,
    },
    {
      title: "Staff Management",
      desc: "Create, activate, or deactivate Registrar Staff accounts",
      href: "/dashboard/admin/staff",
      icon: UserCog,
    },
    {
      title: "Document Types & Requirements",
      desc: "Configure Registrar services and requester requirements",
      href: "/dashboard/admin/document-types",
      icon: FileText,
    },
    {
      title: "FAQs & AI Knowledge",
      desc: "Maintain published FAQs and approved informational sources",
      href: "/dashboard/admin/faqs",
      icon: HelpCircle,
    },
    {
      title: "AI Knowledge Sources",
      desc: "Manage approved Registrar reference sources (informational only)",
      href: "/dashboard/admin/knowledge-sources",
      icon: BookOpen,
    },
    {
      title: "Audit Logs",
      desc: "Inspect chronological administrative actions and history",
      href: "/dashboard/admin/audit-logs",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
          Administrator Overview
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Live operational summary of DNSC RegistrarDocs AI accounts, approvals,
          requests, and administrative activity.
        </p>
      </div>

      {/* Live Database Summary Cards */}
      <section aria-label="System summary statistics">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const inner = (
              <div
                className={`flex items-center justify-between rounded-2xl border p-4 shadow-2xs transition-colors ${
                  card.highlight
                    ? "border-amber-300 bg-amber-50/70"
                    : "border-slate-200 bg-white hover:border-[#174D32]/35"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-extrabold text-[#25352B]">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    card.highlight
                      ? "bg-amber-100 text-amber-800"
                      : "bg-[#E6EFE8] text-[#174D32]"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            );

            return card.href ? (
              <Link key={card.label} href={card.href}>
                {inner}
              </Link>
            ) : (
              <div key={card.label}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Academic Calendar, Office Scheduling & Announcements — Directly Below Summary Cards */}
      <OfficeCalendarWorkspace
        role="admin"
        currentUserId={adminUser.id}
        initialEvents={calendarData.events}
        initialReminders={calendarData.reminders}
        initialSchemaReady={calendarData.schemaReady}
        initialDateIso={initialDateIso}
      />

      {/* Pending Approvals + Recent Admin Activities */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-[#25352B]">
                Pending Student Approvals
              </h2>
              <p className="text-xs text-slate-500">
                Accounts awaiting Admin review before accessing the Requester
                dashboard.
              </p>
            </div>
            <Link
              href="/dashboard/admin/approvals"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#174D32] hover:text-[#246B45]"
            >
              <span>Review All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {overview.pendingStudents.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-slate-500">
              No student registrations are currently pending approval.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {overview.pendingStudents.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#25352B]">
                      {student.fullName}
                    </p>
                    <p className="truncate text-slate-500">
                      {student.studentId ? `ID: ${student.studentId} · ` : ""}
                      {student.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {formatDate(student.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-[#25352B]">
                Recent Administrative Activities
              </h2>
              <p className="text-xs text-slate-500">
                Latest recorded actions from the administrative audit log.
              </p>
            </div>
            <Link
              href="/dashboard/admin/audit-logs"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#174D32] hover:text-[#246B45]"
            >
              <span>View Audit Logs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {overview.recentAuditLogs.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-slate-500">
              No administrative audit entries recorded yet. Actions taken in
              Admin modules will appear here automatically.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {overview.recentAuditLogs.map((log) => (
                <li key={log.id} className="px-5 py-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#25352B]">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-600">{log.description}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    By {log.actorName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recently Registered Users + Quick Module Access */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-[#25352B]">
              Recently Registered Users
            </h2>
            <Link
              href="/dashboard/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#174D32] hover:text-[#246B45]"
            >
              <span>Manage Users</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {overview.recentUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#25352B]">
                    {u.fullName}
                  </p>
                  <p className="truncate text-slate-500">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-bold text-[#174D32] uppercase">
                    {u.role}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {u.status.replace(/_/g, " ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-[#25352B]">
            Quick Access to Management Modules
          </h2>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            {quickModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-[#174D32]/40 hover:bg-[#F5F5EF]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6EFE8] text-[#174D32]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#25352B] group-hover:text-[#174D32]">
                      {mod.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {mod.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
