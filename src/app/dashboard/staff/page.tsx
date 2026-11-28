import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { OfficeCalendarWorkspace } from "@/components/calendar/OfficeCalendarWorkspace";
import { StaffOverviewCards } from "@/components/staff/StaffOverviewCards";
import { StaffRecentAttentionSection } from "@/components/staff/StaffRecentAttentionSection";
import { requirePageRole } from "@/lib/auth/rbac";
import { listCalendarEventsForUser } from "@/lib/db/calendar";
import { listStaffDocumentRequests } from "@/lib/db/staff-requests";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrar Staff Dashboard | RegistrarDocs AI",
  description:
    "Registrar Staff workspace dashboard and read-only document request queue overview for DNSC.",
};

export default async function StaffDashboardPage() {
  const user = await requirePageRole("staff");
  const [result, calendarData] = await Promise.all([
    listStaffDocumentRequests(),
    listCalendarEventsForUser(user),
  ]);
  const initialDateIso = new Date().toISOString();

  const attentionRequests = result.ok
    ? result.requests
        .filter((r) =>
          ["pending", "needs_correction", "processing", "ready_for_release"].includes(
            r.status
          )
        )
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-5">
      {/* Staff Welcome Header */}
      <section
        aria-labelledby="staff-welcome-heading"
        className="rounded-2xl border border-[#246B45]/20 bg-white p-6 shadow-xs sm:p-7"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-1 text-xs font-semibold text-[#174D32]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Registrar Staff
                {user.employeeId ? ` · Employee ID ${user.employeeId}` : ""}
              </span>
            </div>

            <h1
              id="staff-welcome-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl"
            >
              Welcome back, {user.fullName}
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Monitor incoming DNSC academic document requests and inspect the
              request queue from your Registrar Staff workspace.
            </p>
          </div>

          <div className="lg:shrink-0">
            <Link
              href="/dashboard/staff/queue"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174D32] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              <span>Open Request Queue</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 6 Real Overview Cards */}
      <StaffOverviewCards
        counts={result.ok ? result.counts : null}
        error={result.ok ? null : result.error}
      />

      {/* Recent Requests Requiring Attention */}
      <StaffRecentAttentionSection
        requests={attentionRequests}
        error={result.ok ? null : result.error}
      />

      {/* DNSC Academic Calendar & Staff Schedule */}
      <OfficeCalendarWorkspace
        role="staff"
        currentUserId={user.id}
        initialEvents={calendarData.events}
        initialReminders={calendarData.reminders}
        initialSchemaReady={calendarData.schemaReady}
        initialDateIso={initialDateIso}
      />
    </div>
  );
}
