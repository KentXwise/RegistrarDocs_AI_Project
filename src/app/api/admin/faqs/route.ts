import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  createAdminFaq,
  deleteAdminFaq,
  listAdminFaqs,
  updateAdminFaq,
} from "@/lib/db/admin-catalog";

export async function GET() {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const result = await listAdminFaqs();
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

  const result = await createAdminFaq({
    question: typeof body.question === "string" ? body.question : "",
    answer: typeof body.answer === "string" ? body.answer : "",
    category: typeof body.category === "string" ? body.category : undefined,
    isPublished: body.isPublished !== false,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ faq: result.faq }, { status: 201 });
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
    return NextResponse.json({ error: "FAQ ID is required." }, { status: 400 });
  }

  const result = await updateAdminFaq({
    id,
    question: typeof body.question === "string" ? body.question : undefined,
    answer: typeof body.answer === "string" ? body.answer : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    isPublished:
      typeof body.isPublished === "boolean" ? body.isPublished : undefined,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ faq: result.faq }, { status: 200 });
}

export async function DELETE(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() || "";
  if (!id) {
    return NextResponse.json({ error: "FAQ ID is required." }, { status: 400 });
  }

  const result = await deleteAdminFaq(id, auth.user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
