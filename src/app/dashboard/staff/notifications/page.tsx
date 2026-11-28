import type { Metadata } from "next";
import { NotificationsFullView } from "@/components/requester/NotificationsFullView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications | Registrar Staff — RegistrarDocs AI",
  description:
    "View portal notifications for your Registrar Staff workspace.",
};

export default function StaffNotificationsPage() {
  return (
    <NotificationsFullView
      apiEndpoint="/api/staff/notifications"
      requestsHref="/dashboard/staff/queue"
      showRequestDocumentCta={false}
    />
  );
}
