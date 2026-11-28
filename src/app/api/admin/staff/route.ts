import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  createStaffAccountByAdmin,
  listAdminUsers,
} from "@/lib/db/admin-users";
import { getAppBaseUrl } from "@/lib/email/mailer";
import type { AuthErrorCode } from "@/types/auth";

export async function GET() {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const result = await listAdminUsers({ role: "staff" });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: "SERVER_ERROR" satisfies AuthErrorCode },
      { status: 500 }
    );
  }

  return NextResponse.json({ staff: result.users }, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  let body: {
    fullName?: unknown;
    email?: unknown;
    employeeId?: unknown;
    status?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload.", code: "VALIDATION_ERROR" satisfies AuthErrorCode },
      { status: 400 }
    );
  }

  const loginUrl = `${getAppBaseUrl(request)}/login`;

  const result = await createStaffAccountByAdmin({
    fullName: typeof body.fullName === "string" ? body.fullName : "",
    email: typeof body.email === "string" ? body.email : "",
    employeeId: typeof body.employeeId === "string" ? body.employeeId : undefined,
    status:
      body.status === "invitation_pending" ? "invitation_pending" : "active",
    loginUrl,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: (result.status === 409
          ? "DUPLICATE_EMAIL"
          : result.status === 400
            ? "VALIDATION_ERROR"
            : "SERVER_ERROR") satisfies AuthErrorCode,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(
    { user: result.user, emailDelivery: result.emailDelivery },
    { status: 201 }
  );
}
