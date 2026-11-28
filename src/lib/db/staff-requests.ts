import { createNotification } from "@/lib/db/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { DocumentTypeCode } from "@/lib/requester/document-catalog";
import {
  buildInitialVerificationChecklist,
  READY_CONFIRMATION_ITEMS,
  type PersistedChecklistResult,
  type ReadyConfirmations,
} from "@/lib/staff/verification-checklist";
import type { SafeUser } from "@/types/auth";
import type { DocumentRequestStatus } from "@/types/requester";

export type CollectorType = "requester" | "authorized_representative";

export interface StaffRequestRecord {
  id: string;
  referenceNumber: string;
  documentTypeCode: DocumentTypeCode;
  documentType: string;
  purpose: string;
  copies: number;
  additionalNotes: string | null;
  status: DocumentRequestStatus;
  submittedAt: string;
  updatedAt: string;
  requesterId: string;
  requesterName: string;
  requesterStudentId: string | null;
  requesterEmail: string;
  requesterInstitute: string | null;
  requesterProgram: string | null;
  assignedStaffId: string | null;
  requesterRemarks: string | null;
  internalStaffNotes: string | null;
  isResubmitted: boolean;
  processingStartedAt: string | null;
  // Milestone 10: Document Preparation, Ready for Release & Release Management
  hasPreparedDocument: boolean;
  preparedDocumentName: string | null;
  preparedDocumentMime: string | null;
  preparedDocumentSize: number | null;
  preparedAt: string | null;
  collectionInstructions: string | null;
  readyForReleaseAt: string | null;
  identityVerified: boolean;
  identityVerifiedAt: string | null;
  collectorType: CollectorType | null;
  collectorName: string | null;
  releaseRemarks: string | null;
  releasedAt: string | null;
}

export interface StaffRequestCounts {
  total: number;
  pending: number;
  processing: number;
  needsCorrection: number;
  readyForRelease: number;
  released: number;
}

export interface StaffHistoryEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorRole: string;
  actorName: string;
  actorAccountRef: string | null;
  actionType: string | null;
  stage: string | null;
  checklistResults: PersistedChecklistResult[] | null;
  verificationRemarks: string | null;
  confirmations: Record<string, unknown> | null;
  requesterRemarks: string | null;
  internalNotes: string | null;
  createdAt: string;
}

function getStaffAccountRef(staffUser: SafeUser): string {
  return staffUser.employeeId?.trim() || staffUser.email;
}

interface RawStaffRequestRow {
  id: string;
  reference_number: string;
  requester_id: string;
  document_type_code: DocumentTypeCode;
  document_type_name: string;
  purpose: string;
  copies: number;
  additional_notes: string | null;
  status: DocumentRequestStatus;
  submitted_at: string;
  updated_at: string;
  assigned_staff_id?: string | null;
  requester_remarks?: string | null;
  internal_staff_notes?: string | null;
  is_resubmitted?: boolean | null;
  processing_started_at?: string | null;
  prepared_document_path?: string | null;
  prepared_document_name?: string | null;
  prepared_document_mime?: string | null;
  prepared_document_size?: number | null;
  prepared_at?: string | null;
  collection_instructions?: string | null;
  ready_for_release_at?: string | null;
  identity_verified?: boolean | null;
  identity_verified_at?: string | null;
  collector_type?: CollectorType | null;
  collector_name?: string | null;
  release_remarks?: string | null;
  released_at?: string | null;
  requester_institute?: string | null;
  requester_program?: string | null;
  profiles:
    | {
        full_name: string;
        student_id: string | null;
        email: string;
        institute?: string | null;
        program?: string | null;
      }
    | {
        full_name: string;
        student_id: string | null;
        email: string;
        institute?: string | null;
        program?: string | null;
      }[]
    | null;
}

function mapStaffRow(row: RawStaffRequestRow): StaffRequestRecord {
  const profile = Array.isArray(row.profiles)
    ? (row.profiles[0] ?? null)
    : row.profiles;

  return {
    id: row.id,
    referenceNumber: row.reference_number,
    requesterId: row.requester_id,
    documentTypeCode: row.document_type_code,
    documentType: row.document_type_name,
    purpose: row.purpose,
    copies: row.copies,
    additionalNotes: row.additional_notes,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    requesterName: profile?.full_name ?? "Unknown Requester",
    requesterStudentId: profile?.student_id ?? null,
    requesterEmail: profile?.email ?? "",
    requesterInstitute: row.requester_institute ?? profile?.institute ?? null,
    requesterProgram: row.requester_program ?? profile?.program ?? null,
    assignedStaffId: row.assigned_staff_id ?? null,
    requesterRemarks: row.requester_remarks ?? null,
    internalStaffNotes: row.internal_staff_notes ?? null,
    isResubmitted: Boolean(row.is_resubmitted),
    processingStartedAt: row.processing_started_at ?? null,
    hasPreparedDocument: Boolean(row.prepared_document_path),
    preparedDocumentName: row.prepared_document_name ?? null,
    preparedDocumentMime: row.prepared_document_mime ?? null,
    preparedDocumentSize: row.prepared_document_size ?? null,
    preparedAt: row.prepared_at ?? null,
    collectionInstructions: row.collection_instructions ?? null,
    readyForReleaseAt: row.ready_for_release_at ?? null,
    identityVerified: Boolean(row.identity_verified),
    identityVerifiedAt: row.identity_verified_at ?? null,
    collectorType: row.collector_type ?? null,
    collectorName: row.collector_name ?? null,
    releaseRemarks: row.release_remarks ?? null,
    releasedAt: row.released_at ?? null,
  };
}

export function computeStaffCounts(
  rows: readonly { status: DocumentRequestStatus }[]
): StaffRequestCounts {
  const counts: StaffRequestCounts = {
    total: rows.length,
    pending: 0,
    processing: 0,
    needsCorrection: 0,
    readyForRelease: 0,
    released: 0,
  };

  for (const row of rows) {
    switch (row.status) {
      case "pending":
        counts.pending += 1;
        break;
      case "processing":
        counts.processing += 1;
        break;
      case "needs_correction":
        counts.needsCorrection += 1;
        break;
      case "ready_for_release":
        counts.readyForRelease += 1;
        break;
      case "released":
        counts.released += 1;
        break;
      default:
        break;
    }
  }

  return counts;
}

const FULL_STAFF_SELECT = `
  id,
  reference_number,
  requester_id,
  document_type_code,
  document_type_name,
  purpose,
  copies,
  additional_notes,
  status,
  submitted_at,
  updated_at,
  assigned_staff_id,
  requester_remarks,
  internal_staff_notes,
  is_resubmitted,
  processing_started_at,
  prepared_document_path,
  prepared_document_name,
  prepared_document_mime,
  prepared_document_size,
  prepared_at,
  collection_instructions,
  ready_for_release_at,
  identity_verified,
  identity_verified_at,
  collector_type,
  collector_name,
  release_remarks,
  released_at,
  requester_institute,
  requester_program,
  profiles:requester_id (
    full_name,
    student_id,
    email,
    institute,
    program
  )
`;

const BASE_STAFF_SELECT = `
  id,
  reference_number,
  requester_id,
  document_type_code,
  document_type_name,
  purpose,
  copies,
  additional_notes,
  status,
  submitted_at,
  updated_at,
  profiles:requester_id (
    full_name,
    student_id,
    email
  )
`;

function isMissingColumnOrTable(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("schema cache")
  );
}

export async function listStaffDocumentRequests(options?: {
  status?: DocumentRequestStatus;
}): Promise<
  | {
      ok: true;
      requests: StaffRequestRecord[];
      counts: StaffRequestCounts;
    }
  | {
      ok: false;
      error: string;
    }
> {
  try {
    const admin = createSupabaseAdminClient();
    let query = admin
      .from("document_requests")
      .select(FULL_STAFF_SELECT)
      .order("submitted_at", { ascending: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    let { data, error } = await query;

    if (error && isMissingColumnOrTable(error.message)) {
      let fallbackQuery = admin
        .from("document_requests")
        .select(BASE_STAFF_SELECT)
        .order("submitted_at", { ascending: false });
      if (options?.status) {
        fallbackQuery = fallbackQuery.eq("status", options.status);
      }
      const fallback = await fallbackQuery;
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (error) {
      return {
        ok: false,
        error: "Unable to retrieve document request records from the database.",
      };
    }

    const rows = (data ?? []) as unknown as RawStaffRequestRow[];
    const mapped = rows.map(mapStaffRow);
    return {
      ok: true,
      requests: mapped,
      counts: computeStaffCounts(mapped),
    };
  } catch {
    return {
      ok: false,
      error: "Unable to connect to the database to retrieve request statistics.",
    };
  }
}

export async function getStaffDocumentRequestById(requestId: string): Promise<{
  request: StaffRequestRecord;
  history: StaffHistoryEvent[];
} | null> {
  const admin = createSupabaseAdminClient();
  let { data, error } = await admin
    .from("document_requests")
    .select(FULL_STAFF_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (error && isMissingColumnOrTable(error.message)) {
    const fallback = await admin
      .from("document_requests")
      .select(BASE_STAFF_SELECT)
      .eq("id", requestId)
      .maybeSingle();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error || !data) return null;

  const request = mapStaffRow(data as unknown as RawStaffRequestRow);

  const FULL_HISTORY_SELECT =
    "id, from_status, to_status, actor_role, actor_name, actor_account_ref, action_type, stage, checklist_results, verification_remarks, confirmations, requester_remarks, internal_notes, created_at";
  const BASE_HISTORY_SELECT =
    "id, from_status, to_status, actor_role, actor_name, requester_remarks, internal_notes, created_at";

  let { data: historyData, error: historyError } = await admin
    .from("request_status_history")
    .select(FULL_HISTORY_SELECT)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (historyError && isMissingColumnOrTable(historyError.message)) {
    const fallback = await admin
      .from("request_status_history")
      .select(BASE_HISTORY_SELECT)
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    historyData = fallback.data as typeof historyData;
    historyError = fallback.error;
  }

  const history: StaffHistoryEvent[] =
    !historyError && historyData
      ? (
          historyData as {
            id: string;
            from_status: string | null;
            to_status: string;
            actor_role: string;
            actor_name: string;
            actor_account_ref?: string | null;
            action_type?: string | null;
            stage?: string | null;
            checklist_results?: PersistedChecklistResult[] | null;
            verification_remarks?: string | null;
            confirmations?: Record<string, unknown> | null;
            requester_remarks: string | null;
            internal_notes: string | null;
            created_at: string;
          }[]
        ).map((h) => ({
          id: h.id,
          fromStatus: h.from_status,
          toStatus: h.to_status,
          actorRole: h.actor_role,
          actorName: h.actor_name,
          actorAccountRef: h.actor_account_ref ?? null,
          actionType: h.action_type ?? null,
          stage: h.stage ?? null,
          checklistResults: Array.isArray(h.checklist_results)
            ? h.checklist_results
            : null,
          verificationRemarks: h.verification_remarks ?? null,
          confirmations:
            h.confirmations && typeof h.confirmations === "object"
              ? h.confirmations
              : null,
          requesterRemarks: h.requester_remarks,
          internalNotes: h.internal_notes,
          createdAt: h.created_at,
        }))
      : [];

  return { request, history };
}

export async function getStaffPreparedDocumentMeta(requestId: string): Promise<{
  status: DocumentRequestStatus;
  path: string | null;
  name: string | null;
  mime: string | null;
} | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_requests")
    .select(
      "status, prepared_document_path, prepared_document_name, prepared_document_mime"
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    if (isMissingColumnOrTable(error.message)) {
      const fallback = await admin
        .from("document_requests")
        .select("status")
        .eq("id", requestId)
        .maybeSingle();
      if (fallback.error || !fallback.data) return null;
      return {
        status: (fallback.data as { status: DocumentRequestStatus }).status,
        path: null,
        name: null,
        mime: null,
      };
    }
    return null;
  }

  if (!data) return null;
  const row = data as {
    status: DocumentRequestStatus;
    prepared_document_path: string | null;
    prepared_document_name: string | null;
    prepared_document_mime: string | null;
  };
  return {
    status: row.status,
    path: row.prepared_document_path,
    name: row.prepared_document_name,
    mime: row.prepared_document_mime,
  };
}

export async function attachPreparedDocumentToRequest(input: {
  requestId: string;
  staffUser: SafeUser;
  path: string;
  displayName: string;
  mime: string;
  size: number;
}): Promise<StaffReviewActionResult> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: updatedRow, error } = await admin
    .from("document_requests")
    .update({
      prepared_document_path: input.path,
      prepared_document_name: input.displayName,
      prepared_document_mime: input.mime,
      prepared_document_size: input.size,
      prepared_at: now,
      prepared_by_staff_id: input.staffUser.id,
      assigned_staff_id: input.staffUser.id,
    })
    .eq("id", input.requestId)
    .eq("status", "processing")
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingColumnOrTable(error.message)) {
      return {
        ok: false,
        status: 503,
        error:
          "Document preparation schema is not applied yet. Please run migration 0004_preparation_and_release.sql in Supabase.",
      };
    }
    return {
      ok: false,
      status: 500,
      error: "Unable to attach the prepared document right now.",
    };
  }

  if (!updatedRow) {
    return {
      ok: false,
      status: 409,
      error:
        "Prepared documents can only be attached while the request is Under Processing.",
    };
  }

  // Record internal preparation attachment event without changing request status
  await admin.from("request_status_history").insert({
    request_id: input.requestId,
    from_status: "processing",
    to_status: "processing",
    actor_id: input.staffUser.id,
    actor_role: "staff",
    actor_name: input.staffUser.fullName,
    actor_account_ref: getStaffAccountRef(input.staffUser),
    action_type: "attach_prepared_document",
    stage: "processing",
    verification_remarks: `Prepared document attached privately: ${input.displayName}`,
    requester_remarks: null,
    internal_notes: `Prepared document attached: ${input.displayName}`,
  });

  const refreshed = await getStaffDocumentRequestById(input.requestId);
  if (!refreshed) {
    return { ok: false, status: 500, error: "Unable to reload request." };
  }

  return { ok: true, request: refreshed.request, history: refreshed.history };
}

export type StaffReviewAction =
  | "start_processing"
  | "add_processing_progress"
  | "request_correction"
  | "reject_request"
  | "save_internal_note"
  | "mark_ready_for_release"
  | "record_release";

export interface StaffReviewActionInput {
  requestId: string;
  action: StaffReviewAction;
  staffUser: SafeUser;
  requesterRemarks?: string;
  internalNotes?: string;
  checklistResults?: PersistedChecklistResult[];
  verificationRemarks?: string;
  confirmInitialVerification?: boolean;
  processingRemarks?: string;
  collectionInstructions?: string;
  confirmReady?: boolean;
  readyConfirmations?: Partial<ReadyConfirmations>;
  identityVerified?: boolean;
  handoverConfirmed?: boolean;
  collectorType?: CollectorType;
  collectorName?: string;
  releaseRemarks?: string;
}

export type StaffReviewActionResult =
  | {
      ok: true;
      request: StaffRequestRecord;
      history: StaffHistoryEvent[];
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

/**
 * Executes a backend-validated Staff review, preparation, progress, or release
 * action with optimistic concurrency checking, immutable stage verification
 * records, strict authenticated Staff attribution, separation of requester
 * remarks vs internal notes, and requester notification creation.
 */
export async function performStaffReviewAction(
  input: StaffReviewActionInput
): Promise<StaffReviewActionResult> {
  const existing = await getStaffDocumentRequestById(input.requestId);
  if (!existing) {
    return { ok: false, status: 404, error: "Document request not found." };
  }

  const current = existing.request;
  const requesterRemarks = input.requesterRemarks?.trim() || "";
  const internalNotes = input.internalNotes?.trim() || "";
  const verificationRemarks = input.verificationRemarks?.trim() || "";
  const processingRemarks = input.processingRemarks?.trim() || "";
  const collectionInstructions = input.collectionInstructions?.trim() || "";
  const collectorName = input.collectorName?.trim() || "";
  const releaseRemarks = input.releaseRemarks?.trim() || "";
  const actorAccountRef = getStaffAccountRef(input.staffUser);

  const admin = createSupabaseAdminClient();

  if (input.action === "save_internal_note") {
    if (
      ![
        "pending",
        "processing",
        "needs_correction",
        "ready_for_release",
      ].includes(current.status)
    ) {
      return {
        ok: false,
        status: 409,
        error: "Internal notes cannot be modified on finalized requests.",
      };
    }

    const { error } = await admin
      .from("document_requests")
      .update({
        internal_staff_notes: internalNotes || null,
        assigned_staff_id: input.staffUser.id,
      })
      .eq("id", current.id);

    if (error) {
      if (isMissingColumnOrTable(error.message)) {
        return {
          ok: false,
          status: 503,
          error:
            "Staff workflow schema is not applied yet. Please run migration 0004_preparation_and_release.sql in Supabase.",
        };
      }
      return {
        ok: false,
        status: 500,
        error: "Unable to save internal staff notes right now.",
      };
    }

    const refreshed = await getStaffDocumentRequestById(current.id);
    if (!refreshed) {
      return { ok: false, status: 500, error: "Unable to reload request." };
    }
    return { ok: true, request: refreshed.request, history: refreshed.history };
  }

  // Stage 2: Append an immutable Under Processing progress entry without changing status
  if (input.action === "add_processing_progress") {
    if (current.status !== "processing") {
      return {
        ok: false,
        status: 409,
        error:
          "Processing progress entries can only be recorded while a request is Under Processing.",
      };
    }
    if (!processingRemarks) {
      return {
        ok: false,
        status: 400,
        error:
          "Please enter processing remarks or preparation findings before saving a progress entry.",
      };
    }

    const { error: insertError } = await admin
      .from("request_status_history")
      .insert({
        request_id: current.id,
        from_status: "processing",
        to_status: "processing",
        actor_id: input.staffUser.id,
        actor_role: "staff",
        actor_name: input.staffUser.fullName,
        actor_account_ref: actorAccountRef,
        action_type: "processing_progress",
        stage: "processing",
        verification_remarks: processingRemarks,
        requester_remarks: null,
        internal_notes: null,
      });

    if (insertError) {
      if (isMissingColumnOrTable(insertError.message)) {
        return {
          ok: false,
          status: 503,
          error:
            "Continuous verification schema is not applied yet. Please run the latest 0004_preparation_and_release.sql in Supabase.",
        };
      }
      return {
        ok: false,
        status: 500,
        error: "Unable to record processing progress right now.",
      };
    }

    await admin
      .from("document_requests")
      .update({ assigned_staff_id: input.staffUser.id })
      .eq("id", current.id)
      .eq("status", "processing");

    const refreshed = await getStaffDocumentRequestById(current.id);
    if (!refreshed) {
      return { ok: false, status: 500, error: "Unable to reload request." };
    }
    return { ok: true, request: refreshed.request, history: refreshed.history };
  }

  let nextStatus: DocumentRequestStatus;
  let notifCategory:
    | "processing_update"
    | "missing_requirements"
    | "ready_for_release"
    | "status_update";
  let notifTitle: string;
  let notifMessage: string;
  let historyActionType: string;
  let historyStage: string;
  let historyChecklist: PersistedChecklistResult[] | null = null;
  let historyVerificationRemarks: string | null = verificationRemarks || null;
  let historyConfirmations: Record<string, unknown> | null = null;
  let historyRequesterRemarks: string | null = requesterRemarks || null;
  let historyInternalNotes: string | null = internalNotes || null;

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    assigned_staff_id: input.staffUser.id,
    is_resubmitted: false,
  };

  if (input.action === "start_processing") {
    if (current.status !== "pending") {
      return {
        ok: false,
        status: 409,
        error: `Cannot start processing a request that is currently "${current.status}". Only Pending requests can begin processing.`,
      };
    }

    // Validate all required Stage 1 checklist items on the server
    const expectedChecklist = buildInitialVerificationChecklist(
      current.documentTypeCode,
      current.copies
    );
    const submittedMap = new Map(
      (input.checklistResults ?? []).map((item) => [item.id, item.checked])
    );
    const missingItems = expectedChecklist.filter(
      (item) => item.required && submittedMap.get(item.id) !== true
    );
    if (missingItems.length > 0) {
      return {
        ok: false,
        status: 400,
        error: `Complete all required verification checklist items before starting processing (${missingItems.length} remaining, e.g., "${missingItems[0].label}").`,
      };
    }

    if (!verificationRemarks) {
      return {
        ok: false,
        status: 400,
        error:
          "Staff verification remarks are required before progressing a request to Under Processing.",
      };
    }

    if (!input.confirmInitialVerification) {
      return {
        ok: false,
        status: 400,
        error:
          "Please explicitly confirm that you have reviewed the request and verified its requirements before starting processing.",
      };
    }

    nextStatus = "processing";
    historyActionType = "start_processing";
    historyStage = "pending";
    historyChecklist = expectedChecklist.map((item) => ({
      id: item.id,
      label: item.label,
      checked: true,
    }));
    historyVerificationRemarks = verificationRemarks;
    historyConfirmations = {
      reviewedAndVerified: true,
      verifiedAt: now,
    };

    notifCategory = "processing_update";
    notifTitle = "Document Request Under Processing";
    notifMessage = requesterRemarks
      ? `Your request for ${current.documentType} (${current.referenceNumber}) is now being processed by Registrar Staff. Note: ${requesterRemarks}`
      : `Your request for ${current.documentType} (${current.referenceNumber}) is now under processing by DNSC Registrar Staff.`;
    updatePayload.processing_started_at = now;
    updatePayload.requester_remarks = requesterRemarks || null;
  } else if (input.action === "request_correction") {
    if (!["pending", "processing"].includes(current.status)) {
      return {
        ok: false,
        status: 409,
        error:
          "Corrections can only be requested while a request is Pending or Under Processing.",
      };
    }
    if (!requesterRemarks) {
      return {
        ok: false,
        status: 400,
        error:
          "Please provide clear correction instructions for the requester.",
      };
    }
    nextStatus = "needs_correction";
    historyActionType = "request_correction";
    historyStage = current.status;
    historyVerificationRemarks = verificationRemarks || null;
    notifCategory = "missing_requirements";
    notifTitle = "Correction Required for Your Document Request";
    notifMessage = `Registrar Staff returned ${current.documentType} (${current.referenceNumber}) for correction: ${requesterRemarks}`;
    updatePayload.requester_remarks = requesterRemarks;
  } else if (input.action === "reject_request") {
    if (!["pending", "processing"].includes(current.status)) {
      return {
        ok: false,
        status: 409,
        error:
          "Only Pending or Under Processing requests can be rejected during review.",
      };
    }
    if (!requesterRemarks) {
      return {
        ok: false,
        status: 400,
        error: "Please provide an explicit reason before rejecting a request.",
      };
    }
    nextStatus = "rejected";
    historyActionType = "reject_request";
    historyStage = current.status;
    historyVerificationRemarks = verificationRemarks || null;
    notifCategory = "status_update";
    notifTitle = "Document Request Rejected";
    notifMessage = `Your request for ${current.documentType} (${current.referenceNumber}) was not approved. Reason: ${requesterRemarks}`;
    updatePayload.requester_remarks = requesterRemarks;
  } else if (input.action === "mark_ready_for_release") {
    if (current.status !== "processing") {
      return {
        ok: false,
        status: 409,
        error:
          "Only requests currently Under Processing can be marked Ready for Release.",
      };
    }

    const rc = input.readyConfirmations;
    const allConfirmed =
      Boolean(rc?.correctRequest) &&
      Boolean(rc?.preparationCompleted) &&
      Boolean(rc?.preparedAndVerified) &&
      Boolean(rc?.priorRecordsReviewed);

    if (!allConfirmed) {
      const missing = READY_CONFIRMATION_ITEMS.filter(
        (item) => !rc?.[item.key]
      );
      return {
        ok: false,
        status: 400,
        error: `Please complete all Ready for Release confirmations (${missing.length} remaining, e.g., "${missing[0]?.label ?? "Confirm preparation"}").`,
      };
    }

    nextStatus = "ready_for_release";
    historyActionType = "mark_ready_for_release";
    historyStage = "ready_for_release";
    historyChecklist = READY_CONFIRMATION_ITEMS.map((item) => ({
      id: item.key,
      label: item.label,
      checked: true,
    }));
    historyVerificationRemarks = verificationRemarks || null;
    historyConfirmations = {
      correctRequest: true,
      preparationCompleted: true,
      preparedAndVerified: true,
      priorRecordsReviewed: true,
      hasPreparedAttachment: current.hasPreparedDocument,
    };

    notifCategory = "ready_for_release";
    notifTitle = "Document Ready for Release";
    notifMessage = collectionInstructions
      ? `Your ${current.documentType} (${current.referenceNumber}) is now Ready for Release. Collection instructions: ${collectionInstructions}`
      : `Your ${current.documentType} (${current.referenceNumber}) is now Ready for Release at the DNSC Registrar's Office. Please present a valid ID upon claiming.`;
    updatePayload.collection_instructions = collectionInstructions || null;
    updatePayload.ready_for_release_at = now;
    updatePayload.ready_for_release_by = input.staffUser.id;
    historyRequesterRemarks =
      collectionInstructions || "Document marked Ready for Release.";
  } else if (input.action === "record_release") {
    if (current.status === "released") {
      return {
        ok: false,
        status: 409,
        error: "This request has already been officially released.",
      };
    }
    if (current.status !== "ready_for_release") {
      return {
        ok: false,
        status: 409,
        error:
          "A request must be Ready for Release before recording actual release.",
      };
    }
    if (!input.identityVerified) {
      return {
        ok: false,
        status: 400,
        error:
          "Identity verification must be confirmed before recording document release.",
      };
    }
    if (!input.handoverConfirmed) {
      return {
        ok: false,
        status: 400,
        error:
          "Physical handover confirmation is required before recording document release.",
      };
    }
    const collectorType: CollectorType | undefined = input.collectorType;
    if (
      collectorType !== "requester" &&
      collectorType !== "authorized_representative"
    ) {
      return {
        ok: false,
        status: 400,
        error:
          "Please specify whether the document is collected by the Requester or an Authorized Representative.",
      };
    }
    if (collectorType === "authorized_representative" && !collectorName) {
      return {
        ok: false,
        status: 400,
        error:
          "Please enter the full name of the authorized representative collecting the document.",
      };
    }

    const resolvedCollectorName =
      collectorType === "authorized_representative"
        ? collectorName
        : current.requesterName;

    nextStatus = "released";
    historyActionType = "record_release";
    historyStage = "released";
    historyVerificationRemarks = releaseRemarks || null;
    historyConfirmations = {
      identityVerified: true,
      handoverConfirmed: true,
      collectorType,
      collectorName: resolvedCollectorName,
    };

    notifCategory = "status_update";
    notifTitle = "Document Released";
    notifMessage = `Your ${current.documentType} (${current.referenceNumber}) has been verified and officially released by the DNSC Registrar's Office.`;

    updatePayload.identity_verified = true;
    updatePayload.identity_verified_at = now;
    updatePayload.identity_verified_by = input.staffUser.id;
    updatePayload.collector_type = collectorType;
    updatePayload.collector_name = resolvedCollectorName;
    updatePayload.release_remarks = releaseRemarks || null;
    updatePayload.released_at = now;
    updatePayload.released_by_staff_id = input.staffUser.id;

    historyRequesterRemarks =
      collectorType === "authorized_representative"
        ? `Released to authorized representative: ${resolvedCollectorName} (identity verified).`
        : `Released to requester: ${resolvedCollectorName} (identity verified).`;
    historyInternalNotes = releaseRemarks || internalNotes || null;
  } else {
    return { ok: false, status: 400, error: "Unsupported review action." };
  }

  updatePayload.status = nextStatus;

  if (typeof input.internalNotes === "string") {
    updatePayload.internal_staff_notes = internalNotes || null;
  }

  // Optimistic concurrency guard: match exact current status
  const { data: updatedRow, error: updateError } = await admin
    .from("document_requests")
    .update(updatePayload)
    .eq("id", current.id)
    .eq("status", current.status)
    .select("id")
    .maybeSingle();

  if (updateError) {
    if (isMissingColumnOrTable(updateError.message)) {
      return {
        ok: false,
        status: 503,
        error:
          "Staff workflow schema is not applied yet. Please run migration 0004_preparation_and_release.sql in Supabase.",
      };
    }
    return {
      ok: false,
      status: 500,
      error: "Unable to update request status right now.",
    };
  }

  if (!updatedRow) {
    return {
      ok: false,
      status: 409,
      error:
        "This request's status was already updated by another action. Please refresh and review the latest state.",
    };
  }

  // Record immutable chronological stage verification/progression event
  const { error: historyInsertError } = await admin
    .from("request_status_history")
    .insert({
      request_id: current.id,
      from_status: current.status,
      to_status: nextStatus,
      actor_id: input.staffUser.id,
      actor_role: "staff",
      actor_name: input.staffUser.fullName,
      actor_account_ref: actorAccountRef,
      action_type: historyActionType,
      stage: historyStage,
      checklist_results: historyChecklist,
      verification_remarks: historyVerificationRemarks,
      confirmations: historyConfirmations,
      requester_remarks: historyRequesterRemarks,
      internal_notes: historyInternalNotes,
    });

  if (historyInsertError) {
    // Fallback to base columns only if extra columns are not yet applied
    if (isMissingColumnOrTable(historyInsertError.message)) {
      await admin.from("request_status_history").insert({
        request_id: current.id,
        from_status: current.status,
        to_status: nextStatus,
        actor_id: input.staffUser.id,
        actor_role: "staff",
        actor_name: input.staffUser.fullName,
        requester_remarks: historyRequesterRemarks,
        internal_notes: historyInternalNotes,
      });
    }
  }

  // Notify requester (strictly using requester-facing message, NEVER internalNotes or verificationRemarks!)
  await createNotification({
    recipientId: current.requesterId,
    requestId: current.id,
    requestReference: current.referenceNumber,
    category: notifCategory,
    title: notifTitle,
    message: notifMessage,
  });

  const refreshed = await getStaffDocumentRequestById(current.id);
  if (!refreshed) {
    return { ok: false, status: 500, error: "Unable to reload request." };
  }

  return { ok: true, request: refreshed.request, history: refreshed.history };
}
