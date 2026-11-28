import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileStack,
  LoaderCircle,
  PackageCheck,
} from "lucide-react";
import type { StaffRequestCounts } from "@/lib/db/staff-requests";

interface StaffOverviewCardsProps {
  counts: StaffRequestCounts | null;
  error?: string | null;
}

export function StaffOverviewCards({ counts, error }: StaffOverviewCardsProps) {
  if (error || !counts) {
    return (
      <section aria-labelledby="staff-overview-heading">
        <h2
          id="staff-overview-heading"
          className="mb-3 text-base font-bold text-[#25352B]"
        >
          Document Request Overview
        </h2>
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <span>
            {error ||
              "Request statistics are currently unavailable. Please refresh to try again."}
          </span>
        </div>
      </section>
    );
  }

  const cards = [
    {
      label: "Total Document Requests",
      value: counts.total,
      icon: FileStack,
    },
    {
      label: "Pending Requests",
      value: counts.pending,
      icon: Clock,
    },
    {
      label: "Under Processing",
      value: counts.processing,
      icon: LoaderCircle,
    },
    {
      label: "Needs Correction",
      value: counts.needsCorrection,
      icon: AlertTriangle,
    },
    {
      label: "Ready for Release",
      value: counts.readyForRelease,
      icon: PackageCheck,
    },
    {
      label: "Released",
      value: counts.released,
      icon: CheckCircle2,
    },
  ] as const;

  return (
    <section aria-labelledby="staff-overview-heading">
      <h2
        id="staff-overview-heading"
        className="mb-3 text-base font-bold text-[#25352B]"
      >
        Document Request Overview
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
                  {card.label}
                </p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6EFE8] text-[#174D32]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold text-[#25352B]">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
