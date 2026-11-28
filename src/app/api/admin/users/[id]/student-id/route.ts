import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { getAdminUserStudentIdImageMeta } from "@/lib/db/admin-users";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin-only streaming endpoint for private Student ID verification images
 * stored in the private `student-ids` Supabase Storage bucket.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const meta = await getAdminUserStudentIdImageMeta(id);
  if (!meta) {
    return NextResponse.json(
      { error: "No Student ID image uploaded for this account." },
      { status: 404 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("student-ids")
    .download(meta.path);

  if (error || !data) {
    return NextResponse.json(
      { error: "Unable to retrieve Student ID image." },
      { status: 404 }
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  return new NextResponse(new Uint8Array(arrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": meta.mime || "image/jpeg",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
