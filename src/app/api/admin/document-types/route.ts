import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  createAdminDocumentType,
  listAdminDocumentTypes,
  updateAdminDocumentType,
} from "@/lib/db/admin-catalog";

export async function GET() {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const result = await listAdminDocumentTypes();
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

  const result = await createAdminDocumentType({
    code: typeof body.code === "string" ? body.code : "",
    name: typeof body.name === "string" ? body.name : "",
    shortLabel: typeof body.shortLabel === "string" ? body.shortLabel : "",
    category: typeof body.category === "string" ? body.category : "",
    shortDescription:
      typeof body.shortDescription === "string" ? body.shortDescription : "",
    fullDescription:
      typeof body.fullDescription === "string" ? body.fullDescription : "",
    instructions:
      typeof body.instructions === "string" ? body.instructions : undefined,
    processingInfo:
      typeof body.processingInfo === "string" ? body.processingInfo : undefined,
    requiresAdditionalNotes: body.requiresAdditionalNotes === true,
    additionalNotesLabel:
      typeof body.additionalNotesLabel === "string"
        ? body.additionalNotesLabel
        : undefined,
    isActive: body.isActive !== false,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ documentType: result.documentType }, { status: 201 });
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
      { error: "Document type ID is required." },
      { status: 400 }
    );
  }

  const result = await updateAdminDocumentType({
    id,
    name: typeof body.name === "string" ? body.name : undefined,
    shortLabel:
      typeof body.shortLabel === "string" ? body.shortLabel : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    shortDescription:
      typeof body.shortDescription === "string"
        ? body.shortDescription
        : undefined,
    fullDescription:
      typeof body.fullDescription === "string"
        ? body.fullDescription
        : undefined,
    instructions:
      typeof body.instructions === "string" ? body.instructions : undefined,
    processingInfo:
      typeof body.processingInfo === "string" ? body.processingInfo : undefined,
    requiresAdditionalNotes:
      typeof body.requiresAdditionalNotes === "boolean"
        ? body.requiresAdditionalNotes
        : undefined,
    additionalNotesLabel:
      typeof body.additionalNotesLabel === "string"
        ? body.additionalNotesLabel
        : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ documentType: result.documentType }, { status: 200 });
}
