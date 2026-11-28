import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ALL_CALENDAR_SEED_ENTRIES } from "@/lib/calendar/seed-data";
import { createNotification } from "@/lib/db/notifications";
import { recordAdminAuditLog } from "@/lib/db/admin-audit";
import { sendTransactionalEmail } from "@/lib/email/mailer";
import type { SafeUser } from "@/types/auth";
import {
  STAFF_ALLOWED_CATEGORIES,
  type CalendarEventCategory,
  type CalendarEventItem,
  type CalendarEventPriority,
  type CalendarEventReminder,
  type CalendarEventVisibility,
  type CalendarRecurrence,
  type CalendarSourceType,
} from "@/types/calendar";

interface CalendarEventRow {
  id: string;
  seed_key: string | null;
  title: string;
  description: string;
  category: CalendarEventCategory;
  visibility: CalendarEventVisibility;
  priority: CalendarEventPriority;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  recurrence: CalendarRecurrence;
  expires_at: string | null;
  action_url: string | null;
  source_type: CalendarSourceType;
  source_label: string | null;
  source_url: string | null;
  verified_at: string | null;
  is_active: boolean;
  notify_requesters_in_app: boolean;
  notify_requesters_email: boolean;
  announcement_notified_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarReminderRow {
  id: string;
  event_id: string;
  user_id: string;
  offset_minutes: number | null;
  custom_remind_at: string | null;
  trigger_at: string;
  delivery_in_app: boolean;
  delivery_email: boolean;
  status: "pending" | "sent" | "dismissed";
  triggered_at: string | null;
  dismissed_at: string | null;
  notification_id: string | null;
  created_at: string;
}

export interface CalendarReminderInput {
  offsetMinutes?: number | null;
  customRemindAt?: string | null;
  deliveryInApp?: boolean;
  deliveryEmail?: boolean;
}

export interface CalendarEventWriteInput {
  title: string;
  description?: string;
  category: CalendarEventCategory;
  visibility: CalendarEventVisibility;
  priority?: CalendarEventPriority;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  allDay?: boolean;
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
  location?: string | null;
  recurrence?: CalendarRecurrence;
  expiresAt?: string | null;
  actionUrl?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  isActive?: boolean;
  notifyRequestersInApp?: boolean;
  notifyRequestersEmail?: boolean;
  reminders?: CalendarReminderInput[];
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

/**
 * Converts a YYYY-MM-DD date and optional HH:MM time in Philippine Standard Time
 * (Asia/Manila, UTC+8) to an ISO-8601 UTC timestamp string.
 */
export function manilaDateTimeToUtcIso(
  dateYmd: string,
  timeHm?: string | null
): string {
  const safeTime =
    timeHm && /^\d{2}:\d{2}(:\d{2})?$/.test(timeHm.trim())
      ? timeHm.trim().length === 5
        ? `${timeHm.trim()}:00`
        : timeHm.trim()
      : "08:00:00";
  const parsed = new Date(`${dateYmd}T${safeTime}+08:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

export function computeReminderTriggerIso(params: {
  startDate: string;
  startTime?: string | null;
  allDay: boolean;
  offsetMinutes?: number | null;
  customRemindAt?: string | null;
}): string | null {
  if (params.customRemindAt) {
    const raw = params.customRemindAt.trim();
    // If client sends datetime-local without timezone offset, treat as Asia/Manila (+08:00)
    const withTz =
      /[zZ]$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}:00+08:00`;
    const parsed = new Date(withTz);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (
    typeof params.offsetMinutes === "number" &&
    Number.isFinite(params.offsetMinutes) &&
    params.offsetMinutes >= 0
  ) {
    const baseUtc = new Date(
      manilaDateTimeToUtcIso(
        params.startDate,
        params.allDay ? "08:00" : params.startTime
      )
    );
    const triggerMs = baseUtc.getTime() - params.offsetMinutes * 60 * 1000;
    return new Date(triggerMs).toISOString();
  }

  return null;
}

function normalizeTime(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

function rowToEventItem(
  row: CalendarEventRow,
  creatorNames: Map<string, string>,
  remindersByEvent: Map<string, CalendarEventReminder[]>
): CalendarEventItem {
  return {
    id: row.id,
    seedKey: row.seed_key,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    visibility: row.visibility,
    priority: row.priority ?? "normal",
    startDate: row.start_date,
    endDate: row.end_date,
    allDay: row.all_day,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    location: row.location,
    recurrence: row.recurrence ?? "none",
    expiresAt: row.expires_at,
    actionUrl: row.action_url,
    sourceType: row.source_type ?? "manual",
    sourceLabel: row.source_label,
    sourceUrl: row.source_url,
    verifiedAt: row.verified_at,
    isActive: row.is_active,
    notifyRequestersInApp: row.notify_requesters_in_app,
    notifyRequestersEmail: row.notify_requesters_email,
    createdBy: row.created_by,
    createdByName: row.created_by ? creatorNames.get(row.created_by) ?? null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reminders: remindersByEvent.get(row.id) ?? [],
  };
}

function rowToReminder(
  row: CalendarReminderRow,
  eventMap?: Map<string, CalendarEventRow>
): CalendarEventReminder {
  const ev = eventMap?.get(row.event_id);
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    offsetMinutes: row.offset_minutes,
    customRemindAt: row.custom_remind_at,
    triggerAt: row.trigger_at,
    deliveryInApp: row.delivery_in_app,
    deliveryEmail: row.delivery_email,
    status: row.status,
    triggeredAt: row.triggered_at,
    dismissedAt: row.dismissed_at,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    eventTitle: ev?.title,
    eventStartDate: ev?.start_date,
    eventStartTime: ev ? normalizeTime(ev.start_time) : null,
    eventCategory: ev?.category,
  };
}

function fallbackSeededEvents(): CalendarEventItem[] {
  const nowIso = new Date().toISOString();
  return ALL_CALENDAR_SEED_ENTRIES.map((entry) => ({
    id: `seed-${entry.seedKey}`,
    seedKey: entry.seedKey,
    title: entry.title,
    description: entry.description,
    category: entry.category,
    visibility: entry.visibility,
    priority: entry.priority,
    startDate: entry.startDate,
    endDate: entry.endDate,
    allDay: entry.allDay,
    startTime: null,
    endTime: null,
    location: entry.location ?? null,
    recurrence: "none",
    expiresAt: null,
    actionUrl: null,
    sourceType: entry.sourceType,
    sourceLabel: entry.sourceLabel,
    sourceUrl: entry.sourceUrl,
    verifiedAt: entry.verifiedAt,
    isActive: true,
    notifyRequestersInApp: false,
    notifyRequestersEmail: false,
    createdBy: null,
    createdByName: "DNSC Official Calendar",
    createdAt: nowIso,
    updatedAt: nowIso,
    reminders: [],
  }));
}

/**
 * Idempotently seeds verified DNSC AY 2026–2027 academic dates and official
 * Philippine / local holidays into `public.calendar_events`.
 */
export async function seedOfficialCalendarData(): Promise<{
  ok: boolean;
  schemaReady: boolean;
  insertedOrChecked: number;
  error?: string;
}> {
  const admin = createSupabaseAdminClient();
  const payload = ALL_CALENDAR_SEED_ENTRIES.map((entry) => ({
    seed_key: entry.seedKey,
    title: entry.title,
    description: entry.description,
    category: entry.category,
    visibility: entry.visibility,
    priority: entry.priority,
    start_date: entry.startDate,
    end_date: entry.endDate,
    all_day: entry.allDay,
    location: entry.location ?? null,
    source_type: entry.sourceType,
    source_label: entry.sourceLabel,
    source_url: entry.sourceUrl,
    verified_at: entry.verifiedAt,
    is_active: true,
  }));

  const { error } = await admin
    .from("calendar_events")
    .upsert(payload, { onConflict: "seed_key", ignoreDuplicates: true });

  if (error) {
    if (isMissingTableError(error.message)) {
      return {
        ok: false,
        schemaReady: false,
        insertedOrChecked: 0,
        error:
          "Calendar tables are not yet created in Supabase. Run migration 0008_calendar_events_reminders_announcements.sql.",
      };
    }
    return {
      ok: false,
      schemaReady: true,
      insertedOrChecked: 0,
      error: error.message,
    };
  }

  return {
    ok: true,
    schemaReady: true,
    insertedOrChecked: payload.length,
  };
}

let autoSeedChecked = false;

async function ensureSeededOnce(): Promise<boolean> {
  if (autoSeedChecked) return true;
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("calendar_events")
    .select("id", { count: "exact", head: true })
    .not("seed_key", "is", null);

  if (error) {
    if (isMissingTableError(error.message)) {
      return false;
    }
    return true;
  }

  if ((count ?? 0) < ALL_CALENDAR_SEED_ENTRIES.length) {
    await seedOfficialCalendarData();
  }
  autoSeedChecked = true;
  return true;
}

export async function listCalendarEventsForUser(
  user: SafeUser,
  options: { includeInactive?: boolean } = {}
): Promise<{
  events: CalendarEventItem[];
  reminders: CalendarEventReminder[];
  schemaReady: boolean;
}> {
  const ready = await ensureSeededOnce();
  if (!ready) {
    return {
      events: fallbackSeededEvents(),
      reminders: [],
      schemaReady: false,
    };
  }

  // Opportunistically process due reminders for Admin & Staff
  if (user.role === "admin" || user.role === "staff") {
    await processDueCalendarReminders().catch(() => {});
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("calendar_events")
    .select("*")
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (user.role === "requester") {
    query = query.eq("is_active", true).eq("visibility", "public");
  } else if (user.role === "staff") {
    query = query
      .eq("is_active", true)
      .or(
        `visibility.in.(public,office),and(visibility.eq.personal,created_by.eq.${user.id})`
      );
  } else if (!options.includeInactive) {
    // Admin sees all active by default, or all when includeInactive=true
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) {
      return {
        events: fallbackSeededEvents(),
        reminders: [],
        schemaReady: false,
      };
    }
    throw new Error(error.message);
  }

  const nowMs = Date.now();
  let rows = (data ?? []) as CalendarEventRow[];

  // Filter out expired public announcements for requesters
  if (user.role === "requester") {
    rows = rows.filter(
      (r) => !r.expires_at || new Date(r.expires_at).getTime() > nowMs
    );
  }

  // Load creator names
  const creatorIds = Array.from(
    new Set(rows.map((r) => r.created_by).filter((id): id is string => Boolean(id)))
  );
  const creatorNames = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds);
    for (const p of (profiles ?? []) as Array<{ id: string; full_name: string }>) {
      creatorNames.set(p.id, p.full_name);
    }
  }

  // Load reminders for Admin / Staff
  const remindersByEvent = new Map<string, CalendarEventReminder[]>();
  let userReminders: CalendarEventReminder[] = [];
  if (user.role === "admin" || user.role === "staff") {
    const { data: remData } = await admin
      .from("calendar_event_reminders")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "dismissed")
      .order("trigger_at", { ascending: true });

    const eventMap = new Map(rows.map((r) => [r.id, r]));
    const remRows = (remData ?? []) as CalendarReminderRow[];
    userReminders = remRows.map((r) => rowToReminder(r, eventMap));
    for (const rem of userReminders) {
      const list = remindersByEvent.get(rem.eventId) ?? [];
      list.push(rem);
      remindersByEvent.set(rem.eventId, list);
    }
  }

  return {
    events: rows.map((r) => rowToEventItem(r, creatorNames, remindersByEvent)),
    reminders: userReminders,
    schemaReady: true,
  };
}

export async function listActivePublicAnnouncements(): Promise<
  Array<{
    id: string;
    title: string;
    message: string;
    publishedAt: string;
    priority: CalendarEventPriority;
    category: string;
    startDate: string;
    actionUrl: string | null;
  }>
> {
  const ready = await ensureSeededOnce();
  if (!ready) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .select("*")
    .eq("is_active", true)
    .eq("visibility", "public")
    .in("category", ["public_announcement", "collection_notice"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  const nowMs = Date.now();
  return (data as CalendarEventRow[])
    .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > nowMs)
    .map((r) => ({
      id: r.id,
      title: r.title,
      message: r.description || `Scheduled on ${r.start_date}.`,
      publishedAt: new Date(r.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      priority: r.priority ?? "normal",
      category:
        r.category === "collection_notice"
          ? "Collection / Release Notice"
          : "Public Announcement",
      startDate: r.start_date,
      actionUrl: r.action_url,
    }));
}

async function deliverPublicAnnouncementToRequesters(
  event: CalendarEventRow
): Promise<{ notifiedInApp: number; emailsSent: number }> {
  if (
    event.visibility !== "public" ||
    !event.is_active ||
    event.announcement_notified_at ||
    (!event.notify_requesters_in_app && !event.notify_requesters_email)
  ) {
    return { notifiedInApp: 0, emailsSent: 0 };
  }

  const admin = createSupabaseAdminClient();
  const { data: requesters } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "requester")
    .in("status", ["approved", "active"]);

  const targets = (requesters ?? []) as Array<{
    id: string;
    email: string;
    full_name: string;
  }>;

  let notifiedInApp = 0;
  let emailsSent = 0;

  if (event.notify_requesters_in_app && targets.length > 0) {
    const rows = targets.map((t) => ({
      recipient_id: t.id,
      request_id: null,
      request_reference: null,
      category: "public_announcement",
      title: `${event.priority === "urgent" ? "[URGENT] " : ""}${event.title}`,
      message: `${event.description || "New Registrar announcement."} (Date: ${event.start_date}${event.end_date !== event.start_date ? ` to ${event.end_date}` : ""})`,
      is_read: false,
    }));
    const { error } = await admin.from("notifications").insert(rows);
    if (!error) {
      notifiedInApp = rows.length;
    }
  }

  if (event.notify_requesters_email && targets.length > 0 && process.env.RESEND_API_KEY?.trim()) {
    for (const target of targets) {
      const res = await sendTransactionalEmail({
        to: target.email,
        subject: `[DNSC RegistrarDocs AI] ${event.title}`,
        html: `<p>Dear ${target.full_name},</p><p><strong>${event.title}</strong></p><p>${event.description || ""}</p><p><strong>Date:</strong> ${event.start_date}${event.end_date !== event.start_date ? ` – ${event.end_date}` : ""}</p>`,
        text: `${event.title}\n\n${event.description || ""}\nDate: ${event.start_date}`,
      });
      if (res.sent) emailsSent += 1;
    }
  }

  await admin
    .from("calendar_events")
    .update({ announcement_notified_at: new Date().toISOString() })
    .eq("id", event.id);

  return { notifiedInApp, emailsSent };
}

async function syncEventReminders(
  eventId: string,
  userId: string,
  startDate: string,
  startTime: string | null,
  allDay: boolean,
  reminders: CalendarReminderInput[]
): Promise<CalendarEventReminder[]> {
  const admin = createSupabaseAdminClient();

  // Remove only still-pending reminders for this event & user before re-inserting
  // so already-sent or dismissed reminders are preserved and never duplicated.
  await admin
    .from("calendar_event_reminders")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "pending");

  const toInsert: Array<{
    event_id: string;
    user_id: string;
    offset_minutes: number | null;
    custom_remind_at: string | null;
    trigger_at: string;
    delivery_in_app: boolean;
    delivery_email: boolean;
    status: "pending";
  }> = [];

  const seenTriggers = new Set<string>();
  for (const r of reminders) {
    const triggerAt = computeReminderTriggerIso({
      startDate,
      startTime,
      allDay,
      offsetMinutes: r.offsetMinutes ?? null,
      customRemindAt: r.customRemindAt ?? null,
    });
    if (!triggerAt || seenTriggers.has(triggerAt)) continue;
    seenTriggers.add(triggerAt);

    toInsert.push({
      event_id: eventId,
      user_id: userId,
      offset_minutes: r.customRemindAt ? null : (r.offsetMinutes ?? null),
      custom_remind_at: r.customRemindAt ? triggerAt : null,
      trigger_at: triggerAt,
      delivery_in_app: r.deliveryInApp ?? true,
      delivery_email: r.deliveryEmail ?? false,
      status: "pending",
    });
  }

  if (toInsert.length > 0) {
    await admin
      .from("calendar_event_reminders")
      .upsert(toInsert, {
        onConflict: "event_id,user_id,trigger_at",
        ignoreDuplicates: true,
      });
  }

  const { data } = await admin
    .from("calendar_event_reminders")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("trigger_at", { ascending: true });

  return ((data ?? []) as CalendarReminderRow[]).map((row) => rowToReminder(row));
}

export async function createCalendarEvent(
  user: SafeUser,
  input: CalendarEventWriteInput
): Promise<{
  ok: boolean;
  event?: CalendarEventItem;
  error?: string;
  status?: number;
}> {
  if (user.role === "requester") {
    return {
      ok: false,
      error: "Requesters cannot create calendar events.",
      status: 403,
    };
  }

  if (user.role === "staff") {
    if (input.visibility === "public") {
      return {
        ok: false,
        error: "Staff cannot publish public calendar events or announcements.",
        status: 403,
      };
    }
    if (!STAFF_ALLOWED_CATEGORIES.includes(input.category)) {
      return {
        ok: false,
        error:
          "Staff can only create Office Events, Office Deadlines, Internal Reminders, or Personal Reminders.",
        status: 403,
      };
    }
  }

  const title = input.title?.trim();
  if (!title) {
    return { ok: false, error: "Event title is required.", status: 400 };
  }
  const startDate = input.startDate?.trim();
  const endDate = (input.endDate?.trim() || startDate) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { ok: false, error: "Valid start and end dates (YYYY-MM-DD) are required.", status: 400 };
  }
  if (endDate < startDate) {
    return { ok: false, error: "End date cannot be earlier than start date.", status: 400 };
  }

  const allDay = input.allDay ?? true;
  const startTime = allDay ? null : (input.startTime?.trim() || "08:00");
  const endTime = allDay ? null : (input.endTime?.trim() || null);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .insert({
      title,
      description: input.description?.trim() ?? "",
      category: input.category,
      visibility: input.visibility,
      priority: input.priority ?? "normal",
      start_date: startDate,
      end_date: endDate,
      all_day: allDay,
      start_time: startTime,
      end_time: endTime,
      location: input.location?.trim() || null,
      recurrence: input.recurrence ?? "none",
      expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
      action_url: input.actionUrl?.trim() || null,
      source_type: "manual",
      source_label: input.sourceLabel?.trim() || null,
      source_url: input.sourceUrl?.trim() || null,
      is_active: input.isActive ?? true,
      notify_requesters_in_app:
        user.role === "admin" ? Boolean(input.notifyRequestersInApp) : false,
      notify_requesters_email:
        user.role === "admin" ? Boolean(input.notifyRequestersEmail) : false,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (isMissingTableError(error?.message)) {
      return {
        ok: false,
        error:
          "Calendar tables are not yet created in Supabase. Run migration 0008_calendar_events_reminders_announcements.sql first.",
        status: 503,
      };
    }
    return { ok: false, error: error?.message || "Unable to create event.", status: 500 };
  }

  const row = data as CalendarEventRow;
  let reminders: CalendarEventReminder[] = [];
  if (input.reminders && input.reminders.length > 0) {
    reminders = await syncEventReminders(
      row.id,
      user.id,
      row.start_date,
      normalizeTime(row.start_time),
      row.all_day,
      input.reminders
    );
  }

  if (user.role === "admin" && row.visibility === "public") {
    await deliverPublicAnnouncementToRequesters(row).catch(() => {});
  }

  if (user.role === "admin") {
    await recordAdminAuditLog({
      actor: user,
      action: "CREATE_CALENDAR_EVENT",
      entityType: "calendar_event",
      entityId: row.id,
      entityLabel: row.title,
      description: `Created ${row.visibility} calendar event "${row.title}" (${row.start_date}).`,
    }).catch(() => {});
  }

  const creatorNames = new Map([[user.id, user.fullName]]);
  const remMap = new Map([[row.id, reminders]]);
  return {
    ok: true,
    event: rowToEventItem(row, creatorNames, remMap),
    status: 201,
  };
}

export async function updateCalendarEvent(
  user: SafeUser,
  eventId: string,
  input: Partial<CalendarEventWriteInput>
): Promise<{
  ok: boolean;
  event?: CalendarEventItem;
  error?: string;
  status?: number;
}> {
  if (user.role === "requester") {
    return { ok: false, error: "Requesters cannot edit calendar events.", status: 403 };
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("calendar_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (fetchError || !existing) {
    return { ok: false, error: "Calendar event not found.", status: 404 };
  }

  const current = existing as CalendarEventRow;

  if (user.role === "staff") {
    if (
      current.created_by !== user.id ||
      current.source_type !== "manual" ||
      current.visibility === "public"
    ) {
      return {
        ok: false,
        error:
          "Staff can only edit their own manually created office or personal events.",
        status: 403,
      };
    }
    if (input.visibility === "public") {
      return {
        ok: false,
        error: "Staff cannot change event visibility to public.",
        status: 403,
      };
    }
    if (input.category && !STAFF_ALLOWED_CATEGORIES.includes(input.category)) {
      return {
        ok: false,
        error: "Staff cannot assign official academic, holiday, or public categories.",
        status: 403,
      };
    }
  }

  const nextStartDate = input.startDate?.trim() || current.start_date;
  const nextEndDate = input.endDate?.trim() || current.end_date;
  if (nextEndDate < nextStartDate) {
    return { ok: false, error: "End date cannot be earlier than start date.", status: 400 };
  }
  const nextAllDay = input.allDay ?? current.all_day;
  const nextStartTime = nextAllDay
    ? null
    : (input.startTime !== undefined ? input.startTime?.trim() || "08:00" : current.start_time);
  const nextEndTime = nextAllDay
    ? null
    : (input.endTime !== undefined ? input.endTime?.trim() || null : current.end_time);

  const patch: Record<string, unknown> = {
    updated_by: user.id,
    start_date: nextStartDate,
    end_date: nextEndDate,
    all_day: nextAllDay,
    start_time: nextStartTime,
    end_time: nextEndTime,
  };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.category !== undefined) patch.category = input.category;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.location !== undefined) patch.location = input.location?.trim() || null;
  if (input.recurrence !== undefined) patch.recurrence = input.recurrence;
  if (input.expiresAt !== undefined) {
    patch.expires_at = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;
  }
  if (input.actionUrl !== undefined) patch.action_url = input.actionUrl?.trim() || null;
  if (input.sourceLabel !== undefined) patch.source_label = input.sourceLabel?.trim() || null;
  if (input.sourceUrl !== undefined) patch.source_url = input.sourceUrl?.trim() || null;
  if (user.role === "admin" && input.isActive !== undefined) {
    patch.is_active = input.isActive;
  }
  if (user.role === "admin" && input.notifyRequestersInApp !== undefined) {
    patch.notify_requesters_in_app = input.notifyRequestersInApp;
  }
  if (user.role === "admin" && input.notifyRequestersEmail !== undefined) {
    patch.notify_requesters_email = input.notifyRequestersEmail;
  }

  const { data: updated, error: updateError } = await admin
    .from("calendar_events")
    .update(patch)
    .eq("id", eventId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return {
      ok: false,
      error: updateError?.message || "Unable to update calendar event.",
      status: 500,
    };
  }

  const row = updated as CalendarEventRow;
  let reminders: CalendarEventReminder[] = [];
  if (input.reminders !== undefined) {
    reminders = await syncEventReminders(
      row.id,
      user.id,
      row.start_date,
      normalizeTime(row.start_time),
      row.all_day,
      input.reminders
    );
  }

  if (user.role === "admin" && row.visibility === "public") {
    await deliverPublicAnnouncementToRequesters(row).catch(() => {});
  }

  if (user.role === "admin") {
    await recordAdminAuditLog({
      actor: user,
      action: "UPDATE_CALENDAR_EVENT",
      entityType: "calendar_event",
      entityId: row.id,
      entityLabel: row.title,
      description: `Updated calendar event "${row.title}" (${row.start_date}).`,
    }).catch(() => {});
  }

  const creatorNames = new Map([[user.id, user.fullName]]);
  const remMap = new Map([[row.id, reminders]]);
  return { ok: true, event: rowToEventItem(row, creatorNames, remMap), status: 200 };
}

export async function deleteCalendarEvent(
  user: SafeUser,
  eventId: string
): Promise<{ ok: boolean; error?: string; status?: number }> {
  if (user.role === "requester") {
    return { ok: false, error: "Requesters cannot delete calendar events.", status: 403 };
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("calendar_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (fetchError || !existing) {
    return { ok: false, error: "Calendar event not found.", status: 404 };
  }

  const current = existing as CalendarEventRow;

  if (user.role === "staff") {
    if (
      current.created_by !== user.id ||
      current.source_type !== "manual" ||
      current.visibility === "public"
    ) {
      return {
        ok: false,
        error: "Staff can only delete their own manually created office or personal events.",
        status: 403,
      };
    }
  }

  const { error } = await admin.from("calendar_events").delete().eq("id", eventId);
  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  if (user.role === "admin") {
    await recordAdminAuditLog({
      actor: user,
      action: "DELETE_CALENDAR_EVENT",
      entityType: "calendar_event",
      entityId: eventId,
      entityLabel: current.title,
      description: `Deleted calendar event "${current.title}" (${current.start_date}).`,
    }).catch(() => {});
  }

  return { ok: true, status: 200 };
}

export async function dismissCalendarReminder(
  user: SafeUser,
  reminderId: string
): Promise<{ ok: boolean; error?: string; status?: number }> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("calendar_event_reminders")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", reminderId);

  if (user.role !== "admin") {
    query = query.eq("user_id", user.id);
  }

  const { error } = await query;
  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }
  return { ok: true, status: 200 };
}

/**
 * Processes all due pending reminders (`trigger_at <= now()`).
 * Atomically transitions `pending -> sent` before inserting notifications so
 * concurrent requests or cron runs never send duplicate reminder notifications.
 */
export async function processDueCalendarReminders(): Promise<{
  processed: number;
  inAppSent: number;
  emailsSent: number;
}> {
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: dueRows, error } = await admin
    .from("calendar_event_reminders")
    .select("*")
    .eq("status", "pending")
    .lte("trigger_at", nowIso)
    .order("trigger_at", { ascending: true })
    .limit(50);

  if (error || !dueRows || dueRows.length === 0) {
    return { processed: 0, inAppSent: 0, emailsSent: 0 };
  }

  let processed = 0;
  let inAppSent = 0;
  let emailsSent = 0;

  for (const rem of dueRows as CalendarReminderRow[]) {
    // Atomic claim: only succeed if still 'pending'
    const { data: claimed } = await admin
      .from("calendar_event_reminders")
      .update({ status: "sent", triggered_at: nowIso })
      .eq("id", rem.id)
      .eq("status", "pending")
      .select("*")
      .single();

    if (!claimed) continue;
    processed += 1;

    const [{ data: evData }, { data: userData }] = await Promise.all([
      admin
        .from("calendar_events")
        .select("title, start_date, start_time, all_day, location")
        .eq("id", rem.event_id)
        .single(),
      admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", rem.user_id)
        .single(),
    ]);

    const ev = evData as {
      title: string;
      start_date: string;
      start_time: string | null;
      all_day: boolean;
      location: string | null;
    } | null;

    if (!ev) continue;

    const whenText = ev.all_day
      ? `${ev.start_date} (All day)`
      : `${ev.start_date} at ${normalizeTime(ev.start_time) ?? "08:00"} (PHT)`;

    if (rem.delivery_in_app) {
      const notif = await createNotification({
        recipientId: rem.user_id,
        requestId: null,
        requestReference: null,
        category: "calendar_reminder",
        title: `Reminder: ${ev.title}`,
        message: `Scheduled for ${whenText}${ev.location ? ` · Location: ${ev.location}` : ""}.`,
      });
      if (notif) {
        inAppSent += 1;
        await admin
          .from("calendar_event_reminders")
          .update({ notification_id: notif.id })
          .eq("id", rem.id);
      }
    }

    const profile = userData as { email: string; full_name: string } | null;
    if (rem.delivery_email && profile?.email && process.env.RESEND_API_KEY?.trim()) {
      const emailRes = await sendTransactionalEmail({
        to: profile.email,
        subject: `[Reminder] ${ev.title} — RegistrarDocs AI`,
        html: `<p>Hello ${profile.full_name},</p><p>This is a reminder for your scheduled calendar event:</p><p><strong>${ev.title}</strong><br/>When: ${whenText}${ev.location ? `<br/>Location: ${ev.location}` : ""}</p>`,
        text: `Reminder: ${ev.title}\nWhen: ${whenText}${ev.location ? `\nLocation: ${ev.location}` : ""}`,
      });
      if (emailRes.sent) emailsSent += 1;
    }
  }

  return { processed, inAppSent, emailsSent };
}
