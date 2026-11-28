import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { listAdminUsers } from "@/lib/db/admin-users";
import {
  ACCOUNT_STATUSES,
  USER_ROLES,
  type AccountStatus,
  type AuthErrorCode,
  type UserRole,
} from "@/types/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const rawRole = searchParams.get("role")?.trim();
  const rawStatus = searchParams.get("status")?.trim();
  const search = searchParams.get("search")?.trim() || undefined;

  const role: UserRole | "all" =
    rawRole && (USER_ROLES as readonly string[]).includes(rawRole)
      ? (rawRole as UserRole)
      : "all";

  const status: AccountStatus | "all" =
    rawStatus && (ACCOUNT_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as AccountStatus)
      : "all";

  const result = await listAdminUsers({ role, status, search });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: "SERVER_ERROR" satisfies AuthErrorCode },
      { status: 500 }
    );
  }

  return NextResponse.json({ users: result.users }, { status: 200 });
}
