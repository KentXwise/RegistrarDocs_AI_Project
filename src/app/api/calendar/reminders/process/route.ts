import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { processDueCalendarReminders } from "@/lib/db/calendar";

/**
 * Triggers server-side processing of due calendar reminders.
 * Can be invoked by an external scheduler/cron using `Authorization: Bearer <CRON_SECRET>`
 * OR by an authenticated Admin/Staff user.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();

  const authorizedByCron =
    Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!authorizedByCron) {
    const auth = await requireApiAuth(["admin", "staff"]);
    if (!auth.ok) return auth.response;
  }

  try {
    const summary = await processDueCalendarReminders();
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unable to process due reminders.",
      },
      { status: 500 }
    );
  }
}
