import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  createAdminKnowledgeSource,
  listAdminKnowledgeSources,
  seedOfficialDnscKnowledgeSources,
  updateAdminKnowledgeSource,
  type KnowledgeSourceType,
} from "@/lib/db/admin-catalog";

const ALLOWED_TYPES: readonly KnowledgeSourceType[] = [
  "official_document",
  "registrar_procedure",
  "document_requirements",
  "institutional_faq",
  "official_webpage",
];

export async function GET() {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const result = await listAdminKnowledgeSources();
  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (body.action === "seed_official_dnsc") {
    const seeded = await seedOfficialDnscKnowledgeSources(auth.user);
    if (!seeded.ok) {
      return NextResponse.json(
        { error: seeded.error },
        { status: seeded.status }
      );
    }
    return NextResponse.json(seeded, { status: 200 });
  }

  const sourceType =
    typeof body.sourceType === "string" &&
    (ALLOWED_TYPES as readonly string[]).includes(body.sourceType)
      ? (body.sourceType as KnowledgeSourceType)
      : "official_document";

  const result = await createAdminKnowledgeSource({
    title: typeof body.title === "string" ? body.title : "",
    category: typeof body.category === "string" ? body.category : undefined,
    sourceType,
    sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : undefined,
    contentSummary:
      typeof body.contentSummary === "string" ? body.contentSummary : "",
    isEnabled: body.isEnabled !== false,
    isVerified: body.isVerified !== false,
    lastVerifiedAt:
      typeof body.lastVerifiedAt === "string" ? body.lastVerifiedAt : undefined,
    checklistVerified: body.checklistVerified !== false,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ source: result.source }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json(
      { error: "Knowledge source ID is required." },
      { status: 400 }
    );
  }

  const sourceType =
    typeof body.sourceType === "string" &&
    (ALLOWED_TYPES as readonly string[]).includes(body.sourceType)
      ? (body.sourceType as KnowledgeSourceType)
      : undefined;

  const result = await updateAdminKnowledgeSource({
    id,
    title: typeof body.title === "string" ? body.title : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    sourceType,
    sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : undefined,
    contentSummary:
      typeof body.contentSummary === "string" ? body.contentSummary : undefined,
    isEnabled: typeof body.isEnabled === "boolean" ? body.isEnabled : undefined,
    isVerified:
      typeof body.isVerified === "boolean" ? body.isVerified : undefined,
    lastVerifiedAt:
      typeof body.lastVerifiedAt === "string" ? body.lastVerifiedAt : undefined,
    checklistVerified:
      typeof body.checklistVerified === "boolean"
        ? body.checklistVerified
        : undefined,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ source: result.source }, { status: 200 });
}
