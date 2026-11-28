import Link from "next/link";
import { ArrowRight, FilePlus2, FileText } from "lucide-react";
import type {
  DocumentRequestStatus,
  RequesterDocumentRequestSummary,
} from "@/types/requester";

interface RecentRequestsSectionProps {
  requests: RequesterDocumentRequestSummary[];
  requestsModuleEnabled: boolean;
}

const STATUS_BADGE_MAP: Record<
  DocumentRequestStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  processing: {
    label: "Processing",
    className: "border-[#246B45]/25 bg-[#E6EFE8] text-[#174D32]",
  },
  needs_correction: {
    label: "Needs Correction",
    className: "border-orange-200 bg-orange-50 text-orange-800",
  },
  ready_for_release: {
    label: "Ready for Release",
    className: "border-[#174D32]/30 bg-[#174D32] text-white",
  },
  released: {
    label: "Released",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export function RecentRequestsSection({
  requests,
  requestsModuleEnabled,
}: RecentRequestsSectionProps) {
  return (
    <section
      aria-labelledby="recent-requests-heading"
      className="rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2
            id="recent-requests-heading"
            className="text-base font-bold text-[#25352B]"
          >
            Recent Requests
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Track your most recent document requests and their current Registrar
            review status.
          </p>
        </div>

        <Link
          href="/dashboard/requester/requests"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#174D32] transition-colors hover:text-[#246B45] focus:outline-none focus-visible:underline"
        >
          <span>View All Requests</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>

          <h3 className="mt-4 text-sm font-bold text-[#25352B]">
            No Document Requests Yet
          </h3>

          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-600">
            {requestsModuleEnabled
              ? "You have not submitted any document requests yet. Start a new request to receive a reference number and track its progress."
              : "You have no document requests on record. Online document request submission and live reference-number tracking will be enabled in the upcoming Document Request milestone."}
          </p>

          <div className="mt-5">
            <Link
              href="/dashboard/requester/request"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
            >
              <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Request a Document</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-[#F5F5EF]/80 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Reference Number
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Document Type
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Date Submitted
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Current Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => {
                  const badge = STATUS_BADGE_MAP[req.status];
                  return (
                    <tr
                      key={req.id}
                      className="transition-colors hover:bg-[#F5F5EF]/50"
                    >
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-[#25352B]">
                        {req.referenceNumber}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-[#25352B]">
                        {req.documentType}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        {req.submittedAt}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/dashboard/requester/requests?ref=${encodeURIComponent(req.referenceNumber)}`}
                          className="text-xs font-semibold text-[#174D32] hover:text-[#246B45] hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {requests.map((req) => {
              const badge = STATUS_BADGE_MAP[req.status];
              return (
                <li key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-[#174D32]">
                        {req.referenceNumber}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-[#25352B]">
                        {req.documentType}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Submitted: {req.submittedAt}</span>
                    <Link
                      href={`/dashboard/requester/requests?ref=${encodeURIComponent(req.referenceNumber)}`}
                      className="font-semibold text-[#174D32] hover:text-[#246B45]"
                    >
                      View Details
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
