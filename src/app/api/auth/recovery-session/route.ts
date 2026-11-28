import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Verifies an implicit-flow Supabase recovery token pair (`access_token` +
 * `refresh_token`) from the `/auth/reset-password` URL fragment on the server
 * via official `supabase.auth.setSession()` + `getUser()`, establishing an
 * HttpOnly server session cookie without storing tokens in client storage.
 */
export async function POST(request: Request) {
  let body: { accessToken?: unknown; refreshToken?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid recovery session payload." },
      { status: 400 }
    );
  }

  const accessToken =
    typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing recovery session credentials." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          error:
            "This password reset link is invalid, expired, or has already been used.",
        },
        { status: 401 }
      );
    }

    // Double-verify token authenticity against Supabase Auth server
    const {
      data: { user: verifiedUser },
      error: verifyError,
    } = await supabase.auth.getUser();

    if (verifyError || !verifiedUser) {
      return NextResponse.json(
        {
          error:
            "This password reset link could not be verified. Please request a new reset link.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify your password reset session right now." },
      { status: 500 }
    );
  }
}
