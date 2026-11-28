import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { seedOfficialCalendarData } from "@/lib/db/calendar";

export async function POST() {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const result = await seedOfficialCalendarData();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, schemaReady: result.schemaReady },
      { status: result.schemaReady ? 500 : 503 }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
