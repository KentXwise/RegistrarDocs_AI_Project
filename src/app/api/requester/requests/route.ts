import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { createNotification } from "@/lib/db/notifications";
import { listActiveCatalogForRequester } from "@/lib/db/admin-catalog";
import {
  hasCompleteAcademicProfile,
  requiresAcademicProfileForDocument,
} from "@/lib/dnsc/academic-programs";
import {
  createDocumentRequest,
  listRequesterDocumentRequests,
} from "@/lib/db/requests";
import type { AuthErrorCode } from "@/types/auth";

export async function GET() {
  const auth = await requireApiAuth(["requester"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await listRequesterDocumentRequests(auth.user.id);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to load your document requests right now.",
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(["requester"]);
  if (!auth.ok) return auth.response;

  let body: {
    documentTypeCode?: unknown;
    purpose?: unknown;
    copies?: unknown;
    additionalNotes?: unknown;
    idempotencyKey?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const documentTypeCode =
    typeof body.documentTypeCode === "string"
      ? body.documentTypeCode.trim()
      : "";
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
  const copiesRaw =
    typeof body.copies === "number" ? body.copies : Number(body.copies);
  const additionalNotes =
    typeof body.additionalNotes === "string"
      ? body.additionalNotes.trim()
      : "";
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim().slice(0, 100)
      : null;

  const activeCatalog = await listActiveCatalogForRequester();
  const catalogItem = activeCatalog.find((c) => c.code === documentTypeCode);
  const fieldErrors: Record<string, string> = {};

  if (!catalogItem) {
    fieldErrors.documentTypeCode =
      "Please select a currently available document type.";
  }

  if (!purpose) {
    fieldErrors.purpose = "Please enter the purpose of your document request.";
  } else if (purpose.length > 300) {
    fieldErrors.purpose = "Purpose must be 300 characters or fewer.";
  }

  if (!Number.isInteger(copiesRaw) || copiesRaw < 1 || copiesRaw > 10) {
    fieldErrors.copies = "Number of copies must be between 1 and 10.";
  }

  if (catalogItem?.requiresAdditionalNotes && !additionalNotes) {
    fieldErrors.additionalNotes =
      "Please specify the exact Registrar document or certification you are requesting.";
  } else if (additionalNotes.length > 1000) {
    fieldErrors.additionalNotes =
      "Additional details must be 1,000 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0 || !catalogItem) {
    return NextResponse.json(
      {
        error: "Please correct the highlighted fields before submitting.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
        fieldErrors,
      },
      { status: 400 }
    );
  }

  // Enforce verified Institute & Program from requester's profile for applicable document types
  if (
    requiresAcademicProfileForDocument(catalogItem.code) &&
    !hasCompleteAcademicProfile(auth.user)
  ) {
    return NextResponse.json(
      {
        error:
          "Your Institute and Program are required for this document request. Please update your academic information in your profile before continuing.",
        code: "ACADEMIC_PROFILE_INCOMPLETE" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  try {
    const { request: persisted, wasDuplicate } = await createDocumentRequest({
      requesterId: auth.user.id,
      documentTypeCode: catalogItem.code,
      documentTypeName: catalogItem.name,
      purpose,
      copies: copiesRaw,
      additionalNotes: additionalNotes || null,
      idempotencyKey,
      requesterInstitute: auth.user.institute,
      requesterProgram: auth.user.program,
    });

    // Only create an in-app notification on a newly persisted request (never on duplicates or failures)
    if (!wasDuplicate) {
      await createNotification({
        recipientId: auth.user.id,
        requestId: persisted.id,
        requestReference: persisted.referenceNumber,
        category: "status_update",
        title: "Document Request Submitted",
        message: `Your request for ${persisted.documentType} (${persisted.referenceNumber}) has been submitted and is now pending Registrar Staff review.`,
      });
    }

    return NextResponse.json(
      {
        request: persisted,
        wasDuplicate,
      },
      { status: wasDuplicate ? 200 : 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (
      message.includes("could not find the table") ||
      message.includes("does not exist") ||
      message.includes("schema cache")
    ) {
      return NextResponse.json(
        {
          error:
            "The document requests database table is not set up yet. Please apply migration 0002_document_requests_and_notifications.sql in Supabase.",
          code: "SERVER_ERROR" satisfies AuthErrorCode,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to submit your document request right now. Please try again shortly.",
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }
}
