import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAppBaseUrl } from "@/lib/email/mailer";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * Initiates Supabase Auth password recovery using a stateless implicit-flow
 * client so recovery links work reliably across any browser, device, or email
 * client (without failing on missing cross-browser PKCE code_verifier cookies)
 * and land directly on `${appUrl}/auth/reset-password`.
 */
export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Authentication service is not configured." },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(config.url, config.anonKey, {
      auth: {
        flowType: "implicit",
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const redirectTo = `${getAppBaseUrl(request)}/auth/reset-password`;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    // Non-enumerating response: never reveal whether an email exists
    return NextResponse.json(
      {
        ok: true,
        message:
          "If an account is associated with that email address, a password reset link has been sent. Please check your inbox.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to process password reset request right now." },
      { status: 500 }
    );
  }
}
