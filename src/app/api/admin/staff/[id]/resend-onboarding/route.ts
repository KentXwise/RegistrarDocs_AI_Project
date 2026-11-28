import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { resendStaffOnboardingEmail } from "@/lib/db/admin-users";
import { getAppBaseUrl } from "@/lib/email/mailer";
import type { AuthErrorCode } from "@/types/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Staff account not found.", code: "VALIDATION_ERROR" satisfies AuthErrorCode },
      { status: 404 }
    );
  }

  const loginUrl = `${getAppBaseUrl(request)}/login`;
  const result = await resendStaffOnboardingEmail({
    staffUserId: id,
    loginUrl,
    adminUser: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: "SERVER_ERROR" satisfies AuthErrorCode },
      { status: result.status }
    );
  }

  return NextResponse.json(
    { emailDelivery: result.emailDelivery },
    { status: 200 }
  );
}
