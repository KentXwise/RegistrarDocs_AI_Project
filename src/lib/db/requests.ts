import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { DocumentTypeCode } from "@/lib/requester/document-catalog";
import type {
  DocumentRequestStatus,
  RequesterDocumentRequestSummary,
  RequesterRequestCounts,
} from "@/types/requester";

export interface DocumentRequestRow {
  id: string;
  reference_number: string;
  requester_id: string;
  document_type_code: DocumentTypeCode;
  document_type_name: string;
  purpose: string;
  copies: number;
  additional_notes: string | null;
  status: DocumentRequestStatus;
  idempotency_key: string | null;
  submitted_at: string;
  updated_at: string;
  requester_remarks?: string | null;
  is_resubmitted?: boolean | null;
  collection_instructions?: string | null;
  ready_for_release_at?: string | null;
  released_at?: string | null;
  requester_institute?: string | null;
  requester_program?: string | null;
}

export interface RequesterDocumentRequestDetail
  extends RequesterDocumentRequestSummary {
  documentTypeCode: DocumentTypeCode;
  purpose: string;
  copies: number;
  additionalNotes: string | null;
  requesterRemarks: string | null;
  isResubmitted: boolean;
  collectionInstructions: string | null;
  readyForReleaseAt: string | null;
  releasedAt: string | null;
  requesterInstitute: string | null;
  requesterProgram: string | null;
  updatedAt: string;
}

function toRequestDetail(
  row: DocumentRequestRow
): RequesterDocumentRequestDetail {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    documentTypeCode: row.document_type_code,
    documentType: row.document_type_name,
    purpose: row.purpose,
    copies: row.copies,
    additionalNotes: row.additional_notes,
    requesterRemarks: row.requester_remarks ?? null,
    isResubmitted: Boolean(row.is_resubmitted),
    collectionInstructions: row.collection_instructions ?? null,
    readyForReleaseAt: row.ready_for_release_at ?? null,
    releasedAt: row.released_at ?? null,
    requesterInstitute: row.requester_institute ?? null,
    requesterProgram: row.requester_program ?? null,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    status: row.status,
  };
}

function isMissingTableError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the table") ||
    lower.includes("does not exist") ||
    lower.includes("schema cache")
  );
}

export function computeRequestCounts(
  rows: readonly { status: DocumentRequestStatus }[]
): RequesterRequestCounts {
  let pending = 0;
  let processing = 0;
  let readyForRelease = 0;

  for (const row of rows) {
    if (row.status === "pending") pending += 1;
    else if (row.status === "processing") processing += 1;
    else if (row.status === "ready_for_release") readyForRelease += 1;
  }

  return {
    total: rows.length,
    pending,
    processing,
    readyForRelease,
  };
}

export async function listRequesterDocumentRequests(
  requesterId: string,
  limit?: number
): Promise<{
  requests: RequesterDocumentRequestDetail[];
  counts: RequesterRequestCounts;
  schemaReady: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_requests")
    .select("*")
    .eq("requester_id", requesterId)
    .order("submitted_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.message)) {
      return {
        requests: [],
        counts: { total: 0, pending: 0, processing: 0, readyForRelease: 0 },
        schemaReady: false,
      };
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as DocumentRequestRow[];
  const counts = computeRequestCounts(rows);
  const sliced = typeof limit === "number" ? rows.slice(0, limit) : rows;

  return {
    requests: sliced.map(toRequestDetail),
    counts,
    schemaReady: true,
  };
}

export async function findRequestByIdempotencyKey(
  requesterId: string,
  idempotencyKey: string
): Promise<RequesterDocumentRequestDetail | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_requests")
    .select("*")
    .eq("requester_id", requesterId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error || !data) return null;
  return toRequestDetail(data as DocumentRequestRow);
}

async function generateReferenceNumber(): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("generate_request_reference_number");
  if (!error && typeof data === "string" && data.trim().length > 0) {
    return data.trim();
  }
  // Fallback collision-safe institutional reference format if RPC is unavailable
  const year = new Date().getFullYear();
  const token = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RD-${year}-${token}`;
}

export interface CreateDocumentRequestInput {
  requesterId: string;
  documentTypeCode: DocumentTypeCode;
  documentTypeName: string;
  purpose: string;
  copies: number;
  additionalNotes: string | null;
  idempotencyKey: string | null;
  requesterInstitute?: string | null;
  requesterProgram?: string | null;
}

export async function createDocumentRequest(
  input: CreateDocumentRequestInput
): Promise<{
  request: RequesterDocumentRequestDetail;
  wasDuplicate: boolean;
}> {
  if (input.idempotencyKey) {
    const existing = await findRequestByIdempotencyKey(
      input.requesterId,
      input.idempotencyKey
    );
    if (existing) {
      return { request: existing, wasDuplicate: true };
    }
  }

  const referenceNumber = await generateReferenceNumber();
  const admin = createSupabaseAdminClient();

  const basePayload = {
    reference_number: referenceNumber,
    requester_id: input.requesterId,
    document_type_code: input.documentTypeCode,
    document_type_name: input.documentTypeName,
    purpose: input.purpose.trim(),
    copies: input.copies,
    additional_notes: input.additionalNotes?.trim() || null,
    status: "pending",
    idempotency_key: input.idempotencyKey,
  };

  let { data, error } = await admin
    .from("document_requests")
    .insert({
      ...basePayload,
      requester_institute: input.requesterInstitute ?? null,
      requester_program: input.requesterProgram ?? null,
    })
    .select("*")
    .single();

  // Graceful fallback if migration 0009 snapshot columns are not yet applied
  if (
    error &&
    (error.message.toLowerCase().includes("requester_institute") ||
      error.message.toLowerCase().includes("requester_program"))
  ) {
    const retry = await admin
      .from("document_requests")
      .insert(basePayload)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    // Handle concurrent idempotency race cleanly
    if (
      input.idempotencyKey &&
      error?.message?.toLowerCase().includes("idempotency_key")
    ) {
      const existing = await findRequestByIdempotencyKey(
        input.requesterId,
        input.idempotencyKey
      );
      if (existing) {
        return { request: existing, wasDuplicate: true };
      }
    }
    throw new Error(error?.message || "Failed to save document request.");
  }

  return {
    request: toRequestDetail(data as DocumentRequestRow),
    wasDuplicate: false,
  };
}

export async function getRequesterDocumentRequestById(
  requesterId: string,
  requestId: string
): Promise<RequesterDocumentRequestDetail | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_requests")
    .select("*")
    .eq("id", requestId)
    .eq("requester_id", requesterId)
    .maybeSingle();

  if (error || !data) return null;
  return toRequestDetail(data as DocumentRequestRow);
}

export interface ResubmitCorrectionInput {
  requesterId: string;
  requesterName?: string;
  requestId: string;
  purpose: string;
  copies: number;
  additionalNotes: string | null;
}

/**
 * Safely updates an existing requester-owned request ONLY when its current
 * server-side status is `needs_correction`. Preserves the original request ID
 * and reference_number, marks `is_resubmitted = true`, transitions status back
 * to `pending` for Registrar Staff re-review, and appends a history event.
 */
export async function resubmitCorrectedDocumentRequest(
  input: ResubmitCorrectionInput
): Promise<
  | { ok: true; request: RequesterDocumentRequestDetail }
  | { ok: false; reason: "not_found" | "not_editable" }
> {
  const existing = await getRequesterDocumentRequestById(
    input.requesterId,
    input.requestId
  );

  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  if (existing.status !== "needs_correction") {
    return { ok: false, reason: "not_editable" };
  }

  const admin = createSupabaseAdminClient();
  let { data, error } = await admin
    .from("document_requests")
    .update({
      purpose: input.purpose.trim(),
      copies: input.copies,
      additional_notes: input.additionalNotes?.trim() || null,
      status: "pending",
      is_resubmitted: true,
    })
    .eq("id", input.requestId)
    .eq("requester_id", input.requesterId)
    .eq("status", "needs_correction")
    .select("*")
    .maybeSingle();

  // Graceful fallback if migration 0003 (is_resubmitted) has not yet been applied
  if (error && isMissingTableError(error.message)) {
    const fallback = await admin
      .from("document_requests")
      .update({
        purpose: input.purpose.trim(),
        copies: input.copies,
        additional_notes: input.additionalNotes?.trim() || null,
        status: "pending",
      })
      .eq("id", input.requestId)
      .eq("requester_id", input.requesterId)
      .eq("status", "needs_correction")
      .select("*")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    return { ok: false, reason: "not_editable" };
  }

  // Record real requester resubmission event in request_status_history if table exists
  const historyInsert = await admin.from("request_status_history").insert({
    request_id: input.requestId,
    from_status: "needs_correction",
    to_status: "pending",
    actor_id: input.requesterId,
    actor_role: "requester",
    actor_name: input.requesterName?.trim() || "Requester",
    action_type: "requester_resubmitted",
    stage: "needs_correction",
    requester_remarks: "Corrected request details resubmitted for review.",
    internal_notes: null,
  });

  if (historyInsert.error && isMissingTableError(historyInsert.error.message)) {
    await admin.from("request_status_history").insert({
      request_id: input.requestId,
      from_status: "needs_correction",
      to_status: "pending",
      actor_id: input.requesterId,
      actor_role: "requester",
      actor_name: input.requesterName?.trim() || "Requester",
      requester_remarks: "Corrected request details resubmitted for review.",
      internal_notes: null,
    });
  }

  return {
    ok: true,
    request: toRequestDetail(data as DocumentRequestRow),
  };
}
