import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  createCalendarEvent,
  listCalendarEventsForUser,
  type CalendarEventWriteInput,
} from "@/lib/db/calendar";

export async function GET(request: Request) {
  const auth = await requireApiAuth(["admin", "staff", "requester"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const includeInactive =
    auth.user.role === "admin" && searchParams.get("includeInactive") === "true";

  try {
    const result = await listCalendarEventsForUser(auth.user, {
      includeInactive,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unable to load calendar events right now.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(["admin", "staff"]);
  if (!auth.ok) return auth.response;

  let body: CalendarEventWriteInput;
  try {
    body = (await request.json()) as CalendarEventWriteInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid calendar event payload." },
      { status: 400 }
    );
  }

  const result = await createCalendarEvent(auth.user, body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 }
    );
  }

  return NextResponse.json({ event: result.event }, { status: 201 });
}
