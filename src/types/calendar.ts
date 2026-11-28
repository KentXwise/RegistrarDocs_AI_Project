export type CalendarEventCategory =
  | "academic_calendar"
  | "national_holiday"
  | "local_holiday"
  | "office_event"
  | "office_deadline"
  | "internal_reminder"
  | "public_announcement"
  | "collection_notice"
  | "personal_reminder";

export type CalendarEventVisibility = "public" | "office" | "personal";

export type CalendarEventPriority = "normal" | "important" | "urgent";

export type CalendarRecurrence =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export type CalendarSourceType =
  | "dnsc_academic_calendar"
  | "official_holiday"
  | "manual";

export type CalendarReminderStatus = "pending" | "sent" | "dismissed";

export interface CalendarEventReminder {
  id: string;
  eventId: string;
  userId: string;
  offsetMinutes: number | null;
  customRemindAt: string | null;
  triggerAt: string;
  deliveryInApp: boolean;
  deliveryEmail: boolean;
  status: CalendarReminderStatus;
  triggeredAt: string | null;
  dismissedAt: string | null;
  notificationId: string | null;
  createdAt: string;
  eventTitle?: string;
  eventStartDate?: string;
  eventStartTime?: string | null;
  eventCategory?: CalendarEventCategory;
}

export interface CalendarEventItem {
  id: string;
  seedKey: string | null;
  title: string;
  description: string;
  category: CalendarEventCategory;
  visibility: CalendarEventVisibility;
  priority: CalendarEventPriority;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  allDay: boolean;
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  location: string | null;
  recurrence: CalendarRecurrence;
  expiresAt: string | null;
  actionUrl: string | null;
  sourceType: CalendarSourceType;
  sourceLabel: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  isActive: boolean;
  notifyRequestersInApp: boolean;
  notifyRequestersEmail: boolean;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  reminders?: CalendarEventReminder[];
}

export interface CalendarCategoryMeta {
  key: CalendarEventCategory;
  label: string;
  shortLabel: string;
  dotClass: string;
  badgeClass: string;
  borderClass: string;
  staffAllowed: boolean;
}

export const CALENDAR_CATEGORY_META: Record<
  CalendarEventCategory,
  CalendarCategoryMeta
> = {
  academic_calendar: {
    key: "academic_calendar",
    label: "Academic Calendar",
    shortLabel: "Academic",
    dotClass: "bg-[#174D32]",
    badgeClass: "bg-[#E6EFE8] text-[#174D32] border border-[#174D32]/20",
    borderClass: "border-l-[#174D32]",
    staffAllowed: false,
  },
  national_holiday: {
    key: "national_holiday",
    label: "National Holiday",
    shortLabel: "Nat'l Holiday",
    dotClass: "bg-rose-600",
    badgeClass: "bg-rose-50 text-rose-800 border border-rose-200",
    borderClass: "border-l-rose-600",
    staffAllowed: false,
  },
  local_holiday: {
    key: "local_holiday",
    label: "Local Holiday",
    shortLabel: "Local Holiday",
    dotClass: "bg-orange-600",
    badgeClass: "bg-orange-50 text-orange-800 border border-orange-200",
    borderClass: "border-l-orange-600",
    staffAllowed: false,
  },
  office_event: {
    key: "office_event",
    label: "Office Event",
    shortLabel: "Office Event",
    dotClass: "bg-teal-700",
    badgeClass: "bg-teal-50 text-teal-900 border border-teal-200",
    borderClass: "border-l-teal-700",
    staffAllowed: true,
  },
  office_deadline: {
    key: "office_deadline",
    label: "Office Deadline",
    shortLabel: "Deadline",
    dotClass: "bg-amber-600",
    badgeClass: "bg-amber-50 text-amber-900 border border-amber-200",
    borderClass: "border-l-amber-600",
    staffAllowed: true,
  },
  internal_reminder: {
    key: "internal_reminder",
    label: "Internal Reminder",
    shortLabel: "Internal",
    dotClass: "bg-slate-600",
    badgeClass: "bg-slate-100 text-slate-800 border border-slate-200",
    borderClass: "border-l-slate-600",
    staffAllowed: true,
  },
  public_announcement: {
    key: "public_announcement",
    label: "Public Announcement",
    shortLabel: "Announcement",
    dotClass: "bg-emerald-700",
    badgeClass: "bg-emerald-50 text-emerald-900 border border-emerald-200",
    borderClass: "border-l-emerald-700",
    staffAllowed: false,
  },
  collection_notice: {
    key: "collection_notice",
    label: "Collection/Release Notice",
    shortLabel: "Collection",
    dotClass: "bg-sky-700",
    badgeClass: "bg-sky-50 text-sky-900 border border-sky-200",
    borderClass: "border-l-sky-700",
    staffAllowed: false,
  },
  personal_reminder: {
    key: "personal_reminder",
    label: "Personal Reminder",
    shortLabel: "Personal",
    dotClass: "bg-stone-600",
    badgeClass: "bg-stone-100 text-stone-800 border border-stone-200",
    borderClass: "border-l-stone-600",
    staffAllowed: true,
  },
};

export const REMINDER_OFFSET_OPTIONS = [
  { minutes: 10, label: "10 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 4320, label: "3 days before" },
] as const;

export const STAFF_ALLOWED_CATEGORIES: CalendarEventCategory[] = [
  "office_event",
  "office_deadline",
  "internal_reminder",
  "personal_reminder",
];
