"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Loader2,
} from "lucide-react";
import {
  dispatchNotificationsUpdated,
  formatNotificationTimestamp,
  NotificationCategoryIcon,
} from "@/components/requester/NotificationQuickPanel";
import type { PersistedNotification } from "@/lib/db/notifications";

const PAGE_SIZE = 15;

interface NotificationsFullViewProps {
  apiEndpoint?: string;
  requestsHref?: string;
  showRequestDocumentCta?: boolean;
}

export function NotificationsFullView({
  apiEndpoint = "/api/requester/notifications",
  requestsHref = "/dashboard/requester/requests",
  showRequestDocumentCta = true,
}: NotificationsFullViewProps = {}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<PersistedNotification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (offset: number, append: boolean, unreadOnly: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (unreadOnly) params.set("unreadOnly", "true");

        const res = await fetch(`${apiEndpoint}?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setError("Unable to load notifications right now. Please try again.");
          return;
        }
        const data = (await res.json()) as {
          notifications: PersistedNotification[];
          unreadCount: number;
          totalCount: number;
          hasMore: boolean;
        };

        setNotifications((prev) =>
          append ? [...prev, ...(data.notifications ?? [])] : (data.notifications ?? [])
        );
        setUnreadCount(data.unreadCount ?? 0);
        setTotalCount(data.totalCount ?? 0);
        setHasMore(Boolean(data.hasMore));
      } catch {
        setError("A network error occurred while loading notifications.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [apiEndpoint]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: "0",
        });
        if (filter === "unread") params.set("unreadOnly", "true");

        const res = await fetch(`${apiEndpoint}?${params.toString()}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setError("Unable to load notifications right now. Please try again.");
          setLoading(false);
          return;
        }
        const data = (await res.json()) as {
          notifications: PersistedNotification[];
          unreadCount: number;
          totalCount: number;
          hasMore: boolean;
        };
        if (cancelled) return;
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setTotalCount(data.totalCount ?? 0);
        setHasMore(Boolean(data.hasMore));
        setError(null);
      } catch {
        if (!cancelled) {
          setError("A network error occurred while loading notifications.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [apiEndpoint, filter]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      filter === "unread"
        ? prev.filter((n) => n.id !== id)
        : prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationId: id }),
      });
      if (res.ok) {
        const data = (await res.json()) as { unreadCount?: number };
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
        dispatchNotificationsUpdated();
      }
    } catch {
      // Ignore transient error
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
        setNotifications((prev) =>
          filter === "unread"
            ? []
            : prev.map((n) => ({ ...n, read: true }))
        );
        dispatchNotificationsUpdated();
      }
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-[#25352B] sm:text-2xl">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#174D32] px-2.5 py-0.5 text-xs font-semibold text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Track real-time updates for your submitted document requests,
              review status changes, and release notices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Filter notifications"
              className="inline-flex rounded-lg border border-slate-200 bg-[#F5F5EF] p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filter === "all"}
                onClick={() => {
                  if (filter !== "all") {
                    setLoading(true);
                    setFilter("all");
                  }
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === "all"
                    ? "bg-white text-[#174D32] shadow-2xs"
                    : "text-slate-600 hover:text-[#25352B]"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === "unread"}
                onClick={() => {
                  if (filter !== "unread") {
                    setLoading(true);
                    setFilter("unread");
                  }
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === "unread"
                    ? "bg-white text-[#174D32] shadow-2xs"
                    : "text-slate-600 hover:text-[#25352B]"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] disabled:opacity-60"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{markingAll ? "Marking..." : "Mark All as Read"}</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#174D32]" />
            <span>Loading notifications...</span>
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 px-6 py-8 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
              <Bell className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#25352B]">
              {filter === "unread"
                ? "No Unread Notifications"
                : "No Notifications Yet"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">
              {filter === "unread"
                ? "You have read all of your notifications."
                : "Notifications are created automatically when you submit a document request or when Registrar Staff update your request status."}
            </p>
            {filter === "all" && showRequestDocumentCta && (
              <div className="mt-5">
                <Link
                  href="/dashboard/requester/request"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#246B45]"
                >
                  <span>Request a Document</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className={`flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between sm:px-6 ${
                    item.read ? "bg-white" : "bg-[#E6EFE8]/40"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs ring-1 ring-slate-200/80">
                      <NotificationCategoryIcon category={item.category} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm ${
                            item.read
                              ? "font-semibold text-[#25352B]"
                              : "font-bold text-[#25352B]"
                          }`}
                        >
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="rounded-full bg-[#174D32] px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                        {item.message}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>
                          {formatNotificationTimestamp(item.createdAt)}
                        </span>
                        {item.requestReference && (
                          <>
                            <span>&middot;</span>
                            <span className="rounded bg-[#F5F5EF] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#174D32] ring-1 ring-slate-200">
                              {item.requestReference}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => void handleMarkRead(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[#174D32]/40 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Mark Read</span>
                      </button>
                    )}
                    {item.requestReference && (
                      <Link
                        href={`${requestsHref}?ref=${encodeURIComponent(item.requestReference)}`}
                        onClick={() => {
                          if (!item.read) void handleMarkRead(item.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#174D32] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#246B45]"
                      >
                        <span>View Request</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {hasMore && (
              <div className="border-t border-slate-100 px-6 py-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    void loadPage(
                      notifications.length,
                      true,
                      filter === "unread"
                    )
                  }
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8] hover:text-[#174D32] disabled:opacity-60"
                >
                  {loadingMore && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>
                    {loadingMore ? "Loading..." : "Load Older Notifications"}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
