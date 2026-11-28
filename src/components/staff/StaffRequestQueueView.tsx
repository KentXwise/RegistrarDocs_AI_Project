"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ClipboardList,
  Eye,
  FilterX,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  REQUEST_STATUS_META,
  RequestStatusBadge,
} from "@/components/requester/RequestStatusBadge";
import { StaffRequestDetailsModal } from "@/components/staff/StaffRequestDetailsModal";
import type { StaffRequestRecord } from "@/lib/db/staff-requests";
import type { DocumentRequestStatus } from "@/types/requester";

interface StaffRequestQueueViewProps {
  initialRequests: StaffRequestRecord[];
  scopedStatus: DocumentRequestStatus;
  error?: string | null;
}

const QUEUE_VIEW_META: Record<
  DocumentRequestStatus,
  {
    eyebrow: string;
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    countLabel: string;
  }
> = {
  pending: {
    eyebrow: "Registrar Queue",
    title: "Request Queue",
    description:
      "Incoming Submitted / Pending document requests awaiting initial Staff review and verification.",
    emptyTitle: "No Pending Requests in Queue",
    emptyDescription:
      "All incoming Submitted / Pending document requests have been reviewed. New requester submissions will appear here automatically.",
    countLabel: "pending",
  },
  processing: {
    eyebrow: "Request Workflow",
    title: "Under Processing",
    description:
      "Verified document requests currently being prepared by Registrar Staff.",
    emptyTitle: "No Requests Under Processing",
    emptyDescription:
      "Requests moved from the Request Queue into processing will appear here.",
    countLabel: "processing",
  },
  needs_correction: {
    eyebrow: "Request Workflow",
    title: "Needs Correction",
    description:
      "Requests returned to requesters for missing or corrected information.",
    emptyTitle: "No Requests Needing Correction",
    emptyDescription:
      "Requests returned for requester correction will appear here until resubmitted.",
    countLabel: "needs correction",
  },
  ready_for_release: {
    eyebrow: "Request Workflow",
    title: "Ready for Release",
    description:
      "Prepared documents awaiting collector identity verification and official release.",
    emptyTitle: "No Requests Ready for Release",
    emptyDescription:
      "Requests marked Ready for Release from Under Processing will appear here.",
    countLabel: "ready for release",
  },
  released: {
    eyebrow: "Request Workflow",
    title: "Release Records",
    description:
      "Completed document requests that have been verified and officially released.",
    emptyTitle: "No Release Records Yet",
    emptyDescription:
      "Officially released document requests and their verification records will appear here.",
    countLabel: "released",
  },
  rejected: {
    eyebrow: "Request Workflow",
    title: "Rejected Requests",
    description: "Document requests that were not approved during review.",
    emptyTitle: "No Rejected Requests",
    emptyDescription: "Rejected document requests will appear here.",
    countLabel: "rejected",
  },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StaffRequestQueueView({
  initialRequests,
  scopedStatus,
  error,
}: StaffRequestQueueViewProps) {
  const router = useRouter();
  const [requests, setRequests] =
    useState<StaffRequestRecord[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );

  const viewMeta = QUEUE_VIEW_META[scopedStatus];
  const hasActiveFilters = searchQuery.trim().length > 0;

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = requests.filter((req) => {
      if (req.status !== scopedStatus) return false;
      if (!q) return true;
      return (
        req.referenceNumber.toLowerCase().includes(q) ||
        req.documentType.toLowerCase().includes(q) ||
        req.requesterName.toLowerCase().includes(q) ||
        (req.requesterStudentId?.toLowerCase().includes(q) ?? false)
      );
    });

    return [...matched].sort((a, b) => {
      const timeA = new Date(a.submittedAt).getTime();
      const timeB = new Date(b.submittedAt).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [requests, scopedStatus, searchQuery, sortOrder]);

  const handleRequestUpdated = (updated: StaffRequestRecord) => {
    setRequests((prev) => {
      // Immediately remove requests that transitioned out of this queue's status
      if (updated.status !== scopedStatus) {
        return prev.filter((item) => item.id !== updated.id);
      }
      return prev.map((item) => (item.id === updated.id ? updated : item));
    });
    router.refresh();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSortOrder("newest");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            {viewMeta.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            {viewMeta.title}
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            {viewMeta.description}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/70 px-3.5 py-2 text-xs font-bold text-[#174D32]">
          <span>
            {requests.length} {viewMeta.countLabel}
          </span>
          <span className="text-slate-400">&middot;</span>
          <span>{REQUEST_STATUS_META[scopedStatus].label}</span>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        {error ? (
          <div
            role="alert"
            className="m-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {requests.length > 0 && (
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 lg:max-w-md">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by reference number, document, or requester..."
                    aria-label="Search request queue"
                    className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 sm:text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    aria-label="Sort request queue"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(e.target.value as "newest" | "oldest")
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 sm:text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F5F5EF] px-3 py-2 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8]"
                    >
                      <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Clear Search</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {requests.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
                  <ClipboardList className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-bold text-[#25352B]">
                  {viewMeta.emptyTitle}
                </h2>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">
                  {viewMeta.emptyDescription}
                </p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-bold text-[#25352B]">
                  No Matching Requests Found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  No {viewMeta.countLabel} requests matched your current search.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
                >
                  <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear Search</span>
                </button>
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
                          Copies
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
                      {filteredRequests.map((req) => (
                        <tr
                          key={req.id}
                          className="transition-colors hover:bg-[#F5F5EF]/50"
                        >
                          <td className="px-6 py-4 font-mono text-xs font-bold text-[#174D32]">
                            {req.referenceNumber}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-[#25352B]">
                              {req.documentType}
                            </p>
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                              {req.purpose}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <p className="font-semibold text-[#25352B]">
                              {req.requesterName}
                            </p>
                            {req.requesterStudentId && (
                              <p className="text-[11px] text-slate-500">
                                ID: {req.requesterStudentId}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-[#25352B]">
                            {req.copies}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {formatDate(req.submittedAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <RequestStatusBadge status={req.status} />
                              {req.isResubmitted && req.status === "pending" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#246B45]/30 bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-bold text-[#174D32]">
                                  <RotateCcw className="h-2.5 w-2.5" />
                                  Resubmitted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedRequestId(req.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8]"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Review</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-slate-100 md:hidden">
                  {filteredRequests.map((req) => (
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
                      <p className="text-xs text-slate-700">
                        {req.requesterName}
                        {req.requesterStudentId
                          ? ` (${req.requesterStudentId})`
                          : ""}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {req.copies} {req.copies === 1 ? "copy" : "copies"}{" "}
                          &middot; {formatDate(req.submittedAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRequestId(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#174D32] px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <Eye className="h-3 w-3" aria-hidden="true" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      {selectedRequestId && (
        <StaffRequestDetailsModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onRequestUpdated={handleRequestUpdated}
        />
      )}
    </div>
  );
}
