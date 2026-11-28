import type { Metadata } from "next";
import { NotificationsFullView } from "@/components/requester/NotificationsFullView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications | RegistrarDocs AI",
  description:
    "View portal notifications for your RegistrarDocs AI document requests.",
};

export default function RequesterNotificationsPage() {
  return <NotificationsFullView />;
}
