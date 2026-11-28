"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileWarning,
  Loader2,
} from "lucide-react";
import type { PersistedNotification } from "@/lib/db/notifications";

export const NOTIFICATIONS_UPDATED_EVENT = "registrardocs:notifications-updated";

export function dispatchNotificationsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  }
}

export function formatNotificationTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NotificationCategoryIcon({
  category,
}: {
  category: PersistedNotification["category"];
}) {
  switch (category) {
    case "missing_requirements":
      return (
        <FileWarning
          className="h-4 w-4 text-amber-700"
          aria-hidden="true"
        />
      );
    case "processing_update":
      return <Clock className="h-4 w-4 text-[#246B45]" aria-hidden="true" />;
    case "ready_for_release":
      return (
        <CheckCircle2 className="h-4 w-4 text-[#174D32]" aria-hidden="true" />
      );
    case "collection_instructions":
      return (
        <ClipboardCheck
          className="h-4 w-4 text-[#174D32]"
          aria-hidden="true"
        />
      );
    case "status_update":
    default:
      return <Bell className="h-4 w-4 text-[#174D32]" aria-hidden="true" />;
  }
}

interface NotificationQuickPanelProps {
  apiEndpoint?: string;
  viewAllHref?: string;
  requestsHref?: string;
}

export function NotificationQuickPanel({
  apiEndpoint = "/api/requester/notifications",
  viewAllHref = "/dashboard/requester/notifications",
  requestsHref = "/dashboard/requester/requests",
}: NotificationQuickPanelProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PersistedNotification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiEndpoint}?limit=6&offset=0`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status !== 401) {
          setError("Unable to load notifications right now.");
        }
        return;
      }
      const data = (await res.json()) as {
        notifications: PersistedNotification[];
        unreadCount: number;
      };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setError("Network error while loading notifications.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const res = await fetch(`${apiEndpoint}?limit=6&offset=0`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          notifications: PersistedNotification[];
          unreadCount: number;
        };
        if (cancelled) return;
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // Ignore silent initial fetch error
      }
    }

    void loadInitial();

    const handleSync = () => {
      void fetchNotifications(false);
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);
    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);
    };
  }, [apiEndpoint, fetchNotifications]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      void fetchNotifications(notifications.length === 0);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        dispatchNotificationsUpdated();
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (item: PersistedNotification) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        const res = await fetch(apiEndpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_read",
            notificationId: item.id,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { unreadCount?: number };
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
          dispatchNotificationsUpdated();
        }
      } catch {
        // Ignore transient network errors during navigation
      }
    }

    setOpen(false);
    if (item.requestReference) {
      router.push(
        `${requestsHref}?ref=${encodeURIComponent(item.requestReference)}`
      );
    } else {
      router.push(viewAllHref);
    }
  };

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="requester-notification-panel"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] ${
          open
            ? "border-[#174D32] bg-[#174D32] text-white"
            : "border-slate-200 bg-white text-[#25352B] hover:border-[#174D32]/40 hover:bg-[#E6EFE8] hover:text-[#174D32]"
        }`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 py-0.5 text-[10px] leading-none font-bold text-white shadow-xs ring-2 ring-white"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          id="requester-notification-panel"
          role="dialog"
          aria-label="Recent notifications"
          className="absolute top-full right-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-[#F5F5EF]/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#25352B]">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#174D32] px-2 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] disabled:opacity-60"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{markingAll ? "Marking..." : "Mark All as Read"}</span>
              </button>
            )}
          </div>

          {/* Panel Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#174D32]" />
                <span>Loading notifications...</span>
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 px-4 py-6 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#25352B]">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Real updates will appear here when you submit a document
                  request or when Registrar Staff update your request status.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(item)}
                      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#F5F5EF] focus:bg-[#F5F5EF] focus:outline-none ${
                        item.read ? "bg-white" : "bg-[#E6EFE8]/45"
                      }`}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs ring-1 ring-slate-200/80">
                        <NotificationCategoryIcon category={item.category} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs leading-snug ${
                              item.read
                                ? "font-medium text-[#25352B]"
                                : "font-bold text-[#25352B]"
                            }`}
                          >
                            {item.title}
                          </p>
                          {!item.read && (
                            <span
                              aria-label="Unread"
                              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#174D32]"
                            />
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                          {item.message}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <span>
                            {formatNotificationTimestamp(item.createdAt)}
                          </span>
                          {item.requestReference && (
                            <>
                              <span>&middot;</span>
                              <span className="font-mono font-semibold text-[#174D32]">
                                {item.requestReference}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Distinct View All Notifications Footer Link */}
          <div className="border-t border-slate-100 bg-[#F5F5EF]/60 px-4 py-2.5 text-center">
            <Link
              href={viewAllHref}
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-lg py-1.5 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8] hover:text-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
