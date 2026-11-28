"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Eye,
  FilePlus2,
  FileText,
  FilterX,
  Search,
} from "lucide-react";
import { RequestDetailsModal } from "@/components/requester/RequestDetailsModal";
import {
  REQUEST_STATUS_META,
  RequestStatusBadge,
} from "@/components/requester/RequestStatusBadge";
import type { RequesterDocumentRequestDetail } from "@/lib/db/requests";
import type { DocumentRequestStatus } from "@/types/requester";

interface MyRequestsViewProps {
  initialRequests: RequesterDocumentRequestDetail[];
  initialRef?: string | null;
}

const STATUS_FILTER_OPTIONS: {
  value: "all" | DocumentRequestStatus;
  label: string;
}[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: REQUEST_STATUS_META.pending.label },
  { value: "processing", label: REQUEST_STATUS_META.processing.label },
  {
    value: "needs_correction",
    label: REQUEST_STATUS_META.needs_correction.label,
  },
  {
    value: "ready_for_release",
    label: REQUEST_STATUS_META.ready_for_release.label,
  },
  { value: "released", label: REQUEST_STATUS_META.released.label },
  { value: "rejected", label: REQUEST_STATUS_META.rejected.label },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MyRequestsView({
  initialRequests,
  initialRef = null,
}: MyRequestsViewProps) {
  const [requests, setRequests] =
    useState<RequesterDocumentRequestDetail[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | DocumentRequestStatus
  >("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // If navigated via ?ref=RD-..., automatically open that exact request's details modal
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    () => {
      if (!initialRef) return null;
      const match = initialRequests.find(
        (r) => r.referenceNumber.toLowerCase() === initialRef.toLowerCase()
      );
      return match?.id ?? null;
    }
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all";

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = requests.filter((req) => {
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (!q) return true;
      return (
        req.documentType.toLowerCase().includes(q) ||
        req.referenceNumber.toLowerCase().includes(q) ||
        req.purpose.toLowerCase().includes(q)
      );
    });

    return [...matched].sort((a, b) => {
      const timeA = new Date(a.submittedAt).getTime();
      const timeB = new Date(b.submittedAt).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [requests, searchQuery, statusFilter, sortOrder]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortOrder("newest");
  };

  const handleCopyRef = async (refNumber: string) => {
    try {
      await navigator.clipboard.writeText(refNumber);
      setCopiedRef(refNumber);
      window.setTimeout(() => {
        setCopiedRef((curr) => (curr === refNumber ? null : curr));
      }, 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleRequestUpdated = (updated: RequesterDocumentRequestDetail) => {
    setRequests((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & New Request Action */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            Request Tracking
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            My Requests
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Monitor your submitted document requests, review details, and copy
            reference numbers ({requests.length} total).
          </p>
        </div>

        <Link
          href="/dashboard/requester/request"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2 sm:text-sm"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          <span>Request a Document</span>
        </Link>
      </div>

      {/* Main Card */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Controls Toolbar */}
        {requests.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by document or reference number..."
                aria-label="Search requests by document name or reference number"
                className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Filter by request status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | DocumentRequestStatus
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 sm:text-sm"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Sort requests"
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
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty State (No requests at all) */}
        {requests.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#25352B]">
              No Document Requests Yet
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">
              You have not submitted any document requests yet. Browse the
              document catalog to start a new request and receive a reference
              number.
            </p>
            <div className="mt-5">
              <Link
                href="/dashboard/requester/request"
                className="inline-flex items-center gap-2 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#246B45]"
              >
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Browse Document Catalog</span>
              </Link>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          /* Search/Filter Empty State */
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold text-[#25352B]">
              No Matching Requests Found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              No requests matched your current search or status filter.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
            >
              <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear Filters</span>
            </button>
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
                      Copies
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Submitted / Updated
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
                  {filteredRequests.map((req) => {
                    const isCopied = copiedRef === req.referenceNumber;
                    return (
                      <tr
                        key={req.id}
                        className="transition-colors hover:bg-[#F5F5EF]/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#174D32]">
                              {req.referenceNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyRef(req.referenceNumber)
                              }
                              aria-label={`Copy reference number ${req.referenceNumber}`}
                              title="Copy reference number"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-[#174D32]/40 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-[#174D32]" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#25352B]">
                            {req.documentType}
                          </p>
                          <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                            {req.purpose}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-[#25352B]">
                          {req.copies}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <p>{formatDate(req.submittedAt)}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Updated: {formatDate(req.updatedAt)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <RequestStatusBadge status={req.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestId(req.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {filteredRequests.map((req) => {
                const isCopied = copiedRef === req.referenceNumber;
                return (
                  <li key={req.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[#174D32]">
                            {req.referenceNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopyRef(req.referenceNumber)
                            }
                            aria-label={`Copy reference number ${req.referenceNumber}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500"
                          >
                            {isCopied ? (
                              <Check className="h-3 w-3 text-[#174D32]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[#25352B]">
                          {req.documentType}
                        </p>
                      </div>
                      <RequestStatusBadge status={req.status} />
                    </div>

                    <p className="text-xs text-slate-600">{req.purpose}</p>

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
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Request Details Modal */}
      {selectedRequestId && (
        <RequestDetailsModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onRequestUpdated={handleRequestUpdated}
        />
      )}
    </div>
  );
}
