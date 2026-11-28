import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  getStaffDocumentRequestById,
  performStaffReviewAction,
  type StaffReviewAction,
} from "@/lib/db/staff-requests";
import { getDocumentCatalogItem } from "@/lib/requester/document-catalog";
import type {
  PersistedChecklistResult,
  ReadyConfirmations,
} from "@/lib/staff/verification-checklist";
import type { AuthErrorCode } from "@/types/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_ACTIONS: readonly StaffReviewAction[] = [
  "start_processing",
  "add_processing_progress",
  "request_correction",
  "reject_request",
  "save_internal_note",
  "mark_ready_for_release",
  "record_release",
];

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["staff"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        error: "Document request not found.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 404 }
    );
  }

  try {
    const result = await getStaffDocumentRequestById(id);
    if (!result) {
      return NextResponse.json(
        {
          error: "Document request not found.",
          code: "VALIDATION_ERROR" satisfies AuthErrorCode,
        },
        { status: 404 }
      );
    }

    const catalogItem = getDocumentCatalogItem(result.request.documentTypeCode);

    return NextResponse.json(
      {
        request: result.request,
        category: catalogItem?.category ?? "Registrar Document",
        history: result.history,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Unable to load document request details right now.",
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["staff"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        error: "Document request not found.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 404 }
    );
  }

  let body: {
    action?: unknown;
    requesterRemarks?: unknown;
    internalNotes?: unknown;
    checklistResults?: unknown;
    verificationRemarks?: unknown;
    confirmInitialVerification?: unknown;
    processingRemarks?: unknown;
    collectionInstructions?: unknown;
    confirmReady?: unknown;
    readyConfirmations?: unknown;
    identityVerified?: unknown;
    handoverConfirmed?: unknown;
    collectorType?: unknown;
    collectorName?: unknown;
    releaseRemarks?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid staff review payload.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const action =
    typeof body.action === "string"
      ? (body.action.trim() as StaffReviewAction)
      : null;

  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json(
      {
        error: "Unsupported staff action.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const requesterRemarks =
    typeof body.requesterRemarks === "string"
      ? body.requesterRemarks.slice(0, 1000)
      : undefined;
  const internalNotes =
    typeof body.internalNotes === "string"
      ? body.internalNotes.slice(0, 1500)
      : undefined;
  const verificationRemarks =
    typeof body.verificationRemarks === "string"
      ? body.verificationRemarks.slice(0, 1500)
      : undefined;
  const processingRemarks =
    typeof body.processingRemarks === "string"
      ? body.processingRemarks.slice(0, 1500)
      : undefined;
  const confirmInitialVerification = body.confirmInitialVerification === true;

  let checklistResults: PersistedChecklistResult[] | undefined;
  if (Array.isArray(body.checklistResults)) {
    checklistResults = body.checklistResults
      .filter(
        (item): item is PersistedChecklistResult =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as PersistedChecklistResult).id === "string" &&
          typeof (item as PersistedChecklistResult).label === "string" &&
          typeof (item as PersistedChecklistResult).checked === "boolean"
      )
      .slice(0, 30)
      .map((item) => ({
        id: item.id.slice(0, 100),
        label: item.label.slice(0, 300),
        checked: item.checked,
      }));
  }

  let readyConfirmations: Partial<ReadyConfirmations> | undefined;
  if (body.readyConfirmations && typeof body.readyConfirmations === "object") {
    const raw = body.readyConfirmations as Record<string, unknown>;
    readyConfirmations = {
      correctRequest: raw.correctRequest === true,
      preparationCompleted: raw.preparationCompleted === true,
      preparedAndVerified: raw.preparedAndVerified === true,
      priorRecordsReviewed: raw.priorRecordsReviewed === true,
    };
  }

  const collectionInstructions =
    typeof body.collectionInstructions === "string"
      ? body.collectionInstructions.slice(0, 1200)
      : undefined;
  const confirmReady = body.confirmReady === true;
  const identityVerified = body.identityVerified === true;
  const handoverConfirmed = body.handoverConfirmed === true;
  const collectorType =
    body.collectorType === "requester" ||
    body.collectorType === "authorized_representative"
      ? body.collectorType
      : undefined;
  const collectorName =
    typeof body.collectorName === "string"
      ? body.collectorName.slice(0, 200)
      : undefined;
  const releaseRemarks =
    typeof body.releaseRemarks === "string"
      ? body.releaseRemarks.slice(0, 1000)
      : undefined;

  const result = await performStaffReviewAction({
    requestId: id,
    action,
    staffUser: auth.user,
    requesterRemarks,
    internalNotes,
    checklistResults,
    verificationRemarks,
    confirmInitialVerification,
    processingRemarks,
    collectionInstructions,
    confirmReady,
    readyConfirmations,
    identityVerified,
    handoverConfirmed,
    collectorType,
    collectorName,
    releaseRemarks,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: (result.status === 400
          ? "VALIDATION_ERROR"
          : result.status === 409
            ? "FORBIDDEN"
            : "SERVER_ERROR") satisfies AuthErrorCode,
      },
      { status: result.status }
    );
  }

  const catalogItem = getDocumentCatalogItem(result.request.documentTypeCode);

  return NextResponse.json(
    {
      request: result.request,
      category: catalogItem?.category ?? "Registrar Document",
      history: result.history,
    },
    { status: 200 }
  );
}
