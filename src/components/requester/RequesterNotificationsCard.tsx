import Link from "next/link";
import { ArrowRight, Bell, Mail } from "lucide-react";
import type { RequesterNotificationItem } from "@/types/requester";

interface RequesterNotificationsCardProps {
  notifications: RequesterNotificationItem[];
  notificationsModuleEnabled: boolean;
}

const NOTIFICATION_CATEGORIES = [
  "Request status updates",
  "Missing requirements or correction notices",
  "Processing updates",
  "Ready-for-release notifications",
  "Collection instructions",
] as const;

export function RequesterNotificationsCard({
  notifications,
  notificationsModuleEnabled,
}: RequesterNotificationsCardProps) {
  return (
    <section
      aria-labelledby="requester-notifications-heading"
      className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6EFE8] text-[#174D32]">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="requester-notifications-heading"
              className="text-base font-bold text-[#25352B]"
            >
              Notifications
            </h2>
            <p className="text-xs text-slate-500">
              Email &amp; portal updates for your requests
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/requester/notifications"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#174D32] transition-colors hover:text-[#246B45] focus:outline-none focus-visible:underline"
        >
          <span>View All</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
          <div className="rounded-xl border border-slate-200/80 bg-[#F5F5EF]/75 p-4 text-center">
            <p className="text-sm font-semibold text-[#25352B]">
              No Notifications Yet
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {notificationsModuleEnabled
                ? "You are all caught up. Updates on your document requests will appear here."
                : "No notifications are on record yet. Automated portal and email notifications will be activated in the Notifications milestone."}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-[#246B45]/20 bg-[#E6EFE8]/45 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#174D32]">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Planned Notification Updates</span>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
              {NOTIFICATION_CATEGORIES.map((category) => (
                <li key={category} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#174D32]"
                    aria-hidden="true"
                  />
                  <span>{category}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {notifications.map((item) => (
            <li key={item.id} className="px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[#25352B]">
                  {item.title}
                </p>
                {!item.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#174D32]" />
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {item.message}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {item.createdAt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
