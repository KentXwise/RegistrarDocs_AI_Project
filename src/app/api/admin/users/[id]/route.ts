import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  performAdminUserAction,
  type AdminUserAction,
} from "@/lib/db/admin-users";
import type { AuthErrorCode } from "@/types/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_ACTIONS: readonly AdminUserAction[] = [
  "approve_student",
  "request_student_correction",
  "reject_student",
  "activate_account",
  "deactivate_account",
];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "User account not found.", code: "VALIDATION_ERROR" satisfies AuthErrorCode },
      { status: 404 }
    );
  }

  let body: { action?: unknown; remarks?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload.", code: "VALIDATION_ERROR" satisfies AuthErrorCode },
      { status: 400 }
    );
  }

  const action =
    typeof body.action === "string"
      ? (body.action.trim() as AdminUserAction)
      : null;

  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: "Unsupported administrative action.", code: "VALIDATION_ERROR" satisfies AuthErrorCode },
      { status: 400 }
    );
  }

  const remarks =
    typeof body.remarks === "string" ? body.remarks.slice(0, 1000) : undefined;

  const result = await performAdminUserAction({
    targetUserId: id,
    action,
    adminUser: auth.user,
    remarks,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: (result.status === 400 ? "VALIDATION_ERROR" : "SERVER_ERROR") satisfies AuthErrorCode,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({ user: result.user }, { status: 200 });
}
