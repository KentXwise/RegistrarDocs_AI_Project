import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getAccountStatusDenial } from "@/lib/auth/rbac";
import { findProfileById, updateProfileLastLogin } from "@/lib/db/profiles";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getDashboardPathForRole } from "@/types/auth";

const ALLOWED_OTP_TYPES: readonly EmailOtpType[] = [
  "recovery",
  "magiclink",
  "signup",
  "invite",
  "email",
];

/**
 * Unified Supabase Auth callback handler for PKCE `?code=` and `?token_hash=`
 * links (password recovery, magic links, signup confirmations).
 *
 * Explicitly attaches all session cookies set by Supabase directly onto the
 * outgoing `NextResponse.redirect(...)` so recovery/login sessions are never
 * lost across redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  const tokenHash = searchParams.get("token_hash")?.trim();
  const rawType = searchParams.get("type")?.trim() as EmailOtpType | undefined;
  const next = searchParams.get("next")?.trim();

  const isRecoveryIntent =
    rawType === "recovery" || next === "/auth/reset-password";

  const config = getSupabasePublicConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
  }

  const pendingCookies: { name: string; value: string; options: CookieOptions }[] =
    [];

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  const redirectWithCookies = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin));
    pendingCookies.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, {
        ...options,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: options?.sameSite ?? "lax",
      });
    });
    return res;
  };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(
          isRecoveryIntent
            ? "/auth/reset-password?error=invalid_link"
            : "/login?error=auth_callback_failed",
          origin
        )
      );
    }
  } else if (
    tokenHash &&
    rawType &&
    (ALLOWED_OTP_TYPES as readonly string[]).includes(rawType)
  ) {
    const { error } = await supabase.auth.verifyOtp({
      type: rawType,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        new URL(
          isRecoveryIntent
            ? "/auth/reset-password?error=invalid_link"
            : "/login?error=auth_callback_failed",
          origin
        )
      );
    }
  } else {
    return NextResponse.redirect(
      new URL(
        isRecoveryIntent
          ? "/auth/reset-password?error=invalid_link"
          : "/login?error=auth_callback_failed",
        origin
      )
    );
  }

  // Password recovery flow -> dedicated Reset Password page with session cookies attached
  if (isRecoveryIntent) {
    return redirectWithCookies("/auth/reset-password");
  }

  // Sign-in / Magic link flow -> validate authoritative role & account status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", origin)
    );
  }

  const profile = await findProfileById(user.id);
  if (!profile) {
    await supabase.auth.signOut().catch(() => {});
    return redirectWithCookies("/login?error=account_not_found");
  }

  const denial = getAccountStatusDenial(profile.role, profile.status);
  if (denial) {
    await supabase.auth.signOut().catch(() => {});
    return redirectWithCookies(
      `/login?error=${encodeURIComponent(denial.code)}`
    );
  }

  await updateProfileLastLogin(profile.id);

  if (profile.must_change_password) {
    return redirectWithCookies("/auth/change-password");
  }

  return redirectWithCookies(getDashboardPathForRole(profile.role));
}
