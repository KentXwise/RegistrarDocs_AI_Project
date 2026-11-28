import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { listAdminAuditLogs } from "@/lib/db/admin-audit";

export async function GET(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType")?.trim() || undefined;
  const action = searchParams.get("action")?.trim() || undefined;
  const search = searchParams.get("search")?.trim() || undefined;

  const result = await listAdminAuditLogs({
    entityType,
    action,
    search,
    limit: 200,
  });

  return NextResponse.json(result, { status: 200 });
}
