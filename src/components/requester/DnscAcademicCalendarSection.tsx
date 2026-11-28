"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Info,
  MapPin,
} from "lucide-react";
import {
  CALENDAR_CATEGORY_META,
  type CalendarEventCategory,
  type CalendarEventItem,
} from "@/types/calendar";

interface DnscAcademicCalendarSectionProps {
  events?: CalendarEventItem[];
  initialDateIso?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const PUBLIC_LEGEND_CATEGORIES: CalendarEventCategory[] = [
  "academic_calendar",
  "national_holiday",
  "local_holiday",
  "public_announcement",
  "collection_notice",
];

function toDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  return startDate === endDate
    ? fmt(startDate)
    : `${fmt(startDate)} – ${fmt(endDate)}`;
}

/**
 * Simple, strictly read-only DNSC Academic Calendar for Requesters/Students.
 * Shows official academic dates, verified national/local holidays, and
 * published public announcements or collection notices.
 */
export function DnscAcademicCalendarSection({
  events = [],
  initialDateIso,
}: DnscAcademicCalendarSectionProps) {
  const today = useMemo(() => {
    if (initialDateIso) {
      const parsed = new Date(initialDateIso);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [initialDateIso]);

  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(
    null
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredEvents = useMemo(() => {
    if (categoryFilter === "all") return events;
    return events.filter((e) => e.category === categoryFilter);
  }, [events, categoryFilter]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarCells: (number | null)[] = [
    ...Array.from({ length: firstDayOfMonth }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Map every day in the currently viewed month to events covering that date
  const eventsByDateInMonth = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthStart = toDateKey(viewYear, viewMonth, 1);
    const monthEnd = toDateKey(viewYear, viewMonth, totalDays);

    for (const ev of filteredEvents) {
      if (ev.endDate < monthStart || ev.startDate > monthEnd) continue;
      for (let d = 1; d <= totalDays; d++) {
        const key = toDateKey(viewYear, viewMonth, d);
        if (key >= ev.startDate && key <= ev.endDate) {
          const list = map.get(key) ?? [];
          list.push(ev);
          map.set(key, list);
        }
      }
    }
    return map;
  }, [filteredEvents, viewYear, viewMonth]);

  const sidebarEvents = useMemo(() => {
    if (selectedDateKey) {
      return eventsByDateInMonth.get(selectedDateKey) ?? [];
    }
    return filteredEvents
      .filter((e) => e.endDate >= todayKey)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 6);
  }, [filteredEvents, eventsByDateInMonth, selectedDateKey, todayKey]);

  const handlePrevMonth = () => {
    setSelectedDateKey(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDateKey(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDateKey(null);
  };

  return (
    <section
      aria-labelledby="academic-calendar-heading"
      className="rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="academic-calendar-heading"
              className="text-base font-bold text-[#25352B] sm:text-lg"
            >
              DNSC Academic Calendar
            </h2>
            <p className="text-xs text-slate-500">
              Official AY 2026–2027 academic dates, verified holidays, and
              public Registrar notices
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter calendar by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSelectedEvent(null);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-[#25352B] focus:border-[#174D32] focus:outline-none"
          >
            <option value="all">All Public Events</option>
            {PUBLIC_LEGEND_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CALENDAR_CATEGORY_META[cat].label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleJumpToday}
            className="rounded-lg border border-slate-200 bg-[#F5F5EF] px-3 py-2 text-xs font-semibold text-[#174D32] transition-colors hover:border-[#174D32]/40 hover:bg-[#E6EFE8]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-bold text-[#25352B]">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-12">
        {/* Monthly Calendar Grid */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-1.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase"
              >
                {day}
              </div>
            ))}

            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-11 sm:h-14" />;
              }

              const dateKey = toDateKey(viewYear, viewMonth, day);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDateKey;
              const dayEvents = eventsByDateInMonth.get(dateKey) ?? [];
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey((prev) =>
                      prev === dateKey ? null : dateKey
                    );
                    setSelectedEvent(dayEvents[0] ?? null);
                  }}
                  aria-label={
                    hasEvents
                      ? `${monthLabel} ${day}: ${dayEvents.map((e) => e.title).join(", ")}`
                      : `${monthLabel} ${day}`
                  }
                  className={`relative flex h-11 flex-col items-center justify-center rounded-xl text-xs font-medium transition-colors sm:h-14 sm:text-sm ${
                    isToday
                      ? "bg-[#174D32] font-bold text-white shadow-xs"
                      : isSelected
                        ? "bg-[#E6EFE8] font-bold text-[#174D32] ring-2 ring-[#174D32]"
                        : hasEvents
                          ? "border border-[#174D32]/20 bg-[#F5F5EF] font-semibold text-[#25352B] hover:bg-[#E6EFE8]"
                          : "border border-slate-100 text-[#25352B] hover:bg-[#F5F5EF]"
                  }`}
                >
                  <span>{day}</span>
                  {hasEvents && (
                    <span
                      aria-hidden="true"
                      className="mt-1 flex items-center gap-0.5"
                    >
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className={`h-1.5 w-1.5 rounded-full ${
                            isToday
                              ? "bg-white"
                              : CALENDAR_CATEGORY_META[ev.category].dotClass
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Category Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
            {PUBLIC_LEGEND_CATEGORIES.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${CALENDAR_CATEGORY_META[cat].dotClass}`}
                />
                {CALENDAR_CATEGORY_META[cat].label}
              </span>
            ))}
          </div>
        </div>

        {/* Upcoming Events + Read-Only Event Detail */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-[#F5F5EF]/75 p-4 sm:p-5 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold tracking-wider text-[#25352B] uppercase">
                {selectedDateKey
                  ? `Events on ${formatDateRange(selectedDateKey, selectedDateKey)}`
                  : "Upcoming Dates & Notices"}
              </h3>
              {selectedDateKey && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(null);
                    setSelectedEvent(null);
                  }}
                  className="text-[11px] font-semibold text-[#174D32] hover:text-[#246B45]"
                >
                  Show upcoming
                </button>
              )}
            </div>

            {sidebarEvents.length === 0 ? (
              <div className="mt-3 rounded-xl border border-slate-200/80 bg-white p-4 text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6EFE8] text-[#174D32]">
                  <Info className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="mt-2 text-xs font-semibold text-[#25352B]">
                  {selectedDateKey
                    ? "No public events on this date"
                    : "No upcoming public events"}
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {sidebarEvents.map((event) => {
                  const meta = CALENDAR_CATEGORY_META[event.category];
                  const active = selectedEvent?.id === event.id;
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full rounded-lg border border-l-4 bg-white p-2.5 text-left transition-colors ${meta.borderClass} ${
                          active
                            ? "border-[#174D32] bg-[#E6EFE8]/45"
                            : "border-slate-200 hover:border-[#246B45]/40 hover:bg-[#E6EFE8]/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#174D32]">
                            {formatDateRange(event.startDate, event.endDate)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                          >
                            {meta.shortLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-[#25352B]">
                          {event.title}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedEvent && (
              <div className="mt-3 rounded-xl border border-[#246B45]/25 bg-white p-3.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CALENDAR_CATEGORY_META[selectedEvent.category].badgeClass}`}
                  >
                    {CALENDAR_CATEGORY_META[selectedEvent.category].label}
                  </span>
                </div>
                <p className="mt-2 font-bold text-[#25352B]">
                  {selectedEvent.title}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#174D32]">
                  <Clock className="h-3 w-3" aria-hidden="true" />
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
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-600">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{selectedEvent.location}</span>
                  </p>
                )}
                {selectedEvent.description && (
                  <p className="mt-1.5 leading-relaxed text-slate-600">
                    {selectedEvent.description}
                  </p>
                )}
                {(selectedEvent.actionUrl || selectedEvent.sourceUrl) && (
                  <a
                    href={selectedEvent.actionUrl || selectedEvent.sourceUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#174D32] hover:text-[#246B45]"
                  >
                    <span>
                      {selectedEvent.sourceLabel || "View Official Source"}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            Today (PHT):{" "}
            <span className="font-semibold text-[#25352B]">
              {today.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
