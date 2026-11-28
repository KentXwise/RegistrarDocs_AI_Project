"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  PackageCheck,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type {
  StaffHistoryEvent,
  StaffRequestRecord,
} from "@/lib/db/staff-requests";

interface StaffStageProgressRecordsProps {
  request: StaffRequestRecord;
  history: StaffHistoryEvent[];
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

function AttributionBlock({
  label,
  name,
  accountRef,
  timestamp,
}: {
  label: string;
  name: string;
  accountRef: string | null;
  timestamp: string;
}) {
  return (
    <div className="mt-3 rounded-lg border border-[#246B45]/20 bg-white px-3 py-2 text-[11px] text-slate-600">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1 font-semibold text-[#174D32]">
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}:</span>
          <span className="text-[#25352B]">{name}</span>
        </span>
        {accountRef && (
          <span>
            <strong className="font-semibold text-slate-500">
              Staff Account:
            </strong>{" "}
            {accountRef}
          </span>
        )}
        <span>
          <strong className="font-semibold text-slate-500">Date &amp; Time:</strong>{" "}
          {formatDateTime(timestamp)}
        </span>
      </div>
    </div>
  );
}

const STAGE_STEPS = [
  { key: "pending", label: "1. Submitted / Pending" },
  { key: "processing", label: "2. Under Processing" },
  { key: "ready_for_release", label: "3. Ready for Release" },
  { key: "released", label: "4. Released" },
] as const;

function getStageIndex(status: StaffRequestRecord["status"]): number {
  switch (status) {
    case "pending":
    case "needs_correction":
      return 0;
    case "processing":
      return 1;
    case "ready_for_release":
      return 2;
    case "released":
      return 3;
    default:
      return -1;
  }
}

export function StaffStageProgressRecords({
  request,
  history,
}: StaffStageProgressRecordsProps) {
  const currentStageIdx = getStageIndex(request.status);

  // Latest Stage 1 (Submitted / Pending -> Under Processing) verification record
  const initialVerificationEvents = history.filter(
    (h) =>
      h.actionType === "start_processing" ||
      (h.fromStatus === "pending" && h.toStatus === "processing")
  );
  const latestInitialVerification =
    initialVerificationEvents[initialVerificationEvents.length - 1] ?? null;

  // Prior correction / resubmission events (preserved across re-reviews)
  const correctionCycleEvents = history.filter(
    (h) =>
      h.actionType === "request_correction" ||
      h.actionType === "requester_resubmitted" ||
      h.toStatus === "needs_correction" ||
      (h.fromStatus === "needs_correction" && h.toStatus === "pending")
  );

  // Stage 2: Under Processing progress & preparation entries
  const processingEntries = history.filter(
    (h) =>
      h.actionType === "processing_progress" ||
      h.actionType === "attach_prepared_document" ||
      (h.fromStatus === "processing" && h.toStatus === "processing")
  );

  // Stage 3: Ready for Release verification record
  const readyEvents = history.filter(
    (h) =>
      h.actionType === "mark_ready_for_release" ||
      h.toStatus === "ready_for_release"
  );
  const latestReadyEvent = readyEvents[readyEvents.length - 1] ?? null;

  // Stage 4: Official Release record
  const releaseEvents = history.filter(
    (h) => h.actionType === "record_release" || h.toStatus === "released"
  );
  const latestReleaseEvent = releaseEvents[releaseEvents.length - 1] ?? null;

  return (
    <div className="space-y-3">
      {/* Unified 4-Stage Progress Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Continuous Stage Progression
        </p>
        <ol className="mt-2.5 grid gap-2 sm:grid-cols-4">
          {STAGE_STEPS.map((step, index) => {
            const isCompleted =
              currentStageIdx > index ||
              (request.status === "released" && index === 3);
            const isCurrent =
              currentStageIdx === index &&
              request.status !== "released" &&
              request.status !== "rejected";

            return (
              <li
                key={step.key}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${
                  isCompleted
                    ? "border-[#246B45]/30 bg-[#E6EFE8]/80 text-[#174D32]"
                    : isCurrent
                      ? "border-[#174D32] bg-[#174D32] text-white"
                      : "border-slate-200 bg-[#F5F5EF]/60 text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#174D32]" />
                ) : (
                  <span
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? "bg-white text-[#174D32]"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <span className="truncate">{step.label.replace(/^\d+\.\s*/, "")}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Preserved Correction & Re-review History (if any occurred) */}
      {correctionCycleEvents.length > 0 && (
        <details
          open={request.status === "pending" || request.status === "needs_correction"}
          className="group rounded-xl border border-orange-200 bg-orange-50/50"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-bold text-orange-950">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-700" />
              <span>
                Preserved Correction &amp; Re-Review History (
                {correctionCycleEvents.length})
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-orange-700 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-orange-200/80 px-4 py-3">
            {correctionCycleEvents.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-orange-200/80 bg-white p-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#25352B]">
                    {ev.actorRole === "requester"
                      ? "Requester Resubmitted Corrected Details"
                      : `Returned for Correction (${ev.fromStatus ?? "review"} → needs_correction)`}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {formatDateTime(ev.createdAt)}
                  </span>
                </div>
                {ev.requesterRemarks && (
                  <p className="mt-1 text-slate-700">{ev.requesterRemarks}</p>
                )}
                {ev.verificationRemarks && (
                  <p className="mt-1 text-slate-600">
                    <strong className="font-semibold">Staff Findings:</strong>{" "}
                    {ev.verificationRemarks}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-500">
                  By: {ev.actorName} ({ev.actorRole})
                  {ev.actorAccountRef ? ` · ${ev.actorAccountRef}` : ""}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* RETAINED STAGE 1 RECORD: Submitted / Pending Verification (Read-Only) */}
      {request.status !== "pending" && latestInitialVerification && (
        <details
          open={
            request.status === "processing" ||
            request.status === "ready_for_release"
          }
          className="group rounded-xl border border-[#246B45]/25 bg-[#F5F5EF]/75"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-bold text-[#25352B]">
            <span className="flex flex-wrap items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[#174D32]" />
              <span>Previous Stage — Submitted / Pending Verification</span>
              <span className="rounded-full bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-bold text-[#174D32] uppercase">
                Immutable Record
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>

          <div className="border-t border-slate-200 px-4 py-3.5 text-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">
              Progression: {latestInitialVerification.fromStatus ?? "pending"} →{" "}
              {latestInitialVerification.toStatus}
            </p>

            {latestInitialVerification.checklistResults &&
              latestInitialVerification.checklistResults.length > 0 && (
                <div className="mt-2.5">
                  <p className="font-semibold text-[#25352B]">
                    Verified Checklist Items
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {latestInitialVerification.checklistResults.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-2 text-slate-700"
                      >
                        <CheckCircle2
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            item.checked ? "text-[#174D32]" : "text-slate-300"
                          }`}
                        />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {latestInitialVerification.verificationRemarks && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">
                  Staff Verification Remarks (Stage 1)
                </p>
                <p className="mt-1 whitespace-pre-line leading-relaxed text-[#25352B]">
                  {latestInitialVerification.verificationRemarks}
                </p>
              </div>
            )}

            <AttributionBlock
              label="Verified / Progressed by"
              name={latestInitialVerification.actorName}
              accountRef={latestInitialVerification.actorAccountRef}
              timestamp={latestInitialVerification.createdAt}
            />
          </div>
        </details>
      )}

      {/* RETAINED STAGE 2 RECORD: Under Processing Progress & Preparation (Read-Only when past Processing) */}
      {(request.status === "ready_for_release" ||
        request.status === "released") && (
        <details
          open={request.status === "ready_for_release"}
          className="group rounded-xl border border-[#246B45]/25 bg-[#F5F5EF]/75"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-bold text-[#25352B]">
            <span className="flex flex-wrap items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-[#174D32]" />
              <span>
                Stage 2 — Under Processing Progress &amp; Preparation (
                {processingEntries.length}{" "}
                {processingEntries.length === 1 ? "entry" : "entries"})
              </span>
              <span className="rounded-full bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-bold text-[#174D32] uppercase">
                Read-Only
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>

          <div className="space-y-2.5 border-t border-slate-200 px-4 py-3.5 text-xs">
            {processingEntries.length === 0 ? (
              <p className="text-slate-600">
                No separate processing progress entries were recorded during
                Under Processing.
              </p>
            ) : (
              processingEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <p className="font-semibold text-[#25352B]">
                    {entry.actionType === "attach_prepared_document"
                      ? "Prepared Document Attached"
                      : "Processing Progress Entry"}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-slate-700">
                    {entry.verificationRemarks ||
                      entry.internalNotes ||
                      "Progress recorded."}
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Recorded by <strong>{entry.actorName}</strong>
                    {entry.actorAccountRef ? ` (${entry.actorAccountRef})` : ""}{" "}
                    &middot; {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              ))
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">
                  Prepared Document Attachment Status
                </p>
                <p className="mt-0.5 font-semibold text-[#25352B]">
                  {request.hasPreparedDocument
                    ? request.preparedDocumentName || "Prepared Document Attached"
                    : "No private attachment uploaded"}
                </p>
              </div>
              {request.hasPreparedDocument && (
                <a
                  href={`/api/staff/requests/${encodeURIComponent(request.id)}/attachment`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[#174D32]/30 bg-[#E6EFE8]/60 px-2.5 py-1 text-xs font-semibold text-[#174D32] hover:bg-[#E6EFE8]"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Preview (Staff Only)</span>
                </a>
              )}
            </div>
          </div>
        </details>
      )}

      {/* RETAINED STAGE 3 RECORD: Ready for Release Verification (Read-Only when Ready or Released) */}
      {(request.status === "ready_for_release" ||
        request.status === "released") &&
        latestReadyEvent && (
          <details
            open={request.status === "ready_for_release"}
            className="group rounded-xl border border-[#246B45]/25 bg-[#F5F5EF]/75"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-bold text-[#25352B]">
              <span className="flex flex-wrap items-center gap-2">
                <PackageCheck className="h-4 w-4 text-[#174D32]" />
                <span>Stage 3 — Ready for Release Verification Record</span>
                <span className="rounded-full bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-bold text-[#174D32] uppercase">
                  Immutable Record
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
            </summary>

            <div className="border-t border-slate-200 px-4 py-3.5 text-xs">
              {latestReadyEvent.checklistResults &&
                latestReadyEvent.checklistResults.length > 0 && (
                  <ul className="space-y-1.5">
                    {latestReadyEvent.checklistResults.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-2 text-slate-700"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#174D32]" />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                )}

              {request.collectionInstructions && (
                <div className="mt-3 rounded-lg border border-[#246B45]/20 bg-white p-2.5">
                  <p className="text-[11px] font-semibold text-[#174D32] uppercase">
                    Collection Instructions (Requester-Visible)
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[#25352B]">
                    {request.collectionInstructions}
                  </p>
                </div>
              )}

              {latestReadyEvent.verificationRemarks && (
                <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Readiness Verification Remarks
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[#25352B]">
                    {latestReadyEvent.verificationRemarks}
                  </p>
                </div>
              )}

              <AttributionBlock
                label="Confirmed Ready by"
                name={latestReadyEvent.actorName}
                accountRef={latestReadyEvent.actorAccountRef}
                timestamp={latestReadyEvent.createdAt}
              />
            </div>
          </details>
        )}

      {/* RETAINED STAGE 4 RECORD: Official Release Record (Read-Only when Released) */}
      {request.status === "released" && (
        <div className="rounded-xl border border-[#246B45]/30 bg-[#E6EFE8]/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#174D32] uppercase">
              <ShieldCheck className="h-4 w-4" />
              <span>Stage 4 — Official Release Record</span>
            </h3>
            <span className="rounded-full bg-[#174D32] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
              Finalized
            </span>
          </div>

          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-500">
                Released Date &amp; Time
              </dt>
              <dd className="mt-0.5 font-semibold text-[#25352B]">
                {request.releasedAt
                  ? formatDateTime(request.releasedAt)
                  : "Recorded"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">
                Identity &amp; Handover Verification
              </dt>
              <dd className="mt-0.5 font-semibold text-[#174D32]">
                {request.identityVerified
                  ? `Verified & Handed Over${request.identityVerifiedAt ? ` (${formatDateTime(request.identityVerifiedAt)})` : ""}`
                  : "Recorded"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Collected By</dt>
              <dd className="mt-0.5 font-medium text-[#25352B]">
                {request.collectorName || request.requesterName}{" "}
                <span className="text-slate-500">
                  (
                  {request.collectorType === "authorized_representative"
                    ? "Authorized Representative"
                    : "Requester"}
                  )
                </span>
              </dd>
            </div>
            {request.releaseRemarks && (
              <div>
                <dt className="font-semibold text-slate-500">Release Remarks</dt>
                <dd className="mt-0.5 text-[#25352B]">
                  {request.releaseRemarks}
                </dd>
              </div>
            )}
          </dl>

          {latestReleaseEvent && (
            <AttributionBlock
              label="Released by"
              name={latestReleaseEvent.actorName}
              accountRef={latestReleaseEvent.actorAccountRef}
              timestamp={latestReleaseEvent.createdAt}
            />
          )}
        </div>
      )}
    </div>
  );
}
