import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { updateRequesterAcademicProfile } from "@/lib/db/profiles";
import type { AuthErrorCode } from "@/types/auth";

export async function GET() {
  const auth = await requireApiAuth(["requester"]);
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json(
    {
      profile: {
        id: auth.user.id,
        fullName: auth.user.fullName,
        email: auth.user.email,
        studentId: auth.user.studentId,
        institute: auth.user.institute,
        program: auth.user.program,
        role: auth.user.role,
        status: auth.user.status,
      },
    },
    { status: 200 }
  );
}

export async function PATCH(request: Request) {
  const auth = await requireApiAuth(["requester"]);
  if (!auth.ok) {
    return auth.response;
  }

  let body: { institute?: unknown; program?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid profile update payload.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const institute =
    typeof body.institute === "string" ? body.institute.trim() : "";
  const program = typeof body.program === "string" ? body.program.trim() : "";

  const result = await updateRequesterAcademicProfile(
    auth.user.id,
    institute,
    program
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: (result.status === 400
          ? "VALIDATION_ERROR"
          : "SERVER_ERROR") satisfies AuthErrorCode,
        fieldErrors: result.fieldErrors,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(
    {
      profile: {
        id: result.user.id,
        fullName: result.user.fullName,
        email: result.user.email,
        studentId: result.user.studentId,
        institute: result.user.institute,
        program: result.user.program,
        role: result.user.role,
        status: result.user.status,
      },
    },
    { status: 200 }
  );
}
