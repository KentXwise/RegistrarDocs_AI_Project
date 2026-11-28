import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  deleteCalendarEvent,
  updateCalendarEvent,
  type CalendarEventWriteInput,
} from "@/lib/db/calendar";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["admin", "staff"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let body: Partial<CalendarEventWriteInput>;
  try {
    body = (await request.json()) as Partial<CalendarEventWriteInput>;
  } catch {
    return NextResponse.json(
      { error: "Invalid calendar update payload." },
      { status: 400 }
    );
  }

  const result = await updateCalendarEvent(auth.user, id, body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 }
    );
  }

  return NextResponse.json({ event: result.event }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["admin", "staff"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = await deleteCalendarEvent(auth.user, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 }
    );
  }

  return NextResponse.json({ deleted: true }, { status: 200 });
}
