import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { dismissCalendarReminder } from "@/lib/db/calendar";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["admin", "staff"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = await dismissCalendarReminder(auth.user, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 }
    );
  }

  return NextResponse.json({ dismissed: true }, { status: 200 });
}
