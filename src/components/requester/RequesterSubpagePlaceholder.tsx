import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

interface RequesterSubpagePlaceholderProps {
  badge: string;
  title: string;
  description: string;
  workflowNote: string;
}

export function RequesterSubpagePlaceholder({
  badge,
  title,
  description,
  workflowNote,
}: RequesterSubpagePlaceholderProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-1 text-xs font-semibold text-[#174D32]">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{badge}</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#25352B]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          {description}
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-[#F5F5EF]/80 p-4 text-xs leading-relaxed text-slate-700">
          <strong className="font-semibold text-[#25352B]">
            Scheduled Milestone Note:
          </strong>{" "}
          {workflowNote}
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard/requester"
            className="inline-flex items-center gap-2 rounded-lg bg-[#174D32] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Return to Requester Dashboard</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
