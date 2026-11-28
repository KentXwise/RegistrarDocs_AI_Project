import { listRecipientNotifications } from "@/lib/db/notifications";
import { listRequesterDocumentRequests } from "@/lib/db/requests";
import type { RequesterDashboardData } from "@/types/requester";

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Loads real requester-scoped dashboard overview data from Supabase.
 * Gracefully falls back to truthful zero/empty states if migration 0002
 * has not yet been applied.
 */
export async function getRequesterDashboardData(
  requesterId: string
): Promise<RequesterDashboardData> {
  const [requestsRes, notificationsRes] = await Promise.all([
    listRequesterDocumentRequests(requesterId, 5),
    listRecipientNotifications(requesterId, { limit: 5 }),
  ]);

  return {
    counts: requestsRes.counts,
    recentRequests: requestsRes.requests.map((r) => ({
      id: r.id,
      referenceNumber: r.referenceNumber,
      documentType: r.documentType,
      submittedAt: formatShortDate(r.submittedAt),
      status: r.status,
    })),
    notifications: notificationsRes.notifications.map((n) => ({
      id: n.id,
      category: n.category,
      title: n.title,
      message: n.message,
      createdAt: formatShortDate(n.createdAt),
      read: n.read,
    })),
    requestsModuleEnabled: requestsRes.schemaReady,
    notificationsModuleEnabled: notificationsRes.schemaReady,
  };
}
