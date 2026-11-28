import type { Metadata } from "next";
import { DnscAcademicCalendarSection } from "@/components/requester/DnscAcademicCalendarSection";
import { HelpfulInformationSection } from "@/components/requester/HelpfulInformationSection";
import { RegistrarAnnouncementsSection } from "@/components/requester/RegistrarAnnouncementsSection";
import { RequesterWelcomeBanner } from "@/components/requester/RequesterWelcomeBanner";
import { RequestOverviewCards } from "@/components/requester/RequestOverviewCards";
import { requirePageRole } from "@/lib/auth/rbac";
import {
  listActivePublicAnnouncements,
  listCalendarEventsForUser,
} from "@/lib/db/calendar";
import { getRequesterDashboardData } from "@/lib/requester/dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Requester Dashboard | RegistrarDocs AI",
  description:
    "Centralized DNSC RegistrarDocs AI dashboard for requesting academic documents, viewing the academic calendar, and reading Registrar announcements.",
};

export default async function RequesterDashboardPage() {
  const user = await requirePageRole("requester");
  const [dashboardData, calendarData, announcements] = await Promise.all([
    getRequesterDashboardData(user.id),
    listCalendarEventsForUser(user),
    listActivePublicAnnouncements(),
  ]);
  const initialDateIso = new Date().toISOString();

  return (
    <div className="space-y-5">
      <RequesterWelcomeBanner user={user} />

      <RequestOverviewCards
        counts={dashboardData.counts}
        requestsModuleEnabled={dashboardData.requestsModuleEnabled}
      />

      <RegistrarAnnouncementsSection announcements={announcements} />

      <DnscAcademicCalendarSection
        events={calendarData.events}
        initialDateIso={initialDateIso}
      />

      <HelpfulInformationSection />
    </div>
  );
}
