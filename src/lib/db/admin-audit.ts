import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SafeUser } from "@/types/auth";

export interface AdminAuditLogRecord {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  actorAccountRef: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  description: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

export interface RecordAdminAuditInput {
  actor: SafeUser;
  action: string;
  entityType:
    | "user"
    | "student_registration"
    | "staff_account"
    | "document_type"
    | "requirement"
    | "faq"
    | "ai_knowledge_source"
    | "calendar_event";
  entityId?: string | null;
  entityLabel?: string | null;
  description: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

function isMissingTable(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("schema cache")
  );
}

/**
 * Appends an immutable administrative audit record to public.admin_audit_logs.
 * Actor identity is strictly derived from the authenticated Admin SafeUser.
 */
export async function recordAdminAuditLog(
  input: RecordAdminAuditInput
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("admin_audit_logs").insert({
      actor_id: input.actor.id,
      actor_name: input.actor.fullName,
      actor_role: input.actor.role,
      actor_account_ref: input.actor.employeeId?.trim() || input.actor.email,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      description: input.description,
      previous_value: input.previousValue ?? null,
      new_value: input.newValue ?? null,
    });
  } catch {
    // Non-blocking safeguard if migration 0005 has not yet been applied
  }
}

export async function listAdminAuditLogs(options?: {
  limit?: number;
  entityType?: string;
  action?: string;
  search?: string;
}): Promise<{
  ok: true;
  logs: AdminAuditLogRecord[];
  schemaReady: boolean;
}> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 150);

  if (options?.entityType && options.entityType !== "all") {
    query = query.eq("entity_type", options.entityType);
  }
  if (options?.action && options.action !== "all") {
    query = query.eq("action", options.action);
  }

  const { data, error } = await query;
  const adminTableReady = !(error && isMissingTable(error.message));

  type RawAuditRow = {
    id: string;
    actor_id: string | null;
    actor_name: string;
    actor_role: string;
    actor_account_ref: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    entity_label: string | null;
    description: string;
    previous_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    created_at: string;
  };

  let logs: AdminAuditLogRecord[] =
    !error && data
      ? ((data ?? []) as RawAuditRow[]).map((row) => ({
          id: row.id,
          actorId: row.actor_id,
          actorName: row.actor_name,
          actorRole: row.actor_role,
          actorAccountRef: row.actor_account_ref,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          entityLabel: row.entity_label,
          description: row.description,
          previousValue: row.previous_value,
          newValue: row.new_value,
          createdAt: row.created_at,
        }))
      : [];

  // Also include real Staff/Requester request workflow events from request_status_history
  // when viewing "all" or "document_request" so Admin has unified oversight without duplicate tables.
  if (
    !options?.entityType ||
    options.entityType === "all" ||
    options.entityType === "document_request"
  ) {
    const { data: wfData, error: wfError } = await admin
      .from("request_status_history")
      .select(
        "id, request_id, from_status, to_status, actor_id, actor_role, actor_name, actor_account_ref, action_type, requester_remarks, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (!wfError && wfData) {
      type RawWf = {
        id: string;
        request_id: string;
        from_status: string | null;
        to_status: string;
        actor_id: string | null;
        actor_role: string;
        actor_name: string;
        actor_account_ref?: string | null;
        action_type?: string | null;
        requester_remarks: string | null;
        created_at: string;
      };
      const wfLogs: AdminAuditLogRecord[] = (wfData as RawWf[]).map((w) => ({
        id: `wf-${w.id}`,
        actorId: w.actor_id,
        actorName: w.actor_name,
        actorRole: w.actor_role,
        actorAccountRef: w.actor_account_ref ?? null,
        action: w.action_type || `status_${w.to_status}`,
        entityType: "document_request",
        entityId: w.request_id,
        entityLabel: `Request ${w.request_id.slice(0, 8)}`,
        description: w.from_status
          ? `Workflow transition: ${w.from_status} → ${w.to_status}${w.requester_remarks ? ` (${w.requester_remarks})` : ""}`
          : `Workflow status set to ${w.to_status}`,
        previousValue: w.from_status ? { status: w.from_status } : null,
        newValue: { status: w.to_status },
        createdAt: w.created_at,
      }));
      logs = [...logs, ...wfLogs].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
    }
  }

  const q = options?.search?.trim().toLowerCase();
  if (q) {
    logs = logs.filter(
      (log) =>
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        (log.entityLabel?.toLowerCase().includes(q) ?? false) ||
        log.description.toLowerCase().includes(q)
    );
  }

  return {
    ok: true,
    logs: logs.slice(0, options?.limit ?? 150),
    schemaReady: adminTableReady,
  };
}
