"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, ClipboardList, Eye } from "lucide-react";
import { RequestStatusBadge } from "@/components/requester/RequestStatusBadge";
import { StaffRequestDetailsModal } from "@/components/staff/StaffRequestDetailsModal";
import type { StaffRequestRecord } from "@/lib/db/staff-requests";

interface StaffRecentAttentionSectionProps {
  requests: StaffRequestRecord[];
  error?: string | null;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StaffRecentAttentionSection({
  requests: initialRequests,
  error,
}: StaffRecentAttentionSectionProps) {
  const router = useRouter();
  const [requests, setRequests] =
    useState<StaffRequestRecord[]>(initialRequests);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );

  const handleRequestUpdated = (updated: StaffRequestRecord) => {
    setRequests((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    router.refresh();
  };

  return (
    <section
      aria-labelledby="staff-recent-attention-heading"
      className="rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2
            id="staff-recent-attention-heading"
            className="text-base font-bold text-[#25352B]"
          >
            Recent Requests Requiring Attention
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Latest submitted document requests awaiting review, preparation, or
            release.
          </p>
        </div>

        <Link
          href="/dashboard/staff/queue"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#174D32] transition-colors hover:text-[#246B45] focus:outline-none focus-visible:underline"
        >
          <span>View Request Queue</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="m-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <span>{error}</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
            <ClipboardList className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-[#25352B]">
            No Requests Requiring Attention
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-600">
            There are currently no active document requests in the queue. New
            requester submissions will appear here automatically.
          </p>
        </div>
      ) : (
        <>
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
                    Requester
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Date Submitted
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="transition-colors hover:bg-[#F5F5EF]/50"
                  >
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-[#174D32]">
                      {req.referenceNumber}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-[#25352B]">
                      {req.documentType}
                    </td>
                    <td className="px-6 py-3.5 text-xs">
                      <p className="font-semibold text-[#25352B]">
                        {req.requesterName}
                      </p>
                      {req.requesterStudentId && (
                        <p className="text-[11px] text-slate-500">
                          ID: {req.requesterStudentId}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600">
                      {formatDate(req.submittedAt)}
                    </td>
                    <td className="px-6 py-3.5">
                      <RequestStatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRequestId(req.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8]"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {requests.map((req) => (
              <li key={req.id} className="space-y-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-bold text-[#174D32]">
                      {req.referenceNumber}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#25352B]">
                      {req.documentType}
                    </p>
                  </div>
                  <RequestStatusBadge status={req.status} />
                </div>
                <p className="text-xs text-slate-600">
                  {req.requesterName}
                  {req.requesterStudentId
                    ? ` (${req.requesterStudentId})`
                    : ""}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Submitted {formatDate(req.submittedAt)}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRequestId(req.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#174D32] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    <span>View</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedRequestId && (
        <StaffRequestDetailsModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onRequestUpdated={handleRequestUpdated}
        />
      )}
    </section>
  );
}
