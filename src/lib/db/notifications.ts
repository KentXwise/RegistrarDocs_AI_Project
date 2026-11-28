import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { RequesterNotificationItem } from "@/types/requester";

export interface NotificationRow {
  id: string;
  recipient_id: string;
  request_id: string | null;
  request_reference: string | null;
  category: RequesterNotificationItem["category"];
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface PersistedNotification extends RequesterNotificationItem {
  requestId: string | null;
  requestReference: string | null;
}

function toNotification(row: NotificationRow): PersistedNotification {
  return {
    id: row.id,
    requestId: row.request_id,
    requestReference: row.request_reference,
    category: row.category,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    read: row.is_read,
  };
}

function isMissingTableError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the table") ||
    lower.includes("does not exist") ||
    lower.includes("schema cache")
  );
}

export async function listRecipientNotifications(
  recipientId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<{
  notifications: PersistedNotification[];
  unreadCount: number;
  totalCount: number;
  hasMore: boolean;
  schemaReady: boolean;
}> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  const admin = createSupabaseAdminClient();

  let listQuery = admin
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.unreadOnly) {
    listQuery = listQuery.eq("is_read", false);
  }

  const [listRes, unreadRes] = await Promise.all([
    listQuery,
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", recipientId)
      .eq("is_read", false),
  ]);

  if (listRes.error) {
    if (isMissingTableError(listRes.error.message)) {
      return {
        notifications: [],
        unreadCount: 0,
        totalCount: 0,
        hasMore: false,
        schemaReady: false,
      };
    }
    throw new Error(listRes.error.message);
  }

  const rows = (listRes.data ?? []) as NotificationRow[];
  const totalCount = listRes.count ?? rows.length;
  const unreadCount = unreadRes.count ?? 0;

  return {
    notifications: rows.map(toNotification),
    unreadCount,
    totalCount,
    hasMore: offset + rows.length < totalCount,
    schemaReady: true,
  };
}

export interface CreateNotificationInput {
  recipientId: string;
  requestId: string | null;
  requestReference: string | null;
  category: RequesterNotificationItem["category"];
  title: string;
  message: string;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<PersistedNotification | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .insert({
      recipient_id: input.recipientId,
      request_id: input.requestId,
      request_reference: input.requestReference,
      category: input.category,
      title: input.title,
      message: input.message,
      is_read: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return toNotification(data as NotificationRow);
}

export async function markNotificationRead(
  recipientId: string,
  notificationId: string
): Promise<number> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", recipientId)
    .eq("is_read", false);

  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", recipientId)
    .eq("is_read", false);

  return count ?? 0;
}

export async function markAllNotificationsRead(
  recipientId: string
): Promise<number> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_id", recipientId)
    .eq("is_read", false);

  return 0;
}

export async function listNotificationsForRequest(
  recipientId: string,
  requestId: string
): Promise<PersistedNotification[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("recipient_id", recipientId)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as NotificationRow[]).map(toNotification);
}
