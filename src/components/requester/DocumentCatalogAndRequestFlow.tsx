"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileBadge,
  FileText,
  FolderOpen,
  GraduationCap,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { dispatchNotificationsUpdated } from "@/components/requester/NotificationQuickPanel";
import type { RequesterDocumentRequestDetail } from "@/lib/db/requests";
import {
  hasCompleteAcademicProfile,
  requiresAcademicProfileForDocument,
} from "@/lib/dnsc/academic-programs";
import {
  DOCUMENT_CATALOG,
  type DocumentCatalogItem,
  type DocumentTypeCode,
} from "@/lib/requester/document-catalog";
import type { SafeUser } from "@/types/auth";

interface DocumentCatalogAndRequestFlowProps {
  user: SafeUser;
  catalog?: readonly DocumentCatalogItem[];
}

function DocumentTypeIcon({ code }: { code: DocumentTypeCode }) {
  switch (code) {
    case "tor":
      return <FileText className="h-5 w-5" aria-hidden="true" />;
    case "coe":
      return <FileBadge className="h-5 w-5" aria-hidden="true" />;
    case "diploma":
      return <GraduationCap className="h-5 w-5" aria-hidden="true" />;
    case "other":
    default:
      return <FolderOpen className="h-5 w-5" aria-hidden="true" />;
  }
}

const COMMON_REQUEST_PURPOSES = [
  "Employment",
  "Board Examination",
  "Scholarship",
  "Transfer / Enrollment",
  "Graduate Studies",
  "Personal Record",
] as const;

function createDraftIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DocumentCatalogAndRequestFlow({
  user,
  catalog = DOCUMENT_CATALOG,
}: DocumentCatalogAndRequestFlowProps) {
  const searchParams = useSearchParams();
  const initialDocCode = searchParams.get("doc");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocumentCatalogItem | null>(
    () =>
      initialDocCode
        ? (catalog.find((item) => item.code === initialDocCode) ?? null)
        : null
  );

  // Live academic profile (refreshed from /api/requester/profile so updates take effect without re-login)
  const [profileAcademic, setProfileAcademic] = useState<{
    institute: string | null;
    program: string | null;
  }>({
    institute: user.institute ?? null,
    program: user.program ?? null,
  });
  const [profileReminderOpen, setProfileReminderOpen] = useState(false);

  // Modal & Form state (preserved while viewing the same document so closing doesn't lose draft input)
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"form" | "review">("form");
  const [purpose, setPurpose] = useState("");
  const [copies, setCopies] = useState(1);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    createDraftIdempotencyKey()
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedRequest, setConfirmedRequest] =
    useState<RequesterDocumentRequestDetail | null>(null);

  useEffect(() => {
    let active = true;
    const refreshProfile = async () => {
      try {
        const res = await fetch("/api/requester/profile", {
          cache: "no-store",
        });
        if (!res.ok || !active) return;
        const data = (await res.json().catch(() => null)) as {
          profile?: { institute?: string | null; program?: string | null };
        } | null;
        if (active && data?.profile) {
          setProfileAcademic({
            institute: data.profile.institute ?? null,
            program: data.profile.program ?? null,
          });
        }
      } catch {
        // Keep current profile snapshot
      }
    };
    void refreshProfile();
    const handleFocus = () => void refreshProfile();
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!requestModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setRequestModalOpen(false);
        setModalStep("form");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestModalOpen, isSubmitting]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.shortLabel.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.shortDescription.toLowerCase().includes(q)
    );
  }, [catalog, searchQuery]);

  const handleSelectDocument = (doc: DocumentCatalogItem) => {
    setSelectedDoc(doc);
    setRequestModalOpen(false);
    setModalStep("form");
    setPurpose("");
    setCopies(1);
    setAdditionalNotes("");
    setFieldErrors({});
    setSubmitError(null);
    setConfirmedRequest(null);
    setIdempotencyKey(createDraftIdempotencyKey());
  };

  const handleBackToCatalog = () => {
    setSelectedDoc(null);
    setRequestModalOpen(false);
    setModalStep("form");
    setFieldErrors({});
    setSubmitError(null);
    setConfirmedRequest(null);
  };

  const handleOpenRequestModal = () => {
    setSubmitError(null);
    if (
      selectedDoc &&
      requiresAcademicProfileForDocument(selectedDoc.code) &&
      !hasCompleteAcademicProfile(profileAcademic)
    ) {
      setProfileReminderOpen(true);
      return;
    }
    setModalStep("form");
    setRequestModalOpen(true);
  };

  const handleCloseRequestModal = () => {
    if (isSubmitting) return;
    setRequestModalOpen(false);
    setModalStep("form");
  };

  const validateForm = (): boolean => {
    if (!selectedDoc) return false;
    const nextErrors: Record<string, string> = {};

    if (!purpose.trim()) {
      nextErrors.purpose = "Please enter the purpose of your document request.";
    } else if (purpose.trim().length > 300) {
      nextErrors.purpose = "Purpose must be 300 characters or fewer.";
    }

    if (!Number.isInteger(copies) || copies < 1 || copies > 10) {
      nextErrors.copies = "Number of copies must be between 1 and 10.";
    }

    if (selectedDoc.requiresAdditionalNotes && !additionalNotes.trim()) {
      nextErrors.additionalNotes =
        "Please specify the exact Registrar document or certification you are requesting.";
    } else if (additionalNotes.trim().length > 1000) {
      nextErrors.additionalNotes =
        "Additional details must be 1,000 characters or fewer.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleReviewSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;
    setModalStep("review");
  };

  const handleFinalConfirm = async () => {
    if (!selectedDoc || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/requester/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTypeCode: selectedDoc.code,
          purpose: purpose.trim(),
          copies,
          additionalNotes: additionalNotes.trim(),
          idempotencyKey,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        code?: string;
        fieldErrors?: Record<string, string>;
        request?: RequesterDocumentRequestDetail;
      } | null;

      if (!response.ok || !payload?.request) {
        if (payload?.code === "ACADEMIC_PROFILE_INCOMPLETE") {
          setRequestModalOpen(false);
          setModalStep("form");
          setProfileReminderOpen(true);
          return;
        }
        setModalStep("form");
        if (payload?.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }
        setSubmitError(
          payload?.error ||
            "Unable to submit your document request. Please try again."
        );
        return;
      }

      setRequestModalOpen(false);
      setModalStep("form");
      setConfirmedRequest(payload.request);
      dispatchNotificationsUpdated();
    } catch {
      setModalStep("form");
      setSubmitError(
        "A network error occurred while submitting your request. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 3: Confirmed Submission Screen
  if (confirmedRequest) {
    return (
      <div className="space-y-6">
        <section
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[#246B45]/30 bg-white p-6 shadow-xs sm:p-8"
        >
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6EFE8] text-[#174D32]">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>

            <span className="mt-4 inline-block rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-0.5 text-xs font-bold tracking-wide text-[#174D32] uppercase">
              Status: Pending Registrar Review
            </span>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl">
              Document Request Submitted
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Your document request has been recorded and assigned a unique
              reference number. Registrar Staff will review your submission and
              post updates to your account.
            </p>

            <div className="mt-6 rounded-xl border border-[#174D32]/25 bg-[#F5F5EF] p-5">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Request Reference Number
              </p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-[#174D32]">
                {confirmedRequest.referenceNumber}
              </p>
              <dl className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-left text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-500">Document Type</dt>
                  <dd className="mt-0.5 font-semibold text-[#25352B]">
                    {confirmedRequest.documentType}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Copies</dt>
                  <dd className="mt-0.5 font-semibold text-[#25352B]">
                    {confirmedRequest.copies}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500">Purpose</dt>
                  <dd className="mt-0.5 text-[#25352B]">
                    {confirmedRequest.purpose}
                  </dd>
                </div>
                {(confirmedRequest.requesterInstitute ||
                  profileAcademic.institute) && (
                  <div>
                    <dt className="font-semibold text-slate-500">Institute</dt>
                    <dd className="mt-0.5 font-medium text-[#25352B]">
                      {confirmedRequest.requesterInstitute ||
                        profileAcademic.institute}
                    </dd>
                  </div>
                )}
                {(confirmedRequest.requesterProgram ||
                  profileAcademic.program) && (
                  <div>
                    <dt className="font-semibold text-slate-500">Program</dt>
                    <dd className="mt-0.5 font-medium text-[#25352B]">
                      {confirmedRequest.requesterProgram ||
                        profileAcademic.program}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`/dashboard/requester/requests?ref=${encodeURIComponent(confirmedRequest.referenceNumber)}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174D32] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
              >
                <span>View My Requests</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/requester"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8] hover:text-[#174D32]"
              >
                <span>Return to Dashboard</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleBackToCatalog}
              className="mt-4 text-xs font-semibold text-[#174D32] underline-offset-2 hover:underline"
            >
              Request Another Document
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage 2: Dedicated Document Requirements & Details Page (No form shown until "Continue to Request")
  if (selectedDoc) {
    return (
      <div className="space-y-4">
        <div>
          <button
            type="button"
            onClick={handleBackToCatalog}
            className="inline-flex items-center gap-2 rounded-lg border border-[#174D32]/35 bg-white px-4 py-2 text-sm font-semibold text-[#174D32] shadow-2xs transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Catalog</span>
          </button>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          {/* Category & Title */}
          <div className="flex items-start gap-3.5 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
              <DocumentTypeIcon code={selectedDoc.code} />
            </span>
            <div>
              <p className="text-[11px] font-bold tracking-wider text-[#174D32] uppercase">
                {selectedDoc.category}
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[#25352B] sm:text-2xl">
                {selectedDoc.name}
              </h1>
              <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                {selectedDoc.fullDescription}
              </p>
            </div>
          </div>

          {/* Requirements, Needed Info & Instructions */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-[#F5F5EF]/75 p-5">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#25352B] uppercase">
                <ClipboardCheck
                  className="h-4 w-4 text-[#174D32]"
                  aria-hidden="true"
                />
                <span>Requirements &amp; Reminders</span>
              </h2>
              <ul className="mt-3.5 space-y-2.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                {selectedDoc.preparationReminders.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#174D32]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-[#F5F5EF]/75 p-5">
              <h2 className="text-xs font-bold tracking-wider text-[#25352B] uppercase">
                Information Needed Before Requesting
              </h2>
              <ul className="mt-3.5 space-y-2.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                {selectedDoc.requiredRequesterInfo.map((info) => (
                  <li key={info} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#246B45]" />
                    <span>{info}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-5">
            <h2 className="text-xs font-bold tracking-wider text-[#25352B] uppercase">
              Request Instructions
            </h2>
            <ol className="mt-3.5 grid gap-3 sm:grid-cols-2">
              {selectedDoc.instructions.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-3 rounded-lg bg-[#F5F5EF]/60 p-3 text-xs leading-relaxed text-slate-700"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#174D32] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Primary Action */}
          <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={handleOpenRequestModal}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#174D32] px-6 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2 sm:w-auto sm:text-base"
            >
              <span>Continue to Request</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Registrar Review Notice */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#246B45]/20 bg-[#E6EFE8]/55 p-4 text-xs leading-relaxed text-slate-700">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-[#25352B]">
                Registrar Staff Review Required:
              </strong>{" "}
              Submitting a request places it in Pending review. Final
              eligibility, official fees, and release verification are handled
              by DNSC Registrar Staff.
            </span>
          </div>
        </article>

        {/* Request Submission Modal (Opens only on "Continue to Request") */}
        {requestModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
          >
            <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {/* Fixed Modal Header */}
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
                    {selectedDoc.category}
                  </p>
                  <h2
                    id="request-modal-title"
                    className="mt-1 text-xl font-bold tracking-tight text-[#25352B]"
                  >
                    Submit Request for {selectedDoc.name}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Your verified account details are automatically attached to
                    this request.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCloseRequestModal}
                  aria-label="Close request submission modal"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Independently Scrollable Modal Body */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {/* Reused Authenticated Requester Info */}
                <div className="rounded-xl border border-slate-200 bg-[#F5F5EF]/80 p-4 text-xs">
                  <dl className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-slate-500">Full Name</dt>
                      <dd className="mt-0.5 font-semibold text-[#25352B]">
                        {user.fullName}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Student ID</dt>
                      <dd className="mt-0.5 font-semibold text-[#25352B]">
                        {user.studentId ?? "Not set"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">DNSC Email</dt>
                      <dd className="mt-0.5 truncate font-medium text-[#25352B]">
                        {user.email}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-slate-200/80 pt-3">
                    <dl className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-slate-500">
                          Institute (from Profile)
                        </dt>
                        <dd className="mt-0.5 font-semibold text-[#25352B]">
                          {profileAcademic.institute || "Not set"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">
                          Program (from Profile)
                        </dt>
                        <dd className="mt-0.5 font-semibold text-[#25352B]">
                          {profileAcademic.program || "Not set"}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      href={`/dashboard/requester/profile?returnTo=${encodeURIComponent(`/dashboard/requester/request?doc=${selectedDoc.code}`)}#academic-profile`}
                      className="shrink-0 text-[11px] font-semibold text-[#174D32] underline-offset-2 hover:underline"
                    >
                      Update in Profile
                    </Link>
                  </div>
                </div>

                {submitError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-medium text-red-800"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                    <span>{submitError}</span>
                  </div>
                )}

                {modalStep === "form" ? (
                  <form
                    id="requester-submission-form"
                    onSubmit={handleReviewSubmit}
                    noValidate
                    className="mt-5 space-y-4"
                  >
                    {/* Purpose of Request */}
                    <div>
                      <label
                        htmlFor="request-purpose"
                        className="block text-sm font-semibold text-[#25352B]"
                      >
                        Purpose of Request{" "}
                        <span className="text-red-700">*</span>
                      </label>
                      <input
                        id="request-purpose"
                        name="purpose"
                        type="text"
                        required
                        maxLength={300}
                        value={purpose}
                        onChange={(e) => {
                          setPurpose(e.target.value);
                          if (fieldErrors.purpose) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.purpose;
                              return next;
                            });
                          }
                        }}
                        aria-invalid={Boolean(fieldErrors.purpose)}
                        aria-describedby={
                          fieldErrors.purpose
                            ? "request-purpose-options request-purpose-error"
                            : "request-purpose-options"
                        }
                        className={`mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#25352B] shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
                          fieldErrors.purpose
                            ? "border-red-500 focus:border-red-600 focus:ring-red-200"
                            : "border-slate-300 hover:border-slate-400 focus:border-[#174D32] focus:ring-[#246B45]/25"
                        }`}
                      />
                      <div
                        id="request-purpose-options"
                        className="mt-2 flex flex-wrap gap-1.5"
                        role="group"
                        aria-label="Common purposes of request"
                      >
                        {COMMON_REQUEST_PURPOSES.map((option) => {
                          const isSelected =
                            purpose.trim().toLowerCase() ===
                            option.toLowerCase();
                          return (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => {
                                setPurpose(isSelected ? "" : option);
                                if (fieldErrors.purpose) {
                                  setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.purpose;
                                    return next;
                                  });
                                }
                              }}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] ${
                                isSelected
                                  ? "border-[#174D32] bg-[#174D32] text-white"
                                  : "border-slate-200 bg-[#F5F5EF] text-[#25352B] hover:border-[#174D32]/40 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      {fieldErrors.purpose && (
                        <p
                          id="request-purpose-error"
                          role="alert"
                          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
                        >
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{fieldErrors.purpose}</span>
                        </p>
                      )}
                    </div>

                    {/* Number of Copies */}
                    <div>
                      <label
                        htmlFor="request-copies"
                        className="block text-sm font-semibold text-[#25352B]"
                      >
                        Number of Copies{" "}
                        <span className="text-red-700">*</span>
                      </label>
                      <input
                        id="request-copies"
                        name="copies"
                        type="number"
                        min={1}
                        max={10}
                        required
                        value={copies}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          setCopies(Number.isNaN(val) ? 1 : val);
                          if (fieldErrors.copies) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.copies;
                              return next;
                            });
                          }
                        }}
                        aria-invalid={Boolean(fieldErrors.copies)}
                        className="mt-1.5 block w-32 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#25352B] shadow-2xs focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Allowed range: 1 to 10 copies per request.
                      </p>
                      {fieldErrors.copies && (
                        <p
                          role="alert"
                          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
                        >
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{fieldErrors.copies}</span>
                        </p>
                      )}
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label
                        htmlFor="request-notes"
                        className="block text-sm font-semibold text-[#25352B]"
                      >
                        {selectedDoc.additionalNotesLabel}{" "}
                        {selectedDoc.requiresAdditionalNotes && (
                          <span className="text-red-700">*</span>
                        )}
                      </label>
                      <textarea
                        id="request-notes"
                        name="additionalNotes"
                        rows={3}
                        maxLength={1000}
                        required={selectedDoc.requiresAdditionalNotes}
                        value={additionalNotes}
                        onChange={(e) => {
                          setAdditionalNotes(e.target.value);
                          if (fieldErrors.additionalNotes) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.additionalNotes;
                              return next;
                            });
                          }
                        }}
                        placeholder={selectedDoc.additionalNotesPlaceholder}
                        aria-invalid={Boolean(fieldErrors.additionalNotes)}
                        className={`mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#25352B] placeholder:text-slate-400 shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
                          fieldErrors.additionalNotes
                            ? "border-red-500 focus:border-red-600 focus:ring-red-200"
                            : "border-slate-300 hover:border-slate-400 focus:border-[#174D32] focus:ring-[#246B45]/25"
                        }`}
                      />
                      {fieldErrors.additionalNotes && (
                        <p
                          role="alert"
                          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
                        >
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{fieldErrors.additionalNotes}</span>
                        </p>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/45 p-4 text-xs text-slate-700">
                      <p className="font-bold text-[#25352B]">
                        Review Your Request Before Submitting
                      </p>
                      <p className="mt-1">
                        Confirm the details below. Once submitted, a unique
                        reference number will be assigned and your request will
                        enter Pending review.
                      </p>
                    </div>

                    <dl className="space-y-3 rounded-xl border border-slate-200 bg-[#F5F5EF] p-4 text-xs">
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-slate-500">
                          Document Type
                        </dt>
                        <dd className="text-right font-semibold text-[#174D32]">
                          {selectedDoc.name}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-slate-500">Copies</dt>
                        <dd className="text-right font-semibold text-[#25352B]">
                          {copies}
                        </dd>
                      </div>
                      {profileAcademic.institute && (
                        <div className="flex justify-between gap-4 border-t border-slate-200 pt-2.5">
                          <dt className="font-semibold text-slate-500">
                            Institute
                          </dt>
                          <dd className="text-right font-medium text-[#25352B]">
                            {profileAcademic.institute}
                          </dd>
                        </div>
                      )}
                      {profileAcademic.program && (
                        <div className="flex justify-between gap-4">
                          <dt className="font-semibold text-slate-500">
                            Program
                          </dt>
                          <dd className="text-right font-medium text-[#25352B]">
                            {profileAcademic.program}
                          </dd>
                        </div>
                      )}
                      <div className="border-t border-slate-200 pt-2.5">
                        <dt className="font-semibold text-slate-500">Purpose</dt>
                        <dd className="mt-0.5 text-[#25352B]">
                          {purpose.trim()}
                        </dd>
                      </div>
                      {additionalNotes.trim() && (
                        <div className="border-t border-slate-200 pt-2.5">
                          <dt className="font-semibold text-slate-500">
                            Additional Details
                          </dt>
                          <dd className="mt-0.5 text-[#25352B]">
                            {additionalNotes.trim()}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>

              {/* Fixed Modal Footer */}
              <div className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-slate-100 bg-[#F5F5EF]/60 px-6 py-4 sm:flex-row sm:justify-end">
                {modalStep === "form" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCloseRequestModal}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#25352B] transition-colors hover:bg-[#F5F5EF]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="requester-submission-form"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174D32] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
                    >
                      <span>Review &amp; Confirm</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setModalStep("form")}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#25352B] transition-colors hover:bg-[#F5F5EF] disabled:opacity-60"
                    >
                      Edit Details
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleFinalConfirm()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174D32] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span>
                        {isSubmitting
                          ? "Submitting Request..."
                          : "Confirm & Submit Request"}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Missing Academic Profile Reminder Modal */}
        {profileReminderOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="academic-profile-incomplete-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/55 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2
                    id="academic-profile-incomplete-title"
                    className="text-base font-bold text-[#25352B]"
                  >
                    Academic Profile Incomplete
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileReminderOpen(false)}
                  aria-label="Close reminder"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="px-6 py-5 text-sm leading-relaxed text-slate-600">
                <p>
                  Your <strong className="font-semibold text-[#25352B]">Institute</strong>{" "}
                  and <strong className="font-semibold text-[#25352B]">Program</strong>{" "}
                  are required for this document request (
                  <span className="font-semibold text-[#174D32]">
                    {selectedDoc.name}
                  </span>
                  ). Please update your academic information in your profile
                  before continuing.
                </p>
                <p className="mt-2.5 text-xs text-slate-500">
                  Once saved in your profile, your Institute and Program will be
                  reused automatically across all applicable document requests.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 bg-[#F5F5EF]/60 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setProfileReminderOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#25352B] transition-colors hover:bg-[#F5F5EF]"
                >
                  Cancel
                </button>
                <Link
                  href={`/dashboard/requester/profile?returnTo=${encodeURIComponent(`/dashboard/requester/request?doc=${selectedDoc.code}`)}#academic-profile`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174D32] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
                >
                  <span>Update My Profile</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Stage 1: Document Catalog
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            Document Catalog
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            Request an Academic Document
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Browse available Registrar&apos;s Office document categories, review
            their requirements and preparation reminders, and submit your
            request.
          </p>
        </div>

        {/* Search/Filter */}
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            aria-label="Search document catalog"
            className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-9 text-sm text-[#25352B] placeholder:text-slate-400 shadow-2xs focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
          />
        </div>
      </div>

      {filteredCatalog.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-[#25352B]">
            No matching documents found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try clearing your search or select &quot;Other Registrar&apos;s
            Office Documents&quot;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-4 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredCatalog.map((doc) => (
            <article
              key={doc.code}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-[#246B45]/50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
                  <DocumentTypeIcon code={doc.code} />
                </span>
                <span className="rounded-full border border-[#246B45]/20 bg-[#F5F5EF] px-2.5 py-0.5 text-[11px] font-semibold text-[#174D32]">
                  {doc.category}
                </span>
              </div>

              <h2 className="mt-4 text-lg font-bold text-[#25352B]">
                {doc.name}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {doc.shortDescription}
              </p>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => handleSelectDocument(doc)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#174D32] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
                >
                  <span>View Requirements &amp; Request</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/55 p-4 text-xs leading-relaxed text-slate-700"
      >
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
          aria-hidden="true"
        />
        <p>
          <strong className="font-semibold text-[#25352B]">
            Official Registrar Policy Reminder:
          </strong>{" "}
          Document offerings, fees, clearance requirements, and processing
          schedules remain subject to official confirmation by the DNSC
          Registrar&apos;s Office. All submitted requests are reviewed by
          Registrar Staff.
        </p>
      </div>
    </div>
  );
}
