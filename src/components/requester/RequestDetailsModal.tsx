"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { dispatchNotificationsUpdated } from "@/components/requester/NotificationQuickPanel";
import {
  REQUEST_STATUS_META,
  RequestStatusBadge,
} from "@/components/requester/RequestStatusBadge";
import type { PersistedNotification } from "@/lib/db/notifications";
import type { RequesterDocumentRequestDetail } from "@/lib/db/requests";

interface RequestDetailsModalProps {
  requestId: string;
  onClose: () => void;
  onRequestUpdated: (updated: RequesterDocumentRequestDetail) => void;
}

function formatFullDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RequestDetailsModal({
  requestId,
  onClose,
  onRequestUpdated,
}: RequestDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<RequesterDocumentRequestDetail | null>(
    null
  );
  const [category, setCategory] = useState<string>("Registrar Document");
  const [notifications, setNotifications] = useState<PersistedNotification[]>(
    []
  );
  const [copied, setCopied] = useState(false);

  // Correction form state (used only when status === "needs_correction")
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [copies, setCopies] = useState(1);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [correctionErrors, setCorrectionErrors] = useState<
    Record<string, string>
  >({});
  const [correctionErrorBanner, setCorrectionErrorBanner] = useState<
    string | null
  >(null);
  const [correctionSuccess, setCorrectionSuccess] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      try {
        const res = await fetch(
          `/api/requester/requests/${encodeURIComponent(requestId)}`,
          { cache: "no-store" }
        );
        if (cancelled) return;

        const data = (await res.json().catch(() => null)) as {
          error?: string;
          request?: RequesterDocumentRequestDetail;
          category?: string;
          notifications?: PersistedNotification[];
        } | null;

        if (!res.ok || !data?.request) {
          setError(data?.error || "Unable to load this request's details.");
          setLoading(false);
          return;
        }

        setRequest(data.request);
        setCategory(data.category ?? "Registrar Document");
        setNotifications(data.notifications ?? []);
        setPurpose(data.request.purpose);
        setCopies(data.request.copies);
        setAdditionalNotes(data.request.additionalNotes ?? "");
        setError(null);
      } catch {
        if (!cancelled) {
          setError("A network error occurred while loading request details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isResubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isResubmitting]);

  const handleCopyReference = async () => {
    if (!request) return;
    try {
      await navigator.clipboard.writeText(request.referenceNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleResubmitCorrection = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!request || isResubmitting) return;

    const nextErrors: Record<string, string> = {};
    if (!purpose.trim()) {
      nextErrors.purpose = "Please enter the purpose of your document request.";
    }
    if (!Number.isInteger(copies) || copies < 1 || copies > 10) {
      nextErrors.copies = "Number of copies must be between 1 and 10.";
    }
    if (request.documentTypeCode === "other" && !additionalNotes.trim()) {
      nextErrors.additionalNotes =
        "Please specify the exact Registrar document or certification you are requesting.";
    }

    setCorrectionErrors(nextErrors);
    setCorrectionErrorBanner(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsResubmitting(true);
    try {
      const res = await fetch(
        `/api/requester/requests/${encodeURIComponent(request.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: purpose.trim(),
            copies,
            additionalNotes: additionalNotes.trim(),
          }),
        }
      );

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        fieldErrors?: Record<string, string>;
        request?: RequesterDocumentRequestDetail;
        notifications?: PersistedNotification[];
      } | null;

      if (!res.ok || !data?.request) {
        if (data?.fieldErrors) setCorrectionErrors(data.fieldErrors);
        setCorrectionErrorBanner(
          data?.error || "Unable to resubmit your corrections right now."
        );
        return;
      }

      setRequest(data.request);
      if (data.notifications) setNotifications(data.notifications);
      setCorrectionOpen(false);
      setCorrectionSuccess(true);
      onRequestUpdated(data.request);
      dispatchNotificationsUpdated();
    } catch {
      setCorrectionErrorBanner(
        "A network error occurred while resubmitting your corrections."
      );
    } finally {
      setIsResubmitting(false);
    }
  };

  const correctionNotices = notifications.filter(
    (n) => n.category === "missing_requirements"
  );
  const collectionNotices = notifications.filter(
    (n) =>
      n.category === "ready_for_release" ||
      n.category === "collection_instructions"
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-details-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Fixed Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wider text-[#174D32] uppercase">
              {request ? category : "Request Details"}
            </p>
            <h2
              id="request-details-modal-title"
              className="mt-0.5 truncate text-lg font-bold text-[#25352B] sm:text-xl"
            >
              {request ? request.documentType : "Loading Request..."}
            </h2>
          </div>

          <button
            type="button"
            disabled={isResubmitting}
            onClick={onClose}
            aria-label="Close request details"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Independently Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#174D32]" />
              <span>Loading request details...</span>
            </div>
          ) : error || !request ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <span>{error || "Document request could not be found."}</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Reference Number + Copy + Status */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#246B45]/20 bg-[#F5F5EF] p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    Request Reference Number
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-[#174D32] sm:text-lg">
                      {request.referenceNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyReference()}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#174D32]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="sm:text-right">
                  <RequestStatusBadge status={request.status} />
                  <p className="mt-1 text-[11px] text-slate-600">
                    {REQUEST_STATUS_META[request.status].description}
                  </p>
                </div>
              </div>

              {correctionSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-xl border border-[#246B45]/30 bg-[#E6EFE8]/75 p-4 text-xs text-[#25352B]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
                  <span>
                    <strong className="font-semibold">
                      Corrections Resubmitted:
                    </strong>{" "}
                    Your updated details for{" "}
                    <span className="font-mono font-semibold">
                      {request.referenceNumber}
                    </span>{" "}
                    have been saved and returned to Pending review.
                  </span>
                </div>
              )}

              {/* Correction Handling Banner (only when status === "needs_correction") */}
              {request.status === "needs_correction" && (
                <div className="rounded-xl border border-orange-300 bg-orange-50/80 p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-800" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-orange-950">
                        Correction Required Before Processing
                      </h3>
                      {request.requesterRemarks ? (
                        <p className="mt-1.5 rounded-lg border border-orange-200 bg-white/80 p-2.5 text-xs leading-relaxed text-orange-950">
                          <strong className="font-semibold">
                            Registrar Staff Instructions:
                          </strong>{" "}
                          {request.requesterRemarks}
                        </p>
                      ) : correctionNotices.length > 0 ? (
                        <ul className="mt-2 space-y-1.5 text-xs text-orange-900">
                          {correctionNotices.map((notice) => (
                            <li key={notice.id}>{notice.message}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs leading-relaxed text-orange-900">
                          This request has been marked as needing correction.
                          Review your submitted details below and resubmit
                          updated information while keeping your original
                          reference number ({request.referenceNumber}).
                        </p>
                      )}

                      {!correctionOpen && (
                        <button
                          type="button"
                          onClick={() => setCorrectionOpen(true)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#246B45]"
                        >
                          <span>Edit &amp; Resubmit Request</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {correctionOpen && (
                    <form
                      onSubmit={handleResubmitCorrection}
                      noValidate
                      className="mt-4 space-y-3 border-t border-orange-200 pt-4"
                    >
                      {correctionErrorBanner && (
                        <p
                          role="alert"
                          className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700"
                        >
                          {correctionErrorBanner}
                        </p>
                      )}

                      <div>
                        <label
                          htmlFor="correction-purpose"
                          className="block text-xs font-semibold text-[#25352B]"
                        >
                          Purpose of Request{" "}
                          <span className="text-red-700">*</span>
                        </label>
                        <input
                          id="correction-purpose"
                          type="text"
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          maxLength={300}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                        />
                        {correctionErrors.purpose && (
                          <p className="mt-1 text-xs text-red-700">
                            {correctionErrors.purpose}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="correction-copies"
                          className="block text-xs font-semibold text-[#25352B]"
                        >
                          Number of Copies{" "}
                          <span className="text-red-700">*</span>
                        </label>
                        <input
                          id="correction-copies"
                          type="number"
                          min={1}
                          max={10}
                          value={copies}
                          onChange={(e) =>
                            setCopies(Number.parseInt(e.target.value, 10) || 1)
                          }
                          className="mt-1 block w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                        />
                        {correctionErrors.copies && (
                          <p className="mt-1 text-xs text-red-700">
                            {correctionErrors.copies}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="correction-notes"
                          className="block text-xs font-semibold text-[#25352B]"
                        >
                          Additional Details
                          {request.documentTypeCode === "other" && (
                            <span className="text-red-700"> *</span>
                          )}
                        </label>
                        <textarea
                          id="correction-notes"
                          rows={3}
                          maxLength={1000}
                          value={additionalNotes}
                          onChange={(e) => setAdditionalNotes(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                        />
                        {correctionErrors.additionalNotes && (
                          <p className="mt-1 text-xs text-red-700">
                            {correctionErrors.additionalNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={isResubmitting}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#246B45] disabled:opacity-60"
                        >
                          {isResubmitting && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                          <span>
                            {isResubmitting
                              ? "Resubmitting..."
                              : "Submit Correction"}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={isResubmitting}
                          onClick={() => setCorrectionOpen(false)}
                          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#25352B] hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Rejection Reason (only if status === "rejected" and remarks recorded) */}
              {request.status === "rejected" && request.requesterRemarks && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-xs text-red-900">
                  <p className="font-bold text-red-950">
                    Registrar Staff Remarks
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {request.requesterRemarks}
                  </p>
                </div>
              )}

              {/* Collection Instructions (when Ready for Release or recorded) */}
              {(request.collectionInstructions ||
                collectionNotices.length > 0) &&
                request.status !== "released" && (
                  <div className="rounded-xl border border-[#174D32]/25 bg-[#E6EFE8]/60 p-4">
                    <h3 className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
                      Collection &amp; Release Instructions
                    </h3>
                    {request.collectionInstructions ? (
                      <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[#25352B]">
                        {request.collectionInstructions}
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5 text-xs text-[#25352B]">
                        {collectionNotices.map((notice) => (
                          <li key={notice.id}>{notice.message}</li>
                        ))}
                      </ul>
                    )}
                    {request.readyForReleaseAt && (
                      <p className="mt-2 text-[11px] text-slate-600">
                        Marked Ready for Release on{" "}
                        {formatFullDateTime(request.readyForReleaseAt)}
                      </p>
                    )}
                  </div>
                )}

              {/* Released Confirmation Banner */}
              {request.status === "released" && (
                <div className="rounded-xl border border-[#246B45]/30 bg-[#E6EFE8]/75 p-4">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
                    <div className="min-w-0 text-xs text-[#25352B]">
                      <p className="font-bold text-[#174D32]">
                        Document Officially Released
                      </p>
                      <p className="mt-1 leading-relaxed">
                        {request.releasedAt
                          ? `This document request was verified and released by the DNSC Registrar's Office on ${formatFullDateTime(request.releasedAt)}.`
                          : "This document request has been officially released by the DNSC Registrar's Office."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submitted Request Information */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#25352B] uppercase">
                  <FileText className="h-4 w-4 text-[#174D32]" />
                  <span>Submitted Request Information</span>
                </h3>
                <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Date Submitted
                    </dt>
                    <dd className="mt-0.5 font-medium text-[#25352B]">
                      {formatFullDateTime(request.submittedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Last Updated
                    </dt>
                    <dd className="mt-0.5 font-medium text-[#25352B]">
                      {formatFullDateTime(request.updatedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Number of Copies
                    </dt>
                    <dd className="mt-0.5 font-semibold text-[#25352B]">
                      {request.copies}{" "}
                      {request.copies === 1 ? "copy" : "copies"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Purpose</dt>
                    <dd className="mt-0.5 font-medium text-[#25352B]">
                      {request.purpose}
                    </dd>
                  </div>
                  {request.requesterInstitute && (
                    <div>
                      <dt className="font-semibold text-slate-500">Institute</dt>
                      <dd className="mt-0.5 font-medium text-[#25352B]">
                        {request.requesterInstitute}
                      </dd>
                    </div>
                  )}
                  {request.requesterProgram && (
                    <div>
                      <dt className="font-semibold text-slate-500">Program</dt>
                      <dd className="mt-0.5 font-medium text-[#25352B]">
                        {request.requesterProgram}
                      </dd>
                    </div>
                  )}
                  {request.additionalNotes && (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-slate-500">
                        Additional Details
                      </dt>
                      <dd className="mt-0.5 leading-relaxed text-[#25352B]">
                        {request.additionalNotes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Honest Chronological Status Timeline */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#25352B] uppercase">
                  <Clock className="h-4 w-4 text-[#174D32]" />
                  <span>Request Timeline &amp; Activity</span>
                </h3>

                <ol className="mt-3.5 space-y-3.5 border-l-2 border-[#E6EFE8] pl-4">
                  {/* Real persisted submission event */}
                  <li className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#174D32] ring-4 ring-white"
                    />
                    <p className="text-xs font-bold text-[#25352B]">
                      Request Submitted
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatFullDateTime(request.submittedAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Submitted with reference number{" "}
                      <span className="font-mono font-semibold text-[#174D32]">
                        {request.referenceNumber}
                      </span>{" "}
                      and placed in Submitted / Pending status.
                    </p>
                  </li>

                  {/* Real persisted linked notifications (excluding redundant initial submission duplicate if identical) */}
                  {notifications
                    .filter((n) => n.title !== "Document Request Submitted")
                    .map((event) => (
                      <li key={event.id} className="relative">
                        <span
                          aria-hidden="true"
                          className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#246B45] ring-4 ring-white"
                        />
                        <p className="text-xs font-bold text-[#25352B]">
                          {event.title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatFullDateTime(event.createdAt)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {event.message}
                        </p>
                      </li>
                    ))}
                </ol>

                {notifications.filter(
                  (n) => n.title !== "Document Request Submitted"
                ).length === 0 && (
                  <div className="mt-3.5 flex items-start gap-2 rounded-lg bg-[#F5F5EF] p-3 text-xs text-slate-600">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#174D32]" />
                    <span>
                      No additional Registrar Staff status updates have been
                      recorded yet. Real timeline updates will appear here as
                      your request is reviewed and processed.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-100 bg-[#F5F5EF]/60 px-6 py-3.5">
          <button
            type="button"
            disabled={isResubmitting}
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
