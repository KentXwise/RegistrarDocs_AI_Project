import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  createNotification,
  listNotificationsForRequest,
} from "@/lib/db/notifications";
import {
  getRequesterDocumentRequestById,
  resubmitCorrectedDocumentRequest,
} from "@/lib/db/requests";
import { getDocumentCatalogItem } from "@/lib/requester/document-catalog";
import type { AuthErrorCode } from "@/types/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["requester"]);
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
    const docRequest = await getRequesterDocumentRequestById(auth.user.id, id);
    if (!docRequest) {
      return NextResponse.json(
        {
          error: "Document request not found.",
          code: "FORBIDDEN" satisfies AuthErrorCode,
        },
        { status: 404 }
      );
    }

    const notifications = await listNotificationsForRequest(
      auth.user.id,
      docRequest.id
    );
    const catalogItem = getDocumentCatalogItem(docRequest.documentTypeCode);

    return NextResponse.json(
      {
        request: docRequest,
        category: catalogItem?.category ?? "Registrar Document",
        notifications,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Unable to load request details right now.",
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
  const auth = await requireApiAuth(["requester"]);
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
    purpose?: unknown;
    copies?: unknown;
    additionalNotes?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid correction payload.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const existing = await getRequesterDocumentRequestById(auth.user.id, id);
  if (!existing) {
    return NextResponse.json(
      {
        error: "Document request not found.",
        code: "FORBIDDEN" satisfies AuthErrorCode,
      },
      { status: 404 }
    );
  }

  if (existing.status !== "needs_correction") {
    return NextResponse.json(
      {
        error:
          "Only requests marked as Needs Correction can be edited and resubmitted.",
        code: "FORBIDDEN" satisfies AuthErrorCode,
      },
      { status: 403 }
    );
  }

  const catalogItem = getDocumentCatalogItem(existing.documentTypeCode);
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
  const copiesRaw =
    typeof body.copies === "number" ? body.copies : Number(body.copies);
  const additionalNotes =
    typeof body.additionalNotes === "string"
      ? body.additionalNotes.trim()
      : "";

  const fieldErrors: Record<string, string> = {};
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

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        error: "Please correct the highlighted fields before resubmitting.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
        fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const result = await resubmitCorrectedDocumentRequest({
      requesterId: auth.user.id,
      requesterName: auth.user.fullName,
      requestId: id,
      purpose,
      copies: copiesRaw,
      additionalNotes: additionalNotes || null,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === "not_found"
              ? "Document request not found."
              : "This request can no longer be edited.",
          code: "FORBIDDEN" satisfies AuthErrorCode,
        },
        { status: result.reason === "not_found" ? 404 : 409 }
      );
    }

    await createNotification({
      recipientId: auth.user.id,
      requestId: result.request.id,
      requestReference: result.request.referenceNumber,
      category: "status_update",
      title: "Corrected Request Resubmitted",
      message: `Your corrected details for ${result.request.documentType} (${result.request.referenceNumber}) have been resubmitted for Registrar Staff review.`,
    });

    const notifications = await listNotificationsForRequest(
      auth.user.id,
      result.request.id
    );

    return NextResponse.json(
      {
        request: result.request,
        category: catalogItem?.category ?? "Registrar Document",
        notifications,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Unable to resubmit your corrections right now.",
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }
}
