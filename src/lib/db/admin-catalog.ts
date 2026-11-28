import { OFFICIAL_DNSC_KNOWLEDGE_SEED } from "@/lib/ai/dnsc-knowledge-seed";
import { recordAdminAuditLog } from "@/lib/db/admin-audit";
import { FAQ_ITEMS } from "@/lib/landing-data";
import {
  DOCUMENT_CATALOG,
  type DocumentCatalogItem,
} from "@/lib/requester/document-catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SafeUser } from "@/types/auth";

export interface AdminDocumentTypeRecord {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  instructions: string | null;
  processingInfo: string | null;
  requiresAdditionalNotes: boolean;
  additionalNotesLabel: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRequirementRecord {
  id: string;
  documentTypeId: string;
  documentTypeName?: string;
  title: string;
  description: string | null;
  isMandatory: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFaqRecord {
  id: string;
  question: string;
  answer: string;
  category: string;
  isPublished: boolean;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeSourceType =
  | "official_document"
  | "registrar_procedure"
  | "document_requirements"
  | "institutional_faq"
  | "official_webpage";

export interface AdminKnowledgeSourceRecord {
  id: string;
  title: string;
  category: string;
  sourceType: KnowledgeSourceType;
  sourceUrl: string | null;
  contentSummary: string;
  isEnabled: boolean;
  isVerified: boolean;
  lastVerifiedAt: string | null;
  documentTypeCode: string | null;
  checklistVerified: boolean;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
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

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

type RawDocType = {
  id: string;
  code: string;
  name: string;
  short_label: string;
  category: string;
  short_description: string;
  full_description: string;
  instructions: string | null;
  processing_info: string | null;
  requires_additional_notes: boolean;
  additional_notes_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapDocType(row: RawDocType): AdminDocumentTypeRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    shortLabel: row.short_label,
    category: row.category,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    instructions: row.instructions,
    processingInfo: row.processing_info,
    requiresAdditionalNotes: row.requires_additional_notes,
    additionalNotesLabel: row.additional_notes_label,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminDocumentTypes(): Promise<{
  documentTypes: AdminDocumentTypeRecord[];
  schemaReady: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_types")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    if (isMissingTable(error.message)) {
      return { documentTypes: [], schemaReady: false };
    }
    return { documentTypes: [], schemaReady: true };
  }

  return {
    documentTypes: ((data ?? []) as RawDocType[]).map(mapDocType),
    schemaReady: true,
  };
}

/**
 * Returns active document catalog items (with their configured active
 * requirements) for the Requester catalog & submission validation.
 * Falls back cleanly to static DOCUMENT_CATALOG if migration 0005 is not yet applied.
 */
export async function listActiveCatalogForRequester(): Promise<
  DocumentCatalogItem[]
> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: typesData, error: typesError } = await admin
      .from("document_types")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (typesError || !typesData || typesData.length === 0) {
      return [...DOCUMENT_CATALOG];
    }

    const { data: reqsData } = await admin
      .from("document_requirements")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    const reqsByDocId = new Map<string, RawRequirement[]>();
    for (const r of (reqsData ?? []) as RawRequirement[]) {
      const list = reqsByDocId.get(r.document_type_id) ?? [];
      list.push(r);
      reqsByDocId.set(r.document_type_id, list);
    }

    return (typesData as RawDocType[]).map((dt) => {
      const fallbackStatic = DOCUMENT_CATALOG.find((c) => c.code === dt.code);
      const dbReqs = reqsByDocId.get(dt.id) ?? [];
      const preparationReminders =
        dbReqs.length > 0
          ? dbReqs.map(
              (r) =>
                `${r.is_mandatory ? "[Required] " : "[Optional] "}${r.title}${r.description ? ` — ${r.description}` : ""}`
            )
          : (fallbackStatic?.preparationReminders ?? [
              dt.processing_info ||
                "Confirm official requirements and schedules with the DNSC Registrar's Office.",
            ]);

      const instructions = dt.instructions
        ? dt.instructions
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
        : (fallbackStatic?.instructions ?? [
            "Review all requirements before submitting your request.",
            "Present valid identification when claiming your document.",
          ]);

      return {
        code: dt.code,
        name: dt.name,
        shortLabel: dt.short_label,
        category: dt.category,
        shortDescription: dt.short_description,
        fullDescription: dt.full_description,
        preparationReminders,
        requiredRequesterInfo: fallbackStatic?.requiredRequesterInfo ?? [
          "Verified Full Name and Student ID Number (from your approved account)",
          "Purpose of request",
          "Number of copies requested",
        ],
        instructions,
        requiresAdditionalNotes: dt.requires_additional_notes,
        additionalNotesLabel:
          dt.additional_notes_label || "Additional Details (Optional)",
        additionalNotesPlaceholder:
          fallbackStatic?.additionalNotesPlaceholder ??
          "Add any relevant academic term, program, or remarks for Registrar Staff.",
      };
    });
  } catch {
    return [...DOCUMENT_CATALOG];
  }
}

export async function createAdminDocumentType(input: {
  code: string;
  name: string;
  shortLabel: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  instructions?: string;
  processingInfo?: string;
  requiresAdditionalNotes?: boolean;
  additionalNotesLabel?: string;
  isActive?: boolean;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; documentType: AdminDocumentTypeRecord }
  | { ok: false; status: number; error: string }
> {
  const code = input.code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
  if (!code || !input.name.trim() || !input.shortDescription.trim()) {
    return {
      ok: false,
      status: 400,
      error: "Code, document name, and short description are required.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_types")
    .insert({
      code,
      name: input.name.trim(),
      short_label: input.shortLabel.trim() || input.name.trim(),
      category: input.category.trim() || "Registrar Document",
      short_description: input.shortDescription.trim(),
      full_description:
        input.fullDescription.trim() || input.shortDescription.trim(),
      instructions: input.instructions?.trim() || null,
      processing_info: input.processingInfo?.trim() || null,
      requires_additional_notes: Boolean(input.requiresAdditionalNotes),
      additional_notes_label: input.additionalNotesLabel?.trim() || null,
      is_active: input.isActive !== false,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.message?.toLowerCase().includes("duplicate")) {
      return {
        ok: false,
        status: 409,
        error: `A document type with code "${code}" already exists.`,
      };
    }
    if (isMissingTable(error?.message)) {
      return {
        ok: false,
        status: 503,
        error:
          "Please run migration 0005_admin_management_and_audit.sql in Supabase first.",
      };
    }
    return { ok: false, status: 500, error: "Unable to create document type." };
  }

  const created = mapDocType(data as RawDocType);
  await recordAdminAuditLog({
    actor: input.adminUser,
    action: "document_type_created",
    entityType: "document_type",
    entityId: created.id,
    entityLabel: `${created.name} (${created.code})`,
    description: `Created document type "${created.name}".`,
    newValue: { code: created.code, name: created.name, isActive: created.isActive },
  });

  return { ok: true, documentType: created };
}

export async function updateAdminDocumentType(input: {
  id: string;
  name?: string;
  shortLabel?: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  instructions?: string;
  processingInfo?: string;
  requiresAdditionalNotes?: boolean;
  additionalNotesLabel?: string;
  isActive?: boolean;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; documentType: AdminDocumentTypeRecord }
  | { ok: false; status: number; error: string }
> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("document_types")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, status: 404, error: "Document type not found." };
  }
  const prev = mapDocType(existing as RawDocType);

  const payload: Record<string, unknown> = {};
  if (typeof input.name === "string" && input.name.trim())
    payload.name = input.name.trim();
  if (typeof input.shortLabel === "string" && input.shortLabel.trim())
    payload.short_label = input.shortLabel.trim();
  if (typeof input.category === "string" && input.category.trim())
    payload.category = input.category.trim();
  if (typeof input.shortDescription === "string" && input.shortDescription.trim())
    payload.short_description = input.shortDescription.trim();
  if (typeof input.fullDescription === "string" && input.fullDescription.trim())
    payload.full_description = input.fullDescription.trim();
  if (typeof input.instructions === "string")
    payload.instructions = input.instructions.trim() || null;
  if (typeof input.processingInfo === "string")
    payload.processing_info = input.processingInfo.trim() || null;
  if (typeof input.requiresAdditionalNotes === "boolean")
    payload.requires_additional_notes = input.requiresAdditionalNotes;
  if (typeof input.additionalNotesLabel === "string")
    payload.additional_notes_label = input.additionalNotesLabel.trim() || null;
  if (typeof input.isActive === "boolean") payload.is_active = input.isActive;

  const { data, error } = await admin
    .from("document_types")
    .update(payload)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, error: "Unable to update document type." };
  }

  const updated = mapDocType(data as RawDocType);
  const action =
    typeof input.isActive === "boolean" && input.isActive !== prev.isActive
      ? input.isActive
        ? "document_type_enabled"
        : "document_type_disabled"
      : "document_type_updated";

  await recordAdminAuditLog({
    actor: input.adminUser,
    action,
    entityType: "document_type",
    entityId: updated.id,
    entityLabel: `${updated.name} (${updated.code})`,
    description:
      action === "document_type_enabled"
        ? `Enabled document type "${updated.name}".`
        : action === "document_type_disabled"
          ? `Disabled document type "${updated.name}".`
          : `Updated document type "${updated.name}".`,
    previousValue: { name: prev.name, isActive: prev.isActive },
    newValue: { name: updated.name, isActive: updated.isActive },
  });

  return { ok: true, documentType: updated };
}

// ============================================================================
// DOCUMENT REQUIREMENTS
// ============================================================================

type RawRequirement = {
  id: string;
  document_type_id: string;
  title: string;
  description: string | null;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapRequirement(
  row: RawRequirement,
  docNameMap?: Map<string, string>
): AdminRequirementRecord {
  return {
    id: row.id,
    documentTypeId: row.document_type_id,
    documentTypeName: docNameMap?.get(row.document_type_id),
    title: row.title,
    description: row.description,
    isMandatory: row.is_mandatory,
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminRequirements(): Promise<{
  requirements: AdminRequirementRecord[];
  schemaReady: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const [{ data: reqData, error: reqErr }, { data: dtData }] =
    await Promise.all([
      admin
        .from("document_requirements")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true }),
      admin.from("document_types").select("id, name"),
    ]);

  if (reqErr) {
    return {
      requirements: [],
      schemaReady: !isMissingTable(reqErr.message),
    };
  }

  const docNameMap = new Map<string, string>(
    ((dtData ?? []) as { id: string; name: string }[]).map((d) => [
      d.id,
      d.name,
    ])
  );

  return {
    requirements: ((reqData ?? []) as RawRequirement[]).map((r) =>
      mapRequirement(r, docNameMap)
    ),
    schemaReady: true,
  };
}

export async function createAdminRequirement(input: {
  documentTypeId: string;
  title: string;
  description?: string;
  isMandatory?: boolean;
  displayOrder?: number;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; requirement: AdminRequirementRecord }
  | { ok: false; status: number; error: string }
> {
  if (!input.documentTypeId || !input.title.trim()) {
    return {
      ok: false,
      status: 400,
      error: "Document type and requirement title are required.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_requirements")
    .insert({
      document_type_id: input.documentTypeId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      is_mandatory: input.isMandatory !== false,
      display_order: Number.isFinite(input.displayOrder)
        ? Number(input.displayOrder)
        : 0,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      status: isMissingTable(error?.message) ? 503 : 500,
      error: isMissingTable(error?.message)
        ? "Please run migration 0005_admin_management_and_audit.sql in Supabase."
        : "Unable to create requirement.",
    };
  }

  const created = mapRequirement(data as RawRequirement);
  await recordAdminAuditLog({
    actor: input.adminUser,
    action: "requirement_created",
    entityType: "requirement",
    entityId: created.id,
    entityLabel: created.title,
    description: `Added requirement "${created.title}".`,
    newValue: {
      documentTypeId: created.documentTypeId,
      title: created.title,
      isMandatory: created.isMandatory,
    },
  });

  return { ok: true, requirement: created };
}

export async function updateAdminRequirement(input: {
  id: string;
  documentTypeId?: string;
  title?: string;
  description?: string;
  isMandatory?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; requirement: AdminRequirementRecord }
  | { ok: false; status: number; error: string }
> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("document_requirements")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, status: 404, error: "Requirement not found." };
  }
  const prev = mapRequirement(existing as RawRequirement);

  const payload: Record<string, unknown> = {};
  if (input.documentTypeId) payload.document_type_id = input.documentTypeId;
  if (typeof input.title === "string" && input.title.trim())
    payload.title = input.title.trim();
  if (typeof input.description === "string")
    payload.description = input.description.trim() || null;
  if (typeof input.isMandatory === "boolean")
    payload.is_mandatory = input.isMandatory;
  if (typeof input.displayOrder === "number" && Number.isFinite(input.displayOrder))
    payload.display_order = input.displayOrder;
  if (typeof input.isActive === "boolean") payload.is_active = input.isActive;

  const { data, error } = await admin
    .from("document_requirements")
    .update(payload)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, error: "Unable to update requirement." };
  }

  const updated = mapRequirement(data as RawRequirement);
  await recordAdminAuditLog({
    actor: input.adminUser,
    action:
      typeof input.isActive === "boolean" && input.isActive !== prev.isActive
        ? input.isActive
          ? "requirement_activated"
          : "requirement_deactivated"
        : "requirement_updated",
    entityType: "requirement",
    entityId: updated.id,
    entityLabel: updated.title,
    description: `Updated requirement "${updated.title}".`,
    previousValue: { title: prev.title, isActive: prev.isActive },
    newValue: { title: updated.title, isActive: updated.isActive },
  });

  return { ok: true, requirement: updated };
}

// ============================================================================
// FAQS
// ============================================================================

type RawFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_published: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

function mapFaq(row: RawFaq): AdminFaqRecord {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    isPublished: row.is_published,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminFaqs(): Promise<{
  faqs: AdminFaqRecord[];
  schemaReady: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("faqs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return { faqs: [], schemaReady: !isMissingTable(error.message) };
  }
  return { faqs: ((data ?? []) as RawFaq[]).map(mapFaq), schemaReady: true };
}

export async function listPublishedFaqsForRequester(): Promise<
  { id: string; question: string; answer: string; category: string }[]
> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("faqs")
      .select("id, question, answer, category")
      .eq("is_published", true)
      .order("category", { ascending: true });

    if (error || !data || data.length === 0) {
      return FAQ_ITEMS.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        category: "General",
      }));
    }
    return data as {
      id: string;
      question: string;
      answer: string;
      category: string;
    }[];
  } catch {
    return FAQ_ITEMS.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      category: "General",
    }));
  }
}

export async function createAdminFaq(input: {
  question: string;
  answer: string;
  category?: string;
  isPublished?: boolean;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; faq: AdminFaqRecord }
  | { ok: false; status: number; error: string }
> {
  if (!input.question.trim() || !input.answer.trim()) {
    return {
      ok: false,
      status: 400,
      error: "Question and answer are required.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("faqs")
    .insert({
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category?.trim() || "General",
      is_published: input.isPublished !== false,
      created_by: input.adminUser.id,
      created_by_name: input.adminUser.fullName,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      status: isMissingTable(error?.message) ? 503 : 500,
      error: isMissingTable(error?.message)
        ? "Please run migration 0005_admin_management_and_audit.sql in Supabase."
        : "Unable to create FAQ.",
    };
  }

  const created = mapFaq(data as RawFaq);
  await recordAdminAuditLog({
    actor: input.adminUser,
    action: "faq_created",
    entityType: "faq",
    entityId: created.id,
    entityLabel: created.question.slice(0, 80),
    description: `Created FAQ in "${created.category}" (${created.isPublished ? "Published" : "Draft"}).`,
    newValue: { question: created.question, isPublished: created.isPublished },
  });

  return { ok: true, faq: created };
}

export async function updateAdminFaq(input: {
  id: string;
  question?: string;
  answer?: string;
  category?: string;
  isPublished?: boolean;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; faq: AdminFaqRecord }
  | { ok: false; status: number; error: string }
> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("faqs")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, status: 404, error: "FAQ not found." };
  }
  const prev = mapFaq(existing as RawFaq);

  const payload: Record<string, unknown> = {};
  if (typeof input.question === "string" && input.question.trim())
    payload.question = input.question.trim();
  if (typeof input.answer === "string" && input.answer.trim())
    payload.answer = input.answer.trim();
  if (typeof input.category === "string" && input.category.trim())
    payload.category = input.category.trim();
  if (typeof input.isPublished === "boolean")
    payload.is_published = input.isPublished;

  const { data, error } = await admin
    .from("faqs")
    .update(payload)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, error: "Unable to update FAQ." };
  }

  const updated = mapFaq(data as RawFaq);
  await recordAdminAuditLog({
    actor: input.adminUser,
    action:
      typeof input.isPublished === "boolean" &&
      input.isPublished !== prev.isPublished
        ? input.isPublished
          ? "faq_published"
          : "faq_unpublished"
        : "faq_updated",
    entityType: "faq",
    entityId: updated.id,
    entityLabel: updated.question.slice(0, 80),
    description: `Updated FAQ "${updated.question.slice(0, 60)}".`,
    previousValue: { isPublished: prev.isPublished },
    newValue: { isPublished: updated.isPublished },
  });

  return { ok: true, faq: updated };
}

export async function deleteAdminFaq(
  id: string,
  adminUser: SafeUser
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("faqs")
    .select("id, question")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { ok: false, status: 404, error: "FAQ not found." };

  const { error } = await admin.from("faqs").delete().eq("id", id);
  if (error) return { ok: false, status: 500, error: "Unable to delete FAQ." };

  await recordAdminAuditLog({
    actor: adminUser,
    action: "faq_deleted",
    entityType: "faq",
    entityId: id,
    entityLabel: (existing as { question: string }).question.slice(0, 80),
    description: `Deleted FAQ "${(existing as { question: string }).question.slice(0, 60)}".`,
  });

  return { ok: true };
}

// ============================================================================
// APPROVED AI KNOWLEDGE SOURCES (Informational Grounding Foundation)
// ============================================================================

type RawKnowledgeSource = {
  id: string;
  title: string;
  category: string;
  source_type: KnowledgeSourceType;
  source_url: string | null;
  content_summary: string;
  is_enabled: boolean;
  is_verified?: boolean | null;
  last_verified_at?: string | null;
  document_type_code?: string | null;
  checklist_verified?: boolean | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

function mapKnowledgeSource(
  row: RawKnowledgeSource
): AdminKnowledgeSourceRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    contentSummary: row.content_summary,
    isEnabled: row.is_enabled,
    isVerified: typeof row.is_verified === "boolean" ? row.is_verified : true,
    lastVerifiedAt: row.last_verified_at ?? null,
    documentTypeCode: row.document_type_code ?? null,
    checklistVerified:
      typeof row.checklist_verified === "boolean"
        ? row.checklist_verified
        : true,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminKnowledgeSources(): Promise<{
  sources: AdminKnowledgeSourceRecord[];
  schemaReady: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ai_knowledge_sources")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return { sources: [], schemaReady: !isMissingTable(error.message) };
  }
  return {
    sources: ((data ?? []) as RawKnowledgeSource[]).map(mapKnowledgeSource),
    schemaReady: true,
  };
}

export async function seedOfficialDnscKnowledgeSources(
  adminUser: SafeUser
): Promise<
  | { ok: true; insertedCount: number; sources: AdminKnowledgeSourceRecord[] }
  | { ok: false; status: number; error: string }
> {
  const admin = createSupabaseAdminClient();
  let insertedCount = 0;

  for (const entry of OFFICIAL_DNSC_KNOWLEDGE_SEED) {
    const { data: existing } = await admin
      .from("ai_knowledge_sources")
      .select("id")
      .eq("title", entry.title)
      .maybeSingle();

    if (existing) continue;

    let { error } = await admin.from("ai_knowledge_sources").insert({
      title: entry.title,
      category: entry.category,
      source_type: entry.sourceType,
      source_url: entry.sourceUrl,
      content_summary: entry.contentSummary,
      is_enabled: entry.isEnabled,
      is_verified: entry.isVerified,
      last_verified_at: entry.lastVerifiedAt,
      document_type_code: entry.documentTypeCode ?? null,
      checklist_verified: entry.checklistVerified,
      seed_key: entry.seedKey,
      created_by: adminUser.id,
      created_by_name: adminUser.fullName,
    });

    if (error && isMissingTable(error.message)) {
      const fb = await admin.from("ai_knowledge_sources").insert({
        title: entry.title,
        category: entry.category,
        source_type: entry.sourceType,
        source_url: entry.sourceUrl,
        content_summary: entry.contentSummary,
        is_enabled: entry.isEnabled,
        created_by: adminUser.id,
        created_by_name: adminUser.fullName,
      });
      error = fb.error;
    }

    if (!error) insertedCount += 1;
  }

  await recordAdminAuditLog({
    actor: adminUser,
    action: "knowledge_base_seeded",
    entityType: "ai_knowledge_source",
    entityLabel: "Official DNSC Registrar Knowledge Base",
    description: `Seeded ${insertedCount} official DNSC Registrar knowledge entries.`,
    newValue: { insertedCount },
  });

  const refreshed = await listAdminKnowledgeSources();
  return { ok: true, insertedCount, sources: refreshed.sources };
}

export async function createAdminKnowledgeSource(input: {
  title: string;
  category?: string;
  sourceType?: KnowledgeSourceType;
  sourceUrl?: string;
  contentSummary: string;
  isEnabled?: boolean;
  isVerified?: boolean;
  lastVerifiedAt?: string;
  checklistVerified?: boolean;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; source: AdminKnowledgeSourceRecord }
  | { ok: false; status: number; error: string }
> {
  if (!input.title.trim() || !input.contentSummary.trim()) {
    return {
      ok: false,
      status: 400,
      error: "Source title and approved content summary are required.",
    };
  }

  const admin = createSupabaseAdminClient();
  let { data, error } = await admin
    .from("ai_knowledge_sources")
    .insert({
      title: input.title.trim(),
      category: input.category?.trim() || "Registrar Information",
      source_type: input.sourceType || "official_document",
      source_url: input.sourceUrl?.trim() || null,
      content_summary: input.contentSummary.trim(),
      is_enabled: input.isEnabled !== false,
      is_verified: input.isVerified !== false,
      last_verified_at:
        input.lastVerifiedAt?.trim() || new Date().toISOString().slice(0, 10),
      checklist_verified: input.checklistVerified !== false,
      created_by: input.adminUser.id,
      created_by_name: input.adminUser.fullName,
    })
    .select("*")
    .single();

  if (error && isMissingTable(error.message)) {
    const fb = await admin
      .from("ai_knowledge_sources")
      .insert({
        title: input.title.trim(),
        category: input.category?.trim() || "Registrar Information",
        source_type: input.sourceType || "official_document",
        source_url: input.sourceUrl?.trim() || null,
        content_summary: input.contentSummary.trim(),
        is_enabled: input.isEnabled !== false,
        created_by: input.adminUser.id,
        created_by_name: input.adminUser.fullName,
      })
      .select("*")
      .single();
    data = fb.data;
    error = fb.error;
  }

  if (error || !data) {
    return {
      ok: false,
      status: isMissingTable(error?.message) ? 503 : 500,
      error: isMissingTable(error?.message)
        ? "Please run migration 0005/0007 in Supabase."
        : "Unable to create AI knowledge source.",
    };
  }

  const created = mapKnowledgeSource(data as RawKnowledgeSource);
  await recordAdminAuditLog({
    actor: input.adminUser,
    action: "knowledge_source_created",
    entityType: "ai_knowledge_source",
    entityId: created.id,
    entityLabel: created.title,
    description: `Added approved AI knowledge source "${created.title}".`,
    newValue: {
      title: created.title,
      isEnabled: created.isEnabled,
      isVerified: created.isVerified,
    },
  });

  return { ok: true, source: created };
}

export async function updateAdminKnowledgeSource(input: {
  id: string;
  title?: string;
  category?: string;
  sourceType?: KnowledgeSourceType;
  sourceUrl?: string;
  contentSummary?: string;
  isEnabled?: boolean;
  isVerified?: boolean;
  lastVerifiedAt?: string;
  checklistVerified?: boolean;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; source: AdminKnowledgeSourceRecord }
  | { ok: false; status: number; error: string }
> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("ai_knowledge_sources")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, status: 404, error: "Knowledge source not found." };
  }
  const prev = mapKnowledgeSource(existing as RawKnowledgeSource);

  const payload: Record<string, unknown> = {};
  if (typeof input.title === "string" && input.title.trim())
    payload.title = input.title.trim();
  if (typeof input.category === "string" && input.category.trim())
    payload.category = input.category.trim();
  if (input.sourceType) payload.source_type = input.sourceType;
  if (typeof input.sourceUrl === "string")
    payload.source_url = input.sourceUrl.trim() || null;
  if (typeof input.contentSummary === "string" && input.contentSummary.trim())
    payload.content_summary = input.contentSummary.trim();
  if (typeof input.isEnabled === "boolean") payload.is_enabled = input.isEnabled;
  if (typeof input.isVerified === "boolean")
    payload.is_verified = input.isVerified;
  if (typeof input.lastVerifiedAt === "string")
    payload.last_verified_at = input.lastVerifiedAt.trim() || null;
  if (typeof input.checklistVerified === "boolean")
    payload.checklist_verified = input.checklistVerified;

  let { data, error } = await admin
    .from("ai_knowledge_sources")
    .update(payload)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error && isMissingTable(error.message)) {
    delete payload.is_verified;
    delete payload.last_verified_at;
    delete payload.checklist_verified;
    const fb = await admin
      .from("ai_knowledge_sources")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    data = fb.data;
    error = fb.error;
  }

  if (error || !data) {
    return { ok: false, status: 500, error: "Unable to update knowledge source." };
  }

  const updated = mapKnowledgeSource(data as RawKnowledgeSource);
  await recordAdminAuditLog({
    actor: input.adminUser,
    action:
      typeof input.isEnabled === "boolean" && input.isEnabled !== prev.isEnabled
        ? input.isEnabled
          ? "knowledge_source_enabled"
          : "knowledge_source_disabled"
        : "knowledge_source_updated",
    entityType: "ai_knowledge_source",
    entityId: updated.id,
    entityLabel: updated.title,
    description: `Updated AI knowledge source "${updated.title}".`,
    previousValue: { isEnabled: prev.isEnabled, isVerified: prev.isVerified },
    newValue: { isEnabled: updated.isEnabled, isVerified: updated.isVerified },
  });

  return { ok: true, source: updated };
}
