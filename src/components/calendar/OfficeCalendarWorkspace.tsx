"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  CALENDAR_CATEGORY_META,
  REMINDER_OFFSET_OPTIONS,
  STAFF_ALLOWED_CATEGORIES,
  type CalendarEventCategory,
  type CalendarEventItem,
  type CalendarEventPriority,
  type CalendarEventReminder,
  type CalendarEventVisibility,
  type CalendarRecurrence,
} from "@/types/calendar";

interface OfficeCalendarWorkspaceProps {
  role: "admin" | "staff";
  currentUserId: string;
  initialEvents: CalendarEventItem[];
  initialReminders: CalendarEventReminder[];
  initialSchemaReady: boolean;
  initialDateIso: string;
}

type CalendarViewMode = "month" | "week" | "day" | "agenda";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const ALL_CATEGORIES = Object.keys(
  CALENDAR_CATEGORY_META
) as CalendarEventCategory[];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(date: Date, delta: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (ymd: string) =>
    parseYmd(ymd).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return startDate === endDate
    ? fmt(startDate)
    : `${fmt(startDate)} – ${fmt(endDate)}`;
}

function formatManilaDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + " PHT"
  );
}

function visibilityLabel(v: CalendarEventVisibility): string {
  if (v === "public") return "Public (Requesters)";
  if (v === "office") return "Office (Admin & Staff)";
  return "Personal (Only Me)";
}

interface FormState {
  id: string | null;
  title: string;
  description: string;
  category: CalendarEventCategory;
  visibility: CalendarEventVisibility;
  priority: CalendarEventPriority;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  recurrence: CalendarRecurrence;
  expiresAt: string;
  actionUrl: string;
  sourceLabel: string;
  sourceUrl: string;
  isActive: boolean;
  notifyRequestersInApp: boolean;
  notifyRequestersEmail: boolean;
  reminderOffsets: number[];
  customRemindAt: string;
  reminderInApp: boolean;
  reminderEmail: boolean;
}

export function OfficeCalendarWorkspace({
  role,
  currentUserId,
  initialEvents,
  initialReminders,
  initialSchemaReady,
  initialDateIso,
}: OfficeCalendarWorkspaceProps) {
  const today = useMemo(() => {
    const parsed = new Date(initialDateIso);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [initialDateIso]);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const [events, setEvents] = useState<CalendarEventItem[]>(initialEvents);
  const [reminders, setReminders] =
    useState<CalendarEventReminder[]>(initialReminders);
  const [schemaReady, setSchemaReady] = useState(initialSchemaReady);

  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(
    null
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  // Action states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingSeed, setIsSyncingSeed] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => ({
    id: null,
    title: "",
    description: "",
    category: role === "admin" ? "office_event" : "personal_reminder",
    visibility: role === "admin" ? "office" : "personal",
    priority: "normal",
    startDate: todayKey,
    endDate: todayKey,
    allDay: true,
    startTime: "08:00",
    endTime: "09:00",
    location: "",
    recurrence: "none",
    expiresAt: "",
    actionUrl: "",
    sourceLabel: "",
    sourceUrl: "",
    isActive: true,
    notifyRequestersInApp: false,
    notifyRequestersEmail: false,
    reminderOffsets: [],
    customRemindAt: "",
    reminderInApp: true,
    reminderEmail: false,
  }));

  const allowedCategories =
    role === "admin" ? ALL_CATEGORIES : STAFF_ALLOWED_CATEGORIES;

  const canModifyEvent = (ev: CalendarEventItem): boolean => {
    if (role === "admin") return true;
    return (
      ev.createdBy === currentUserId &&
      ev.sourceType === "manual" &&
      ev.visibility !== "public"
    );
  };

  const reloadCalendar = async (includeInactiveFlag = showInactive) => {
    setIsRefreshing(true);
    try {
      const qs =
        role === "admin" && includeInactiveFlag ? "?includeInactive=true" : "";
      const res = await fetch(`/api/calendar/events${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        events?: CalendarEventItem[];
        reminders?: CalendarEventReminder[];
        schemaReady?: boolean;
      };
      if (Array.isArray(data.events)) {
        setEvents(data.events);
        if (selectedEvent) {
          const updated = data.events.find((e) => e.id === selectedEvent.id);
          setSelectedEvent(updated ?? null);
        }
      }
      if (Array.isArray(data.reminders)) {
        setReminders(data.reminders);
      }
      if (typeof data.schemaReady === "boolean") {
        setSchemaReady(data.schemaReady);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncOfficialData = async () => {
    setIsSyncingSeed(true);
    setFeedbackBanner(null);
    try {
      const res = await fetch("/api/calendar/seed", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        insertedOrChecked?: number;
        error?: string;
      };
      if (!res.ok) {
        setFeedbackBanner({
          type: "error",
          text: data.error || "Unable to sync official DNSC calendar data.",
        });
      } else {
        setFeedbackBanner({
          type: "success",
          text: `Synced ${data.insertedOrChecked ?? 0} verified DNSC academic & holiday entries without duplicates.`,
        });
        await reloadCalendar();
      }
    } finally {
      setIsSyncingSeed(false);
    }
  };

  const handleProcessReminders = async () => {
    setFeedbackBanner(null);
    const res = await fetch("/api/calendar/reminders/process", {
      method: "POST",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        processed: number;
        inAppSent: number;
      };
      setFeedbackBanner({
        type: "success",
        text:
          data.processed > 0
            ? `Delivered ${data.processed} due reminder(s) to in-app notifications.`
            : "All due reminders are up to date.",
      });
      await reloadCalendar();
    }
  };

  const handleDismissReminder = async (reminderId: string) => {
    const res = await fetch(`/api/calendar/reminders/${reminderId}`, {
      method: "PATCH",
    });
    if (res.ok) {
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    }
  };

  const openCreateModal = (preset?: {
    date?: string;
    announcement?: boolean;
  }) => {
    const targetDate = preset?.date || selectedDateKey || todayKey;
    const isAnnouncement = Boolean(preset?.announcement && role === "admin");
    setFormError(null);
    setForm({
      id: null,
      title: "",
      description: "",
      category: isAnnouncement
        ? "public_announcement"
        : role === "admin"
          ? "office_event"
          : "personal_reminder",
      visibility: isAnnouncement
        ? "public"
        : role === "admin"
          ? "office"
          : "personal",
      priority: isAnnouncement ? "important" : "normal",
      startDate: targetDate,
      endDate: targetDate,
      allDay: true,
      startTime: "08:00",
      endTime: "09:00",
      location: "",
      recurrence: "none",
      expiresAt: "",
      actionUrl: "",
      sourceLabel: "",
      sourceUrl: "",
      isActive: true,
      notifyRequestersInApp: isAnnouncement,
      notifyRequestersEmail: false,
      reminderOffsets: [60],
      customRemindAt: "",
      reminderInApp: true,
      reminderEmail: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (ev: CalendarEventItem) => {
    setFormError(null);
    const existingOffsets = (ev.reminders ?? [])
      .map((r) => r.offsetMinutes)
      .filter((m): m is number => typeof m === "number");
    setForm({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      category: ev.category,
      visibility: ev.visibility,
      priority: ev.priority,
      startDate: ev.startDate,
      endDate: ev.endDate,
      allDay: ev.allDay,
      startTime: ev.startTime || "08:00",
      endTime: ev.endTime || "09:00",
      location: ev.location || "",
      recurrence: ev.recurrence,
      expiresAt: ev.expiresAt ? ev.expiresAt.slice(0, 16) : "",
      actionUrl: ev.actionUrl || "",
      sourceLabel: ev.sourceLabel || "",
      sourceUrl: ev.sourceUrl || "",
      isActive: ev.isActive,
      notifyRequestersInApp: ev.notifyRequestersInApp,
      notifyRequestersEmail: ev.notifyRequestersEmail,
      reminderOffsets: existingOffsets,
      customRemindAt: "",
      reminderInApp: true,
      reminderEmail: false,
    });
    setModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    const reminderInputs = [
      ...form.reminderOffsets.map((minutes) => ({
        offsetMinutes: minutes,
        deliveryInApp: form.reminderInApp,
        deliveryEmail: form.reminderEmail,
      })),
      ...(form.customRemindAt.trim()
        ? [
            {
              customRemindAt: form.customRemindAt.trim(),
              deliveryInApp: form.reminderInApp,
              deliveryEmail: form.reminderEmail,
            },
          ]
        : []),
    ];

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      visibility: form.visibility,
      priority: form.priority,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      allDay: form.allDay,
      startTime: form.allDay ? null : form.startTime,
      endTime: form.allDay ? null : form.endTime,
      location: form.location || null,
      recurrence: form.recurrence,
      expiresAt: form.expiresAt ? `${form.expiresAt}:00+08:00` : null,
      actionUrl: form.actionUrl || null,
      sourceLabel: form.sourceLabel || null,
      sourceUrl: form.sourceUrl || null,
      isActive: form.isActive,
      notifyRequestersInApp:
        role === "admin" && form.visibility === "public"
          ? form.notifyRequestersInApp
          : false,
      notifyRequestersEmail:
        role === "admin" && form.visibility === "public"
          ? form.notifyRequestersEmail
          : false,
      reminders: reminderInputs,
    };

    try {
      const url = form.id
        ? `/api/calendar/events/${form.id}`
        : "/api/calendar/events";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        event?: CalendarEventItem;
        error?: string;
      };
      if (!res.ok) {
        setFormError(data.error || "Unable to save calendar event.");
        return;
      }
      setModalOpen(false);
      setFeedbackBanner({
        type: "success",
        text: form.id
          ? `Updated "${form.title}".`
          : `Created "${form.title}".`,
      });
      await reloadCalendar();
      if (data.event) setSelectedEvent(data.event);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (ev: CalendarEventItem) => {
    const res = await fetch(`/api/calendar/events/${ev.id}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedbackBanner({
        type: "error",
        text: data.error || "Unable to delete event.",
      });
      return;
    }
    setSelectedEvent(null);
    setFeedbackBanner({ type: "success", text: `Deleted "${ev.title}".` });
    await reloadCalendar();
  };

  const handleToggleActive = async (ev: CalendarEventItem) => {
    const res = await fetch(`/api/calendar/events/${ev.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ev.isActive }),
    });
    if (res.ok) {
      setFeedbackBanner({
        type: "success",
        text: ev.isActive
          ? `Disabled "${ev.title}" from active calendar display.`
          : `Re-enabled "${ev.title}".`,
      });
      await reloadCalendar();
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (!showInactive && !ev.isActive) return false;
      if (categoryFilter !== "all" && ev.category !== categoryFilter) {
        return false;
      }
      if (visibilityFilter !== "all" && ev.visibility !== visibilityFilter) {
        return false;
      }
      if (q) {
        const hay = `${ev.title} ${ev.description} ${ev.location ?? ""} ${ev.sourceLabel ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, searchQuery, categoryFilter, visibilityFilter, showInactive]);

  const eventsOnDate = (dateKey: string): CalendarEventItem[] =>
    filteredEvents.filter(
      (ev) => dateKey >= ev.startDate && dateKey <= ev.endDate
    );

  // Navigation helpers
  const viewYear = anchorDate.getFullYear();
  const viewMonth = anchorDate.getMonth();

  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return anchorDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const start = addDays(anchorDate, -anchorDate.getDay());
      const end = addDays(start, 6);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (viewMode === "day") {
      return anchorDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    return `Agenda · ${anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  }, [viewMode, anchorDate]);

  const handlePrev = () => {
    if (viewMode === "month" || viewMode === "agenda") {
      setAnchorDate(new Date(viewYear, viewMonth - 1, 1));
    } else if (viewMode === "week") {
      setAnchorDate(addDays(anchorDate, -7));
    } else {
      const next = addDays(anchorDate, -1);
      setAnchorDate(next);
      setSelectedDateKey(toDateKey(next));
    }
  };

  const handleNext = () => {
    if (viewMode === "month" || viewMode === "agenda") {
      setAnchorDate(new Date(viewYear, viewMonth + 1, 1));
    } else if (viewMode === "week") {
      setAnchorDate(addDays(anchorDate, 7));
    } else {
      const next = addDays(anchorDate, 1);
      setAnchorDate(next);
      setSelectedDateKey(toDateKey(next));
    }
  };

  const handleToday = () => {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setAnchorDate(t);
    setSelectedDateKey(todayKey);
  };

  // Month cells
  const monthCells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    return [
      ...Array.from({ length: firstDow }, () => null),
      ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];
  }, [viewYear, viewMonth]);

  // Week days
  const weekDays = useMemo(() => {
    const start = addDays(anchorDate, -anchorDate.getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchorDate]);

  // Upcoming events for sidebar
  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => e.endDate >= todayKey)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 6);
  }, [filteredEvents, todayKey]);

  // Agenda list (current month)
  const agendaEvents = useMemo(() => {
    const monthStart = toDateKey(new Date(viewYear, viewMonth, 1));
    const monthEnd = toDateKey(new Date(viewYear, viewMonth + 1, 0));
    return filteredEvents
      .filter((e) => e.endDate >= monthStart && e.startDate <= monthEnd)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [filteredEvents, viewYear, viewMonth]);

  const toggleOffset = (minutes: number) => {
    setForm((prev) => ({
      ...prev,
      reminderOffsets: prev.reminderOffsets.includes(minutes)
        ? prev.reminderOffsets.filter((m) => m !== minutes)
        : [...prev.reminderOffsets, minutes],
    }));
  };

  return (
    <section
      aria-labelledby="office-calendar-heading"
      className="rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="office-calendar-heading"
              className="text-base font-bold text-[#25352B] sm:text-lg"
            >
              {role === "admin"
                ? "Academic Calendar, Office Scheduling & Announcements"
                : "DNSC Academic Calendar & Staff Schedule"}
            </h2>
            <p className="text-xs text-slate-500">
              {role === "admin"
                ? "Manage DNSC AY 2026–2027 dates, Philippine holidays, office deadlines, reminders, and public notices (Asia/Manila)."
                : "View official academic dates, shared office events, and manage your personal and office reminders (Asia/Manila)."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {role === "admin" && (
            <>
              <button
                type="button"
                onClick={handleSyncOfficialData}
                disabled={isSyncingSeed}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#25352B] transition-colors hover:border-[#174D32]/40 hover:bg-[#F5F5EF] disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncingSeed ? "animate-spin" : ""}`}
                />
                <span>Sync Official Data</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateModal({ announcement: true })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32]/30 bg-[#E6EFE8] px-3 py-2 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#174D32] hover:text-white"
              >
                <Megaphone className="h-3.5 w-3.5" />
                <span>Public Announcement</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#246B45]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{role === "admin" ? "New Event" : "New Reminder / Event"}</span>
          </button>
        </div>
      </div>

      {/* Schema notice if migration 0008 is not yet applied */}
      {!schemaReady && (
        <div className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50/80 px-5 py-3 text-xs text-amber-900 sm:px-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">
              Read-Only Preview Mode (Migration 0008 Pending)
            </p>
            <p className="mt-0.5 text-amber-800">
              Showing verified DNSC AY 2026–2027 academic dates and Philippine
              holidays. Run{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">
                supabase/migrations/0008_calendar_events_reminders_announcements.sql
              </code>{" "}
              in Supabase SQL Editor to persist custom events, reminders, and
              announcements.
            </p>
          </div>
        </div>
      )}

      {feedbackBanner && (
        <div
          className={`flex items-center justify-between gap-2 border-b px-5 py-2.5 text-xs sm:px-6 ${
            feedbackBanner.type === "success"
              ? "border-[#174D32]/20 bg-[#E6EFE8]/70 text-[#174D32]"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span className="font-medium">{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="rounded p-0.5 hover:bg-black/5"
            aria-label="Dismiss notice"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Navigation, View Switcher & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#F5F5EF]/50 px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#174D32] hover:border-[#174D32]/40 hover:bg-[#E6EFE8]"
          >
            Today
          </button>
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous"
              className="p-1.5 text-[#25352B] hover:bg-[#E6EFE8] hover:text-[#174D32]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] px-2 text-center text-xs font-bold text-[#25352B] sm:text-sm">
              {headerTitle}
            </span>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next"
              className="p-1.5 text-[#25352B] hover:bg-[#E6EFE8] hover:text-[#174D32]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Calendar view mode"
            className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
          >
            {(["month", "week", "day", "agenda"] as CalendarViewMode[]).map(
              (mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                    viewMode === mode
                      ? "bg-[#174D32] text-white"
                      : "text-slate-600 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                  }`}
                >
                  {mode}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-40 rounded-lg border border-slate-200 bg-white py-1.5 pr-2.5 pl-8 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none sm:w-48"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CALENDAR_CATEGORY_META[cat].label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by visibility"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
          >
            <option value="all">All Visibility</option>
            <option value="public">Public</option>
            <option value="office">Office / Internal</option>
            <option value="personal">Personal</option>
          </select>

          {role === "admin" && (
            <button
              type="button"
              onClick={async () => {
                const next = !showInactive;
                setShowInactive(next);
                await reloadCalendar(next);
              }}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                showInactive
                  ? "border-[#174D32] bg-[#E6EFE8] text-[#174D32]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-[#F5F5EF]"
              }`}
            >
              {showInactive ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              <span>Disabled</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-12">
        {/* Calendar Surface */}
        <div className="min-w-0 lg:col-span-8">
          {viewMode === "month" && (
            <div>
              <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase"
                  >
                    {day}
                  </div>
                ))}

                {monthCells.map((day, idx) => {
                  if (day === null) {
                    return (
                      <div key={`empty-${idx}`} className="min-h-[68px] sm:min-h-[82px]" />
                    );
                  }
                  const dateKey = toDateKey(new Date(viewYear, viewMonth, day));
                  const dayEvents = eventsOnDate(dateKey);
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDateKey;

                  return (
                    <div
                      key={dateKey}
                      onClick={() => {
                        setSelectedDateKey(dateKey);
                        if (dayEvents[0]) setSelectedEvent(dayEvents[0]);
                      }}
                      className={`group flex min-h-[68px] cursor-pointer flex-col rounded-xl border p-1.5 text-left transition-colors sm:min-h-[82px] ${
                        isToday
                          ? "border-[#174D32] bg-[#E6EFE8]/65"
                          : isSelected
                            ? "border-[#246B45] bg-[#F5F5EF] ring-1 ring-[#246B45]"
                            : "border-slate-100 bg-white hover:border-[#174D32]/30 hover:bg-[#F5F5EF]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                            isToday
                              ? "bg-[#174D32] text-white"
                              : "text-[#25352B]"
                          }`}
                        >
                          {day}
                        </span>
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            +{dayEvents.length - 2}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => {
                          const meta = CALENDAR_CATEGORY_META[ev.category];
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDateKey(dateKey);
                                setSelectedEvent(ev);
                              }}
                              className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold transition-opacity ${meta.badgeClass} ${
                                !ev.isActive ? "line-through opacity-50" : ""
                              }`}
                              title={ev.title}
                            >
                              {ev.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "week" && (
            <div className="grid gap-2 sm:grid-cols-7">
              {weekDays.map((d) => {
                const key = toDateKey(d);
                const list = eventsOnDate(key);
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-2.5 ${
                      isToday
                        ? "border-[#174D32] bg-[#E6EFE8]/50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {WEEKDAYS[d.getDay()]}
                      </span>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isToday
                            ? "bg-[#174D32] text-white"
                            : "text-[#25352B]"
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {list.length === 0 ? (
                        <p className="text-[11px] text-slate-400">No events</p>
                      ) : (
                        list.map((ev) => {
                          const meta = CALENDAR_CATEGORY_META[ev.category];
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => setSelectedEvent(ev)}
                              className={`block w-full rounded-lg border-l-3 p-1.5 text-left text-[11px] font-semibold ${meta.badgeClass} ${meta.borderClass}`}
                            >
                              <p className="line-clamp-2">{ev.title}</p>
                              {!ev.allDay && ev.startTime && (
                                <p className="mt-0.5 text-[10px] opacity-80">
                                  {ev.startTime} PHT
                                </p>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "day" && (
            <div className="rounded-xl border border-slate-200 bg-[#F5F5EF]/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-[#25352B] uppercase">
                  Schedule for {toDateKey(anchorDate)}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    openCreateModal({ date: toDateKey(anchorDate) })
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-[#174D32] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#246B45]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add on this day</span>
                </button>
              </div>
              {eventsOnDate(toDateKey(anchorDate)).length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">
                  No events or reminders scheduled on this date.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {eventsOnDate(toDateKey(anchorDate)).map((ev) => {
                    const meta = CALENDAR_CATEGORY_META[ev.category];
                    return (
                      <li key={ev.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className={`w-full rounded-xl border border-l-4 bg-white p-3.5 text-left shadow-2xs transition-colors hover:bg-[#E6EFE8]/30 ${meta.borderClass}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {ev.allDay
                                ? "All Day"
                                : `${ev.startTime ?? "08:00"}${ev.endTime ? `–${ev.endTime}` : ""} PHT`}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-bold text-[#25352B]">
                            {ev.title}
                          </p>
                          {ev.description && (
                            <p className="mt-1 text-xs text-slate-600">
                              {ev.description}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {viewMode === "agenda" && (
            <div className="rounded-xl border border-slate-200 bg-white">
              {agendaEvents.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">
                  No matching events in this month.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {agendaEvents.map((ev) => {
                    const meta = CALENDAR_CATEGORY_META[ev.category];
                    return (
                      <li key={ev.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F5F5EF]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${meta.dotClass}`}
                              />
                              <span className="text-[11px] font-bold text-[#174D32]">
                                {formatDateRange(ev.startDate, ev.endDate)}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                              >
                                {meta.shortLabel}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {ev.visibility}
                              </span>
                            </div>
                            <p
                              className={`mt-1 text-xs font-bold text-[#25352B] ${
                                !ev.isActive ? "line-through opacity-50" : ""
                              }`}
                            >
                              {ev.title}
                            </p>
                          </div>
                          {!ev.allDay && ev.startTime && (
                            <span className="shrink-0 text-[11px] font-medium text-slate-500">
                              {ev.startTime} PHT
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Category Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
            {ALL_CATEGORIES.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${CALENDAR_CATEGORY_META[cat].dotClass}`}
                />
                {CALENDAR_CATEGORY_META[cat].label}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side Panel: Selected Event Details + Reminders + Upcoming */}
        <div className="space-y-4 lg:col-span-4">
          {/* Selected Event Details */}
          {selectedEvent && (
            <div className="rounded-xl border border-[#174D32]/25 bg-[#F5F5EF]/75 p-4 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CALENDAR_CATEGORY_META[selectedEvent.category].badgeClass}`}
                  >
                    {CALENDAR_CATEGORY_META[selectedEvent.category].label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {selectedEvent.visibility === "personal" ? (
                      <Lock className="h-2.5 w-2.5" />
                    ) : (
                      <Users className="h-2.5 w-2.5" />
                    )}
                    {visibilityLabel(selectedEvent.visibility)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="rounded p-0.5 text-slate-500 hover:bg-white"
                  aria-label="Close details"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <h3 className="mt-2 text-sm font-bold text-[#25352B]">
                {selectedEvent.title}
              </h3>

              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#174D32]">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDateRange(
                    selectedEvent.startDate,
                    selectedEvent.endDate
                  )}
                  {!selectedEvent.allDay && selectedEvent.startTime
                    ? ` · ${selectedEvent.startTime}${selectedEvent.endTime ? `–${selectedEvent.endTime}` : ""} PHT`
                    : " · All Day"}
                </span>
              </p>

              {selectedEvent.location && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-600">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </p>
              )}

              {selectedEvent.description && (
                <p className="mt-2 leading-relaxed text-slate-700">
                  {selectedEvent.description}
                </p>
              )}

              {selectedEvent.sourceLabel && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Source:{" "}
                  {selectedEvent.sourceUrl ? (
                    <a
                      href={selectedEvent.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold text-[#174D32] hover:underline"
                    >
                      {selectedEvent.sourceLabel}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : (
                    <span className="font-medium">
                      {selectedEvent.sourceLabel}
                    </span>
                  )}
                  {selectedEvent.verifiedAt
                    ? ` (Verified ${selectedEvent.verifiedAt})`
                    : ""}
                </p>
              )}

              {selectedEvent.createdByName && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Created by: {selectedEvent.createdByName}
                </p>
              )}

              {schemaReady && canModifyEvent(selectedEvent) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedEvent)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#25352B] hover:border-[#174D32]/40 hover:text-[#174D32]"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  {role === "admin" && selectedEvent.sourceType !== "manual" && (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(selectedEvent)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {selectedEvent.isActive ? (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Disable</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Enable</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(selectedEvent)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active & Upcoming Reminders */}
          <div className="rounded-xl border border-slate-200 bg-[#F5F5EF]/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#25352B] uppercase">
                <Bell className="h-3.5 w-3.5 text-[#174D32]" />
                <span>My Reminders ({reminders.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleProcessReminders}
                disabled={isRefreshing}
                className="text-[11px] font-semibold text-[#174D32] hover:text-[#246B45]"
              >
                Check Due
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="mt-2.5 text-xs text-slate-500">
                No active reminders scheduled. Set reminder intervals when
                creating an event.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {reminders.slice(0, 5).map((rem) => (
                  <li
                    key={rem.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#25352B]">
                        {rem.eventTitle || "Scheduled Reminder"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatManilaDateTime(rem.triggerAt)}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          rem.status === "sent"
                            ? "bg-[#E6EFE8] text-[#174D32]"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {rem.status === "sent" ? "Delivered" : "Scheduled"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismissReminder(rem.id)}
                      title="Dismiss reminder"
                      className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Dismiss
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="rounded-xl border border-slate-200 bg-[#F5F5EF]/60 p-4">
            <h3 className="text-xs font-bold tracking-wider text-[#25352B] uppercase">
              Upcoming Schedule
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="mt-2.5 text-xs text-slate-500">
                No upcoming events match your filters.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {upcomingEvents.map((ev) => {
                  const meta = CALENDAR_CATEGORY_META[ev.category];
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full rounded-lg border border-l-4 bg-white p-2.5 text-left transition-colors hover:bg-[#E6EFE8]/35 ${meta.borderClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#174D32]">
                            {formatDateRange(ev.startDate, ev.endDate)}
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                          >
                            {meta.shortLabel}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-[#25352B]">
                          {ev.title}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Event Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/50 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3
                id="calendar-modal-title"
                className="text-base font-bold text-[#25352B]"
              >
                {form.id ? "Edit Calendar Event" : "Create Calendar Event"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 p-5 text-xs">
              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                  {formError}
                </div>
              )}

              <div>
                <label className="mb-1 block font-semibold text-[#25352B]">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Registrar Office Closed — Holiday / Staff Sync"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#25352B]">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as CalendarEventCategory,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                  >
                    {allowedCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {CALENDAR_CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[#25352B]">
                    Visibility
                  </label>
                  <select
                    value={form.visibility}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        visibility: e.target.value as CalendarEventVisibility,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                  >
                    {role === "admin" && (
                      <option value="public">Public (Requester-visible)</option>
                    )}
                    <option value="office">Office / Internal (Admin &amp; Staff)</option>
                    <option value="personal">Personal (Only Me)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[#25352B]">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target.value as CalendarEventPriority,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-[#25352B]">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        startDate: e.target.value,
                        endDate:
                          form.endDate < e.target.value
                            ? e.target.value
                            : form.endDate,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#25352B]">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 font-semibold text-[#25352B]">
                  <input
                    type="checkbox"
                    checked={form.allDay}
                    onChange={(e) =>
                      setForm({ ...form, allDay: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#174D32] focus:ring-[#174D32]"
                  />
                  <span>All-day event</span>
                </label>

                {!form.allDay && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm({ ...form, startTime: e.target.value })
                      }
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                    <span className="text-slate-500">to</span>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm({ ...form, endTime: e.target.value })
                      }
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                    <span className="text-[11px] text-slate-500">(PHT)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#25352B]">
                  Description / Message
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Details, instructions, or announcement message..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#25352B]">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="e.g., DNSC Registrar Window 1"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#25352B]">
                    Recurrence
                  </label>
                  <select
                    value={form.recurrence}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recurrence: e.target.value as CalendarRecurrence,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#25352B]">
                    Expires At (Optional, PHT)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm({ ...form, expiresAt: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Reminders Section */}
              <div className="rounded-xl border border-slate-200 bg-[#F5F5EF]/60 p-3.5">
                <p className="font-bold text-[#25352B]">
                  Reminders (Philippine Time — Asia/Manila)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {REMINDER_OFFSET_OPTIONS.map((opt) => {
                    const checked = form.reminderOffsets.includes(opt.minutes);
                    return (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => toggleOffset(opt.minutes)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          checked
                            ? "border-[#174D32] bg-[#174D32] text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-[#174D32]/40"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Custom Reminder Date &amp; Time (PHT)
                    </label>
                    <input
                      type="datetime-local"
                      value={form.customRemindAt}
                      onChange={(e) =>
                        setForm({ ...form, customRemindAt: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-1.5">
                    <label className="inline-flex items-center gap-2 text-[11px] font-medium text-[#25352B]">
                      <input
                        type="checkbox"
                        checked={form.reminderInApp}
                        onChange={(e) =>
                          setForm({ ...form, reminderInApp: e.target.checked })
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#174D32]"
                      />
                      <span>Send in-app reminder notification</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-[11px] font-medium text-[#25352B]">
                      <input
                        type="checkbox"
                        checked={form.reminderEmail}
                        onChange={(e) =>
                          setForm({ ...form, reminderEmail: e.target.checked })
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#174D32]"
                      />
                      <span>Also send email reminder (when email provider configured)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Admin Public Announcement Delivery Options */}
              {role === "admin" && form.visibility === "public" && (
                <div className="rounded-xl border border-[#174D32]/20 bg-[#E6EFE8]/50 p-3.5">
                  <p className="font-bold text-[#174D32]">
                    Requester Announcement Delivery
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <label className="flex items-center gap-2 text-[11px] font-medium text-[#25352B]">
                      <input
                        type="checkbox"
                        checked={form.notifyRequestersInApp}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            notifyRequestersInApp: e.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#174D32]"
                      />
                      <span>
                        Notify active Requesters via in-app notifications (once)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] font-medium text-[#25352B]">
                      <input
                        type="checkbox"
                        checked={form.notifyRequestersEmail}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            notifyRequestersEmail: e.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#174D32]"
                      />
                      <span>
                        Also email active Requesters (only if email delivery is configured)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#246B45] disabled:opacity-60"
                >
                  {isSaving
                    ? "Saving..."
                    : form.id
                      ? "Save Changes"
                      : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
