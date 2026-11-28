import {
  CheckCircle2,
  Clock,
  FileStack,
  LoaderCircle,
} from "lucide-react";
import type { RequesterRequestCounts } from "@/types/requester";

interface RequestOverviewCardsProps {
  counts: RequesterRequestCounts;
  requestsModuleEnabled: boolean;
}

export function RequestOverviewCards({
  counts,
  requestsModuleEnabled,
}: RequestOverviewCardsProps) {
  const cards = [
    {
      label: "Total Requests",
      value: counts.total,
      caption: requestsModuleEnabled
        ? "All requests submitted under your account"
        : "No document requests submitted yet",
      icon: FileStack,
    },
    {
      label: "Pending Requests",
      value: counts.pending,
      caption: requestsModuleEnabled
        ? "Awaiting Registrar Staff review"
        : "Pending review count will appear here",
      icon: Clock,
    },
    {
      label: "Processing Requests",
      value: counts.processing,
      caption: requestsModuleEnabled
        ? "Currently being prepared by Registrar Staff"
        : "In-progress preparation count",
      icon: LoaderCircle,
    },
    {
      label: "Ready for Release",
      value: counts.readyForRelease,
      caption: requestsModuleEnabled
        ? "Ready for verification and collection"
        : "Documents ready for pickup",
      icon: CheckCircle2,
    },
  ] as const;

  return (
    <section aria-labelledby="request-overview-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="request-overview-heading"
          className="text-base font-bold text-[#25352B]"
        >
          Request Overview
        </h2>
        {!requestsModuleEnabled && (
          <span className="text-xs text-slate-500">
            Live request counts will update once document submission is enabled
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  {card.label}
                </p>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E6EFE8] text-[#174D32]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>

              <p className="mt-3 font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-[#25352B]">
                {card.value}
              </p>

              <p className="mt-1.5 text-xs text-slate-500">{card.caption}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
