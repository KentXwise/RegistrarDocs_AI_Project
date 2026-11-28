import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import {
  listRecipientNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db/notifications";
import { processDueCalendarReminders } from "@/lib/db/calendar";
import type { AuthErrorCode } from "@/types/auth";

export async function GET(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const offsetParam = Number(searchParams.get("offset") ?? "0");
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  try {
    await processDueCalendarReminders().catch(() => {});
    const result = await listRecipientNotifications(auth.user.id, {
      limit: Number.isFinite(limitParam) ? limitParam : 20,
      offset: Number.isFinite(offsetParam) ? offsetParam : 0,
      unreadOnly,
    });
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to load notifications right now.",
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  let body: { action?: unknown; notificationId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid notification update payload.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  try {
    if (body.action === "mark_all_read") {
      const unreadCount = await markAllNotificationsRead(auth.user.id);
      return NextResponse.json({ unreadCount }, { status: 200 });
    }

    if (
      body.action === "mark_read" &&
      typeof body.notificationId === "string" &&
      body.notificationId.trim()
    ) {
      const unreadCount = await markNotificationRead(
        auth.user.id,
        body.notificationId.trim()
      );
      return NextResponse.json({ unreadCount }, { status: 200 });
    }

    return NextResponse.json(
      {
        error: "Unsupported notification action.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Unable to update notification status right now.",
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }
}
