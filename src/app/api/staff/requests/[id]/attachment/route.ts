import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  attachPreparedDocumentToRequest,
  getStaffPreparedDocumentMeta,
} from "@/lib/db/staff-requests";
import {
  deletePrivatePreparedDocument,
  downloadPrivatePreparedDocument,
  validateAndUploadPreparedDocument,
} from "@/lib/storage/prepared-document-storage";
import type { AuthErrorCode } from "@/types/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Staff-only download/preview of a privately stored prepared document.
 * Requesters receive 403; no public Storage URLs are ever exposed.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["staff"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Document request not found." },
      { status: 404 }
    );
  }

  const meta = await getStaffPreparedDocumentMeta(id);
  if (!meta || !meta.path) {
    return NextResponse.json(
      { error: "No prepared document is attached to this request." },
      { status: 404 }
    );
  }

  const buffer = await downloadPrivatePreparedDocument(meta.path);
  if (!buffer) {
    return NextResponse.json(
      { error: "Unable to retrieve the private prepared document." },
      { status: 404 }
    );
  }

  const safeName = (meta.name || "prepared-document").replace(/"/g, "");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": meta.mime || "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Staff-only upload of a prepared final document (PDF/JPG/PNG, max 10 MB)
 * for requests currently in `processing` status. Does NOT automatically mark
 * the request Ready for Release.
 */
export async function POST(
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

  const existingMeta = await getStaffPreparedDocumentMeta(id);
  if (!existingMeta) {
    return NextResponse.json(
      {
        error: "Document request not found.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 404 }
    );
  }

  if (existingMeta.status !== "processing") {
    return NextResponse.json(
      {
        error:
          "Prepared documents can only be uploaded while a request is Under Processing.",
        code: "FORBIDDEN" satisfies AuthErrorCode,
      },
      { status: 409 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid upload payload.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const entry = formData.get("file");
  const file = entry instanceof File ? entry : null;
  if (!file) {
    return NextResponse.json(
      {
        error: "Please choose a PDF, JPG, or PNG file to upload.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const uploaded = await validateAndUploadPreparedDocument(id, file);
  if (!uploaded.ok) {
    return NextResponse.json(
      {
        error: uploaded.error,
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const saved = await attachPreparedDocumentToRequest({
    requestId: id,
    staffUser: auth.user,
    path: uploaded.path,
    displayName: uploaded.displayName,
    mime: uploaded.mime,
    size: uploaded.size,
  });

  if (!saved.ok) {
    await deletePrivatePreparedDocument(uploaded.path);
    return NextResponse.json(
      {
        error: saved.error,
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: saved.status }
    );
  }

  // Clean up previous attachment object if replaced
  if (existingMeta.path && existingMeta.path !== uploaded.path) {
    await deletePrivatePreparedDocument(existingMeta.path);
  }

  return NextResponse.json(
    {
      request: saved.request,
      history: saved.history,
    },
    { status: 200 }
  );
}
