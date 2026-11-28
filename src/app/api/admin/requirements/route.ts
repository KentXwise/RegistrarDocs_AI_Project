import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  createAdminRequirement,
  listAdminRequirements,
  updateAdminRequirement,
} from "@/lib/db/admin-catalog";

export async function GET() {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const result = await listAdminRequirements();
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

  const result = await createAdminRequirement({
    documentTypeId:
      typeof body.documentTypeId === "string" ? body.documentTypeId : "",
    title: typeof body.title === "string" ? body.title : "",
    description:
      typeof body.description === "string" ? body.description : undefined,
    isMandatory: body.isMandatory !== false,
    displayOrder:
      typeof body.displayOrder === "number"
        ? body.displayOrder
        : Number(body.displayOrder) || 0,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ requirement: result.requirement }, { status: 201 });
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
      { error: "Requirement ID is required." },
      { status: 400 }
    );
  }

  const result = await updateAdminRequirement({
    id,
    documentTypeId:
      typeof body.documentTypeId === "string" ? body.documentTypeId : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
    description:
      typeof body.description === "string" ? body.description : undefined,
    isMandatory:
      typeof body.isMandatory === "boolean" ? body.isMandatory : undefined,
    displayOrder:
      typeof body.displayOrder === "number" ? body.displayOrder : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ requirement: result.requirement }, { status: 200 });
}
