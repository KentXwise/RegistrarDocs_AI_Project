"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Info,
  Loader2,
  Lock,
  MessageSquarePlus,
  PackageCheck,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import {
  REQUEST_STATUS_META,
  RequestStatusBadge,
} from "@/components/requester/RequestStatusBadge";
import {
  buildCombinedCollectionInstructions,
  CollectionInstructionsSelector,
} from "@/components/staff/CollectionInstructionsSelector";
import { StaffStageProgressRecords } from "@/components/staff/StaffStageProgressRecords";
import type {
  CollectorType,
  StaffHistoryEvent,
  StaffRequestRecord,
  StaffReviewAction,
} from "@/lib/db/staff-requests";
import {
  buildInitialVerificationChecklist,
  READY_CONFIRMATION_ITEMS,
  type ReadyConfirmations,
} from "@/lib/staff/verification-checklist";

interface StaffRequestDetailsModalProps {
  requestId: string;
  onClose: () => void;
  onRequestUpdated?: (updated: StaffRequestRecord) => void;
}

function formatDateTime(iso: string): string {
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

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type ConfirmableAction = Exclude<
  StaffReviewAction,
  "save_internal_note" | "add_processing_progress"
>;

const ACTION_LABELS: Record<
  ConfirmableAction,
  { title: string; confirmText: string; buttonLabel: string }
> = {
  start_processing: {
    title: "Confirm Initial Verification & Start Processing",
    confirmText:
      "This will permanently record your Stage 1 verification checklist, verification remarks, and authenticated Staff attribution, move the request to Under Processing, and notify the requester.",
    buttonLabel: "Confirm & Start Processing",
  },
  request_correction: {
    title: "Confirm Request Correction",
    confirmText:
      "This will return the request to the requester as Needs Correction and send your requester-visible instructions while preserving this review in the request history.",
    buttonLabel: "Confirm Request Correction",
  },
  reject_request: {
    title: "Confirm Request Rejection",
    confirmText:
      "This will mark the request as Rejected and notify the requester with your explicit reason. This action cannot be undone by the requester.",
    buttonLabel: "Confirm Reject Request",
  },
  mark_ready_for_release: {
    title: "Confirm Ready for Release",
    confirmText:
      "This will append a permanent Stage 3 Ready for Release verification record under your Staff account without modifying previous verification or processing records, and notify the requester.",
    buttonLabel: "Confirm Ready for Release",
  },
  record_release: {
    title: "Confirm Official Document Release",
    confirmText:
      "This will permanently record the verified release under your Staff account and mark the request as Released. Duplicate release actions will be locked afterward.",
    buttonLabel: "Confirm Official Release",
  },
};

export function StaffRequestDetailsModal({
  requestId,
  onClose,
  onRequestUpdated,
}: StaffRequestDetailsModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<StaffRequestRecord | null>(null);
  const [category, setCategory] = useState("Registrar Document");
  const [history, setHistory] = useState<StaffHistoryEvent[]>([]);
  const [copied, setCopied] = useState(false);

  // Stage 1: Initial Verification state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [verificationRemarks, setVerificationRemarks] = useState("");
  const [confirmInitialVerification, setConfirmInitialVerification] =
    useState(false);

  // Shared Review / Notes state
  const [requesterRemarks, setRequesterRemarks] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [pendingAction, setPendingAction] = useState<ConfirmableAction | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Stage 2: Under Processing Progress & Private Attachment state
  const [processingRemarks, setProcessingRemarks] = useState("");
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressSuccess, setProgressSuccess] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Stage 3: Ready for Release state
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [paymentSelected, setPaymentSelected] = useState(false);
  const [customCollectionInstructions, setCustomCollectionInstructions] =
    useState("");
  const [readinessRemarks, setReadinessRemarks] = useState("");
  const [readyConfirmations, setReadyConfirmations] =
    useState<ReadyConfirmations>({
      correctRequest: false,
      preparationCompleted: false,
      preparedAndVerified: false,
      priorRecordsReviewed: false,
    });

  const handleToggleRequiredItem = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const combinedCollectionInstructions = useMemo(
    () =>
      buildCombinedCollectionInstructions({
        selectedWindow,
        selectedItems,
        paymentSelected,
        customInstructions: customCollectionInstructions,
      }),
    [
      selectedWindow,
      selectedItems,
      paymentSelected,
      customCollectionInstructions,
    ]
  );

  // Stage 4: Identity Verification & Release Recording state
  const [collectorType, setCollectorType] =
    useState<CollectorType>("requester");
  const [collectorName, setCollectorName] = useState("");
  const [releaseRemarks, setReleaseRemarks] = useState("");
  const [identityVerifiedChecked, setIdentityVerifiedChecked] = useState(false);
  const [handoverConfirmedChecked, setHandoverConfirmedChecked] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      try {
        const res = await fetch(
          `/api/staff/requests/${encodeURIComponent(requestId)}`,
          { cache: "no-store" }
        );
        if (cancelled) return;

        const data = (await res.json().catch(() => null)) as {
          error?: string;
          request?: StaffRequestRecord;
          category?: string;
          history?: StaffHistoryEvent[];
        } | null;

        if (!res.ok || !data?.request) {
          setError(data?.error || "Unable to load request details.");
          setLoading(false);
          return;
        }

        setRequest(data.request);
        setCategory(data.category ?? "Registrar Document");
        setHistory(data.history ?? []);
        setRequesterRemarks(data.request.requesterRemarks ?? "");
        setInternalNotes(data.request.internalStaffNotes ?? "");
        setCustomCollectionInstructions(
          data.request.collectionInstructions ?? ""
        );
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
      if (
        event.key === "Escape" &&
        !isSubmitting &&
        !isUploadingDoc &&
        !isSavingProgress
      ) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting, isUploadingDoc, isSavingProgress]);

  const checklistItems = useMemo(() => {
    if (!request) return [];
    return buildInitialVerificationChecklist(
      request.documentTypeCode,
      request.copies
    );
  }, [request]);

  const completedChecklistCount = useMemo(
    () => checklistItems.filter((item) => Boolean(checkedItems[item.id])).length,
    [checklistItems, checkedItems]
  );

  const processingEntries = useMemo(
    () =>
      history.filter(
        (h) =>
          h.actionType === "processing_progress" ||
          h.actionType === "attach_prepared_document" ||
          (h.fromStatus === "processing" && h.toStatus === "processing")
      ),
    [history]
  );

  const handleCopyRef = async () => {
    if (!request) return;
    try {
      await navigator.clipboard.writeText(request.referenceNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleAddProcessingProgress = async () => {
    if (!request || isSavingProgress) return;
    setProgressError(null);
    setProgressSuccess(null);

    if (!processingRemarks.trim()) {
      setProgressError(
        "Please enter processing remarks or preparation findings before saving a progress entry."
      );
      return;
    }

    setIsSavingProgress(true);
    try {
      const res = await fetch(
        `/api/staff/requests/${encodeURIComponent(request.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_processing_progress",
            processingRemarks: processingRemarks.trim(),
          }),
        }
      );

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        request?: StaffRequestRecord;
        history?: StaffHistoryEvent[];
      } | null;

      if (!res.ok || !data?.request) {
        setProgressError(
          data?.error || "Unable to save processing progress entry right now."
        );
        return;
      }

      setRequest(data.request);
      if (data.history) setHistory(data.history);
      setProcessingRemarks("");
      onRequestUpdated?.(data.request);
      router.refresh();
      setProgressSuccess(
        "Processing progress entry recorded under your Staff account. Previous verification records remain preserved."
      );
    } catch {
      setProgressError(
        "A network error occurred while saving your processing progress entry."
      );
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleUploadPreparedDocument = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !request || isUploadingDoc) return;

    setUploadError(null);
    setUploadSuccess(null);

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File exceeds the 10 MB maximum size limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/staff/requests/${encodeURIComponent(request.id)}/attachment`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        request?: StaffRequestRecord;
        history?: StaffHistoryEvent[];
      } | null;

      if (!res.ok || !data?.request) {
        setUploadError(
          data?.error || "Unable to upload the prepared document right now."
        );
        return;
      }

      setRequest(data.request);
      if (data.history) setHistory(data.history);
      onRequestUpdated?.(data.request);
      router.refresh();
      setUploadSuccess(
        `Prepared document "${data.request.preparedDocumentName ?? file.name}" attached privately. Request remains Under Processing until you explicitly mark it Ready for Release.`
      );
    } catch {
      setUploadError(
        "A network error occurred while uploading the prepared document."
      );
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInitiateAction = (action: ConfirmableAction) => {
    setActionError(null);
    setActionSuccess(null);

    if (action === "start_processing") {
      const missingChecklist = checklistItems.filter(
        (item) => item.required && !checkedItems[item.id]
      );
      if (missingChecklist.length > 0) {
        setActionError(
          `Complete all required verification checklist items before starting processing (${missingChecklist.length} remaining, e.g., "${missingChecklist[0].label}").`
        );
        return;
      }
      if (!verificationRemarks.trim()) {
        setActionError(
          "Please enter Staff verification remarks summarizing your review before progressing to Under Processing."
        );
        return;
      }
      if (!confirmInitialVerification) {
        setActionError(
          "Please check the explicit verification confirmation box before starting processing."
        );
        return;
      }
    }

    if (
      (action === "request_correction" || action === "reject_request") &&
      !requesterRemarks.trim()
    ) {
      setActionError(
        action === "request_correction"
          ? "Please enter clear correction instructions for the requester before requesting a correction."
          : "Please enter an explicit rejection reason visible to the requester before rejecting."
      );
      return;
    }

    if (action === "mark_ready_for_release") {
      const missingReady = READY_CONFIRMATION_ITEMS.filter(
        (item) => !readyConfirmations[item.key]
      );
      if (missingReady.length > 0) {
        setActionError(
          `Please complete all Ready for Release confirmations (${missingReady.length} remaining, e.g., "${missingReady[0].label}").`
        );
        return;
      }
    }

    if (action === "record_release") {
      if (!identityVerifiedChecked) {
        setActionError(
          "Please confirm that collector identity verification has been completed."
        );
        return;
      }
      if (!handoverConfirmedChecked) {
        setActionError(
          "Please confirm that the physical document handover has been completed."
        );
        return;
      }
      if (
        collectorType === "authorized_representative" &&
        !collectorName.trim()
      ) {
        setActionError(
          "Please enter the full name of the authorized representative collecting the document."
        );
        return;
      }
    }

    setPendingAction(action);
  };

  const executeStaffAction = async (action: StaffReviewAction) => {
    if (!request || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        action,
        requesterRemarks: requesterRemarks.trim(),
        internalNotes: internalNotes.trim(),
      };

      if (action === "start_processing") {
        payload.checklistResults = checklistItems.map((item) => ({
          id: item.id,
          label: item.label,
          checked: Boolean(checkedItems[item.id]),
        }));
        payload.verificationRemarks = verificationRemarks.trim();
        payload.confirmInitialVerification = confirmInitialVerification;
      }

      if (action === "request_correction" || action === "reject_request") {
        payload.verificationRemarks = verificationRemarks.trim();
      }

      if (action === "mark_ready_for_release") {
        payload.collectionInstructions = combinedCollectionInstructions;
        payload.verificationRemarks = readinessRemarks.trim();
        payload.readyConfirmations = readyConfirmations;
        payload.confirmReady = true;
      }

      if (action === "record_release") {
        payload.identityVerified = identityVerifiedChecked;
        payload.handoverConfirmed = handoverConfirmedChecked;
        payload.collectorType = collectorType;
        payload.collectorName = collectorName.trim();
        payload.releaseRemarks = releaseRemarks.trim();
      }

      const res = await fetch(
        `/api/staff/requests/${encodeURIComponent(request.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        request?: StaffRequestRecord;
        history?: StaffHistoryEvent[];
      } | null;

      if (!res.ok || !data?.request) {
        setPendingAction(null);
        setActionError(
          data?.error || "Unable to complete the requested staff action."
        );
        return;
      }

      setRequest(data.request);
      if (data.history) setHistory(data.history);
      setPendingAction(null);
      onRequestUpdated?.(data.request);
      router.refresh();

      if (action === "start_processing") {
        setVerificationRemarks("");
        setConfirmInitialVerification(false);
        setActionSuccess(
          "Stage 1 verification saved permanently. Request is now Under Processing and the requester has been notified."
        );
      } else if (action === "request_correction") {
        setActionSuccess(
          "Request returned for correction and the requester has been notified."
        );
      } else if (action === "reject_request") {
        setActionSuccess(
          "Request has been marked as Rejected and the requester has been notified."
        );
      } else if (action === "mark_ready_for_release") {
        setSelectedWindow(null);
        setSelectedItems([]);
        setPaymentSelected(false);
        setCustomCollectionInstructions("");
        setReadinessRemarks("");
        setReadyConfirmations({
          correctRequest: false,
          preparationCompleted: false,
          preparedAndVerified: false,
          priorRecordsReviewed: false,
        });
        setActionSuccess(
          "Stage 3 Ready for Release verification recorded. The requester has been notified."
        );
      } else if (action === "record_release") {
        setIdentityVerifiedChecked(false);
        setHandoverConfirmedChecked(false);
        setActionSuccess(
          "Stage 4 Official Release verified and recorded. The requester has been notified."
        );
      } else {
        setActionSuccess("Internal staff notes saved.");
      }
    } catch {
      setPendingAction(null);
      setActionError(
        "A network error occurred while saving your review action."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSaveInternalNotes =
    request?.status === "pending" ||
    request?.status === "processing" ||
    request?.status === "needs_correction" ||
    request?.status === "ready_for_release";

  const renderInlineFeedback = () => (
    <>
      {actionSuccess && (
        <div
          role="status"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#246B45]/30 bg-[#E6EFE8]/80 p-3 text-xs font-medium text-[#25352B]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs font-medium text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <span>{actionError}</span>
        </div>
      )}
    </>
  );

  const renderConfirmationBar = (action: ConfirmableAction) => (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/90 p-4">
      <p className="text-xs font-bold text-amber-950">
        {ACTION_LABELS[action].title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-900">
        {ACTION_LABELS[action].confirmText}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void executeStaffAction(action)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60 ${
            action === "reject_request"
              ? "bg-red-700 hover:bg-red-800"
              : "bg-[#174D32] hover:bg-[#246B45]"
          }`}
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>
            {isSubmitting ? "Saving..." : ACTION_LABELS[action].buttonLabel}
          </span>
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setPendingAction(null)}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#25352B] hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-request-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold tracking-wider text-[#174D32] uppercase">
                {request ? `${category} · Staff Workspace` : "Request Review"}
              </p>
              {request?.isResubmitted && request.status === "pending" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#246B45]/30 bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-bold text-[#174D32] uppercase">
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Corrected / Resubmitted
                </span>
              )}
            </div>
            <h2
              id="staff-request-details-title"
              className="mt-0.5 truncate text-lg font-bold text-[#25352B] sm:text-xl"
            >
              {request ? request.documentType : "Loading Request..."}
            </h2>
          </div>

          <button
            type="button"
            disabled={isSubmitting || isUploadingDoc || isSavingProgress}
            onClick={onClose}
            aria-label="Close request review"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#174D32]" />
              <span>Loading request record...</span>
            </div>
          ) : error || !request ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <span>{error || "Document request not found."}</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Reference & Status */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#246B45]/20 bg-[#F5F5EF] p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    Request Reference Number
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-[#174D32] sm:text-lg">
                      {request.referenceNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyRef()}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8] hover:text-[#174D32]"
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

              {/* Continuous Stage Progression Bar + Retained Immutable Previous-Stage Records */}
              <StaffStageProgressRecords request={request} history={history} />

              {/* Requester & Request Details Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#25352B] uppercase">
                    <User className="h-4 w-4 text-[#174D32]" />
                    <span>Requester Information</span>
                  </h3>
                  <dl className="mt-3 space-y-2.5 text-xs">
                    <div>
                      <dt className="font-semibold text-slate-500">
                        Full Name
                      </dt>
                      <dd className="mt-0.5 font-semibold text-[#25352B]">
                        {request.requesterName}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">
                        Student ID
                      </dt>
                      <dd className="mt-0.5 font-semibold text-[#25352B]">
                        {request.requesterStudentId ?? "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">
                        DNSC Email
                      </dt>
                      <dd className="mt-0.5 truncate font-medium text-[#25352B]">
                        {request.requesterEmail || "Not available"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">
                        Institute
                      </dt>
                      <dd className="mt-0.5 font-medium text-[#25352B]">
                        {request.requesterInstitute || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">
                        Program
                      </dt>
                      <dd className="mt-0.5 font-medium text-[#25352B]">
                        {request.requesterProgram || "Not provided"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#25352B] uppercase">
                    <FileText className="h-4 w-4 text-[#174D32]" />
                    <span>Submitted Request Details</span>
                  </h3>
                  <dl className="mt-3 space-y-2.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="font-semibold text-slate-500">
                        Submitted
                      </dt>
                      <dd className="font-medium text-[#25352B]">
                        {formatDateTime(request.submittedAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="font-semibold text-slate-500">Copies</dt>
                      <dd className="font-semibold text-[#25352B]">
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
                    {request.additionalNotes && (
                      <div>
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
              </div>

              {/* =================================================================
                  STAGE 1 ACTIVE WORKSPACE: Submitted / Pending Initial Verification
                  ================================================================= */}
              {request.status === "pending" && (
                <div className="rounded-xl border border-[#174D32]/30 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#174D32] uppercase">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>
                        Stage 1 — Initial Verification Checklist (
                        {request.documentType})
                      </span>
                    </h3>
                    <span className="rounded-full bg-[#E6EFE8] px-2.5 py-0.5 text-[11px] font-bold text-[#174D32]">
                      {completedChecklistCount} / {checklistItems.length}{" "}
                      checked
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-600">
                    Complete all verification items and record your findings
                    below before progressing this request to{" "}
                    <strong>Under Processing</strong>. This verification record
                    will be retained permanently under your authenticated Staff
                    account.
                  </p>

                  <ul className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-[#F5F5EF]/60 p-3">
                    {checklistItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2.5">
                        <input
                          id={`checklist-${item.id}`}
                          type="checkbox"
                          checked={Boolean(checkedItems[item.id])}
                          onChange={(e) =>
                            setCheckedItems((prev) => ({
                              ...prev,
                              [item.id]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#174D32]"
                        />
                        <label
                          htmlFor={`checklist-${item.id}`}
                          className="text-xs leading-relaxed text-[#25352B]"
                        >
                          {item.label}{" "}
                          <span className="text-red-700">*</span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    <label
                      htmlFor="stage1-verification-remarks"
                      className="flex items-center justify-between text-xs font-semibold text-[#25352B]"
                    >
                      <span>
                        Staff Verification Remarks / Findings{" "}
                        <span className="text-red-700">*</span>
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        Permanent Staff Record
                      </span>
                    </label>
                    <textarea
                      id="stage1-verification-remarks"
                      rows={3}
                      maxLength={1500}
                      value={verificationRemarks}
                      onChange={(e) => setVerificationRemarks(e.target.value)}
                      placeholder="Record your actual review findings (e.g., student identity and purpose verified against registrar records, requirements complete)."
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                    />
                  </div>

                  <label className="mt-3 flex items-start gap-2.5 rounded-lg border border-[#246B45]/25 bg-[#E6EFE8]/45 p-3 text-xs text-[#25352B]">
                    <input
                      type="checkbox"
                      checked={confirmInitialVerification}
                      onChange={(e) =>
                        setConfirmInitialVerification(e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#174D32]"
                    />
                    <span>
                      <strong>Verification Confirmation:</strong> I confirm
                      that I have reviewed this request, verified its
                      requirements, and authorize progressing it to{" "}
                      <strong>Under Processing</strong> under my authenticated
                      Staff account.
                    </span>
                  </label>

                  <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="staff-requester-remarks"
                        className="flex items-center justify-between text-xs font-semibold text-[#25352B]"
                      >
                        <span>Requester-Visible Remarks</span>
                        <span className="rounded bg-[#E6EFE8] px-1.5 py-0.5 text-[10px] font-semibold text-[#174D32]">
                          Visible to Requester
                        </span>
                      </label>
                      <textarea
                        id="staff-requester-remarks"
                        rows={2}
                        maxLength={1000}
                        value={requesterRemarks}
                        onChange={(e) => setRequesterRemarks(e.target.value)}
                        placeholder="Optional when starting processing; required for Correction or Rejection."
                        className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="staff-internal-notes"
                        className="flex items-center justify-between text-xs font-semibold text-[#25352B]"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3 text-slate-500" />
                          <span>Internal Staff Notes</span>
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          Staff Only
                        </span>
                      </label>
                      <textarea
                        id="staff-internal-notes"
                        rows={2}
                        maxLength={1500}
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="Internal context for Registrar Staff. Never shown to the requester."
                        className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-[#F5F5EF]/50 px-3 py-2 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                      />
                    </div>
                  </div>

                  {pendingAction &&
                  (pendingAction === "start_processing" ||
                    pendingAction === "request_correction" ||
                    pendingAction === "reject_request") ? (
                    renderConfirmationBar(pendingAction)
                  ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleInitiateAction("start_processing")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#246B45] disabled:opacity-60"
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Verify &amp; Start Processing</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          handleInitiateAction("request_correction")
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:opacity-60"
                      >
                        <AlertTriangle
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        <span>Request Correction</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleInitiateAction("reject_request")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Reject Request</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          void executeStaffAction("save_internal_note")
                        }
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#25352B] transition-colors hover:bg-[#F5F5EF] disabled:opacity-60"
                      >
                        <Save className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Save Internal Note</span>
                      </button>
                    </div>
                  )}

                  {renderInlineFeedback()}
                </div>
              )}

              {/* =================================================================
                  STAGE 2 ACTIVE WORKSPACE: Under Processing Progress & Preparation
                  ================================================================= */}
              {request.status === "processing" && (
                <div className="space-y-4">
                  {/* 2A. Current Processing Progress Log & Entry Form */}
                  <div className="rounded-xl border border-[#174D32]/30 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#174D32] uppercase">
                        <MessageSquarePlus className="h-4 w-4" />
                        <span>Stage 2 — Current Processing Progress</span>
                      </h3>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Separate from Stage 1 Verification
                      </span>
                    </div>

                    {processingEntries.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {processingEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-lg border border-slate-200 bg-[#F5F5EF]/60 p-3 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-[#25352B]">
                                {entry.actionType === "attach_prepared_document"
                                  ? "Prepared Document Attached"
                                  : "Processing Progress Entry"}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {formatDateTime(entry.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 whitespace-pre-line text-slate-700">
                              {entry.verificationRemarks ||
                                entry.internalNotes ||
                                "Progress recorded."}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Staff: <strong>{entry.actorName}</strong>
                              {entry.actorAccountRef
                                ? ` (${entry.actorAccountRef})`
                                : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3">
                      <label
                        htmlFor="stage2-processing-remarks"
                        className="block text-xs font-semibold text-[#25352B]"
                      >
                        Record Processing Progress / Preparation Findings
                      </label>
                      <textarea
                        id="stage2-processing-remarks"
                        rows={2}
                        maxLength={1500}
                        value={processingRemarks}
                        onChange={(e) => setProcessingRemarks(e.target.value)}
                        placeholder="e.g., Grades verified against official transcript ledger; draft printed for Registrar review."
                        className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                      />
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSavingProgress || isSubmitting}
                          onClick={() => void handleAddProcessingProgress()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32] bg-white px-3.5 py-2 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8] disabled:opacity-60"
                        >
                          {isSavingProgress ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isSavingProgress
                              ? "Recording..."
                              : "Add Progress Entry"}
                          </span>
                        </button>
                      </div>
                      {progressSuccess && (
                        <div
                          role="status"
                          className="mt-2.5 flex items-start gap-2 rounded-lg border border-[#246B45]/30 bg-[#E6EFE8]/80 p-2.5 text-xs text-[#25352B]"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
                          <span>{progressSuccess}</span>
                        </div>
                      )}
                      {progressError && (
                        <div
                          role="alert"
                          className="mt-2.5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                          <span>{progressError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2B. Document Preparation & Private Attachment */}
                  <div className="rounded-xl border border-[#246B45]/25 bg-[#F5F5EF]/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#25352B] uppercase">
                        <FileCheck2 className="h-4 w-4 text-[#174D32]" />
                        <span>
                          Document Preparation &amp; Private Attachment
                        </span>
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        <Lock className="h-2.5 w-2.5" />
                        Staff-Only Private Storage
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-600">
                      Optionally attach a prepared copy (PDF, JPG, or PNG, max
                      10 MB) for internal Registrar verification. Attaching a
                      file does not automatically change the request status.
                    </p>

                    {request.hasPreparedDocument && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#246B45]/25 bg-white p-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#174D32]">
                            {request.preparedDocumentName ||
                              "Prepared Document"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatFileSize(request.preparedDocumentSize)}
                            {request.preparedAt
                              ? ` · Attached ${formatDateTime(request.preparedAt)}`
                              : ""}
                          </p>
                        </div>
                        <a
                          href={`/api/staff/requests/${encodeURIComponent(request.id)}/attachment`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32]/30 bg-[#E6EFE8]/60 px-3 py-1.5 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Preview / Download</span>
                        </a>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={handleUploadPreparedDocument}
                        disabled={isUploadingDoc || isSubmitting}
                        className="hidden"
                        id="staff-prepared-doc-input"
                      />
                      <button
                        type="button"
                        disabled={isUploadingDoc || isSubmitting}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32] bg-white px-3.5 py-2 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#E6EFE8] disabled:opacity-60"
                      >
                        {isUploadingDoc ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isUploadingDoc
                            ? "Uploading..."
                            : request.hasPreparedDocument
                              ? "Replace Prepared Document"
                              : "Upload Prepared Document"}
                        </span>
                      </button>
                    </div>

                    {uploadSuccess && (
                      <div
                        role="status"
                        className="mt-3 flex items-start gap-2 rounded-lg border border-[#246B45]/30 bg-[#E6EFE8]/80 p-2.5 text-xs text-[#25352B]"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
                        <span>{uploadSuccess}</span>
                      </div>
                    )}
                    {uploadError && (
                      <div
                        role="alert"
                        className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>

                  {/* 2C. Progress to Stage 3 — Ready for Release */}
                  <div className="overflow-hidden rounded-xl border border-[#174D32]/30 bg-white">
                    <div className="border-b border-slate-100 bg-[#F5F5EF]/60 px-4 py-3">
                      <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#174D32] uppercase">
                        <PackageCheck className="h-4 w-4" />
                        <span>Progress to Stage 3 — Ready for Release</span>
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        Review the retained Stage 1 verification and Stage 2
                        processing records above before preparing collection
                        instructions and confirming release readiness.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-200/80">
                      {/* Section 1 — Collection Instructions */}
                      <div className="p-4">
                        <CollectionInstructionsSelector
                          selectedWindow={selectedWindow}
                          onSelectWindow={setSelectedWindow}
                          selectedItems={selectedItems}
                          onToggleItem={handleToggleRequiredItem}
                          paymentSelected={paymentSelected}
                          onTogglePayment={() =>
                            setPaymentSelected((prev) => !prev)
                          }
                          customInstructions={customCollectionInstructions}
                          onChangeCustomInstructions={
                            setCustomCollectionInstructions
                          }
                          disabled={isSubmitting || isUploadingDoc}
                        />
                      </div>

                      {/* Section 2 — Readiness Verification Remarks (Staff Only) */}
                      <div className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            htmlFor="staff-readiness-remarks"
                            className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#25352B] uppercase"
                          >
                            <Lock
                              className="h-3.5 w-3.5 text-slate-500"
                              aria-hidden="true"
                            />
                            <span>
                              2. Readiness Verification Remarks (Optional)
                            </span>
                          </label>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Staff Only &middot; Not Visible to Requester
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Internal Registrar verification notes recorded with
                          this stage progression.
                        </p>
                        <textarea
                          id="staff-readiness-remarks"
                          rows={2}
                          maxLength={1500}
                          disabled={isSubmitting || isUploadingDoc}
                          value={readinessRemarks}
                          onChange={(e) => setReadinessRemarks(e.target.value)}
                          placeholder="Optional internal readiness confirmation notes..."
                          className="mt-2 block w-full rounded-lg border border-slate-300 bg-[#F5F5EF]/50 px-3 py-2 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 disabled:opacity-60"
                        />
                      </div>

                      {/* Section 3 — Confirmation & Action */}
                      <div className="bg-[#F5F5EF]/50 p-4">
                        <h4 className="text-xs font-bold tracking-wider text-[#25352B] uppercase">
                          3. Confirmation &amp; Action
                        </h4>
                        <div className="mt-2.5 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                          {READY_CONFIRMATION_ITEMS.map((item) => (
                            <label
                              key={item.key}
                              className="flex items-start gap-2.5 text-xs text-[#25352B]"
                            >
                              <input
                                type="checkbox"
                                checked={readyConfirmations[item.key]}
                                onChange={(e) =>
                                  setReadyConfirmations((prev) => ({
                                    ...prev,
                                    [item.key]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#174D32]"
                              />
                              <span>
                                {item.label}{" "}
                                <span className="text-red-700">*</span>
                              </span>
                            </label>
                          ))}
                        </div>

                        {pendingAction === "mark_ready_for_release" ? (
                          renderConfirmationBar("mark_ready_for_release")
                        ) : (
                          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] text-slate-500">
                              All 4 confirmations are required before notifying
                              the requester.
                            </p>
                            <button
                              type="button"
                              disabled={isSubmitting || isUploadingDoc}
                              onClick={() =>
                                handleInitiateAction("mark_ready_for_release")
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#246B45] disabled:opacity-60"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              <span>Confirm &amp; Mark Ready for Release</span>
                            </button>
                          </div>
                        )}

                        {renderInlineFeedback()}
                      </div>
                    </div>
                  </div>

                  {/* 2D. Return for Correction / Reject / Internal Notes */}
                  <details className="rounded-xl border border-slate-200 bg-white">
                    <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-700">
                      Other Processing Actions (Return for Correction, Reject, or
                      Internal Notes)
                    </summary>
                    <div className="border-t border-slate-100 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor="processing-requester-remarks"
                            className="block text-xs font-semibold text-[#25352B]"
                          >
                            Requester-Visible Instructions (Required for
                            Correction/Rejection)
                          </label>
                          <textarea
                            id="processing-requester-remarks"
                            rows={2}
                            maxLength={1000}
                            value={requesterRemarks}
                            onChange={(e) =>
                              setRequesterRemarks(e.target.value)
                            }
                            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="processing-internal-notes"
                            className="block text-xs font-semibold text-[#25352B]"
                          >
                            Internal Staff Notes (Staff Only)
                          </label>
                          <textarea
                            id="processing-internal-notes"
                            rows={2}
                            maxLength={1500}
                            value={internalNotes}
                            onChange={(e) => setInternalNotes(e.target.value)}
                            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-[#F5F5EF]/50 px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                          />
                        </div>
                      </div>

                      {pendingAction &&
                      (pendingAction === "request_correction" ||
                        pendingAction === "reject_request") ? (
                        renderConfirmationBar(pendingAction)
                      ) : (
                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() =>
                              handleInitiateAction("request_correction")
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-900 hover:bg-orange-100 disabled:opacity-60"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Request Correction</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() =>
                              handleInitiateAction("reject_request")
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject Request</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() =>
                              void executeStaffAction("save_internal_note")
                            }
                            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#25352B] hover:bg-[#F5F5EF] disabled:opacity-60"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span>Save Internal Note</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* =================================================================
                  STAGE 4 ACTIVE WORKSPACE: Ready for Release -> Actual Release
                  ================================================================= */}
              {request.status === "ready_for_release" && (
                <div className="rounded-xl border border-[#174D32]/30 bg-[#E6EFE8]/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#174D32] uppercase">
                      <ShieldCheck className="h-4 w-4" />
                      <span>
                        Stage 4 — Identity Verification &amp; Release Recording
                      </span>
                    </h3>
                    {request.readyForReleaseAt && (
                      <span className="text-[11px] font-medium text-slate-600">
                        Ready since {formatDateTime(request.readyForReleaseAt)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-[#25352B]">
                        Collected By <span className="text-red-700">*</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setCollectorType("requester")}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            collectorType === "requester"
                              ? "border-[#174D32] bg-[#174D32] text-white"
                              : "border-slate-300 bg-white text-[#25352B] hover:bg-[#E6EFE8]"
                          }`}
                        >
                          Requester ({request.requesterName})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCollectorType("authorized_representative")
                          }
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            collectorType === "authorized_representative"
                              ? "border-[#174D32] bg-[#174D32] text-white"
                              : "border-slate-300 bg-white text-[#25352B] hover:bg-[#E6EFE8]"
                          }`}
                        >
                          Authorized Representative
                        </button>
                      </div>
                    </div>

                    {collectorType === "authorized_representative" && (
                      <div>
                        <label
                          htmlFor="staff-collector-name"
                          className="block text-xs font-semibold text-[#25352B]"
                        >
                          Authorized Representative Full Name{" "}
                          <span className="text-red-700">*</span>
                        </label>
                        <input
                          id="staff-collector-name"
                          type="text"
                          maxLength={200}
                          value={collectorName}
                          onChange={(e) => setCollectorName(e.target.value)}
                          placeholder="Enter full name of the authorized representative"
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                        />
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="staff-release-remarks"
                        className="block text-xs font-semibold text-[#25352B]"
                      >
                        Release Remarks (Optional, Staff Record)
                      </label>
                      <textarea
                        id="staff-release-remarks"
                        rows={2}
                        maxLength={1000}
                        value={releaseRemarks}
                        onChange={(e) => setReleaseRemarks(e.target.value)}
                        placeholder="Optional counter verification notes (e.g., ID presented, authorization letter verified)."
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                      />
                    </div>

                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                      <label className="flex items-start gap-2.5 text-xs text-[#25352B]">
                        <input
                          type="checkbox"
                          checked={identityVerifiedChecked}
                          onChange={(e) =>
                            setIdentityVerifiedChecked(e.target.checked)
                          }
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#174D32]"
                        />
                        <span>
                          <strong>Identity Verification Completed:</strong>{" "}
                          Valid ID (and authorization letter if applicable) was
                          checked and verified.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 text-xs text-[#25352B]">
                        <input
                          type="checkbox"
                          checked={handoverConfirmedChecked}
                          onChange={(e) =>
                            setHandoverConfirmedChecked(e.target.checked)
                          }
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#174D32]"
                        />
                        <span>
                          <strong>Handover Confirmed:</strong> The physical
                          document copy/copies have been released to the
                          verified collector.
                        </span>
                      </label>
                    </div>

                    {pendingAction === "record_release" ? (
                      renderConfirmationBar("record_release")
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleInitiateAction("record_release")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#246B45] disabled:opacity-60"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Record Actual Release</span>
                      </button>
                    )}

                    {renderInlineFeedback()}
                  </div>
                </div>
              )}

              {/* Needs Correction / Rejected Info */}
              {request.status === "needs_correction" && canSaveInternalNotes && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 text-xs text-orange-950">
                  <p className="font-bold">Awaiting Requester Resubmission</p>
                  <p className="mt-1 text-orange-900">
                    This request was returned for correction. Once the requester
                    submits updated details, it will return to{" "}
                    <strong>Submitted / Pending</strong> while preserving all
                    prior review records.
                  </p>
                </div>
              )}

              {request.status === "rejected" && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-[#F5F5EF] p-3.5 text-xs text-slate-700">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
                  <span>
                    This request is <strong>Rejected</strong> and no further
                    workflow transitions apply.
                  </span>
                </div>
              )}

              {/* Unified Chronological Audit Log */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#25352B] uppercase">
                  <Clock className="h-4 w-4 text-[#174D32]" />
                  <span>Complete Chronological Audit History</span>
                </h3>
                <ol className="mt-3.5 space-y-3 border-l-2 border-[#E6EFE8] pl-4">
                  <li className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#174D32] ring-4 ring-white"
                    />
                    <p className="text-xs font-bold text-[#25352B]">
                      Stage 1 — Request Submitted ({request.referenceNumber})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDateTime(request.submittedAt)} &middot;{" "}
                      {request.requesterName} (requester)
                    </p>
                  </li>
                  {history.map((event) => (
                    <li key={event.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#246B45] ring-4 ring-white"
                      />
                      <p className="text-xs font-bold text-[#25352B]">
                        {event.actionType === "processing_progress"
                          ? "Stage 2 — Processing Progress Entry"
                          : event.actionType === "attach_prepared_document"
                            ? "Stage 2 — Prepared Document Attached"
                            : event.actionType === "start_processing"
                              ? "Stage 1 → Stage 2 — Verified & Started Processing"
                              : event.actionType === "mark_ready_for_release"
                                ? "Stage 2 → Stage 3 — Confirmed Ready for Release"
                                : event.actionType === "record_release"
                                  ? "Stage 3 → Stage 4 — Verified & Officially Released"
                                  : event.fromStatus
                                    ? `${event.fromStatus} → ${event.toStatus}`
                                    : event.toStatus}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateTime(event.createdAt)} &middot;{" "}
                        <strong>{event.actorName}</strong> ({event.actorRole}
                        {event.actorAccountRef
                          ? ` · ${event.actorAccountRef}`
                          : ""}
                        )
                      </p>
                      {event.verificationRemarks && (
                        <p className="mt-1 text-xs text-slate-700">
                          <span className="font-semibold">
                            Verification / Progress Findings:
                          </span>{" "}
                          {event.verificationRemarks}
                        </p>
                      )}
                      {event.requesterRemarks && (
                        <p className="mt-1 text-xs text-slate-700">
                          <span className="font-semibold">
                            Requester-Visible Remarks:
                          </span>{" "}
                          {event.requesterRemarks}
                        </p>
                      )}
                      {event.internalNotes &&
                        event.internalNotes !== event.verificationRemarks && (
                          <p className="mt-1 rounded bg-[#F5F5EF] px-2 py-1 text-xs text-slate-600">
                            <span className="font-semibold text-[#25352B]">
                              Internal Note:
                            </span>{" "}
                            {event.internalNotes}
                          </p>
                        )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-100 bg-[#F5F5EF]/60 px-6 py-3.5">
          <button
            type="button"
            disabled={isSubmitting || isUploadingDoc || isSavingProgress}
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
