import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Allows authenticated Requesters to submit real (is_synthetic = false)
 * service feedback for Admin review and AI Feedback Analyzer summarization.
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(["requester"]);
  if (!auth.ok) return auth.response;

  let body: { category?: unknown; rating?: unknown; comment?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const comment =
    typeof body.comment === "string" ? body.comment.trim() : "";
  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim().slice(0, 80)
      : "General";
  const ratingRaw = Number(body.rating);
  const rating =
    Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5
      ? ratingRaw
      : null;

  if (!comment || comment.length < 4) {
    return NextResponse.json(
      { error: "Please enter your feedback comment (at least 4 characters)." },
      { status: 400 }
    );
  }
  if (comment.length > 1000) {
    return NextResponse.json(
      { error: "Feedback comment must be 1,000 characters or fewer." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("user_feedback").insert({
    user_id: auth.user.id,
    category,
    rating,
    comment,
    is_synthetic: false,
  });

  if (error) {
    return NextResponse.json(
      { error: "Unable to save feedback right now." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
