import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { validateNewPasswordStrength } from "@/lib/auth/temp-password";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { getDashboardPathForRole, type AuthErrorCode } from "@/types/auth";

/**
 * Updates the password for an authenticated user (supports both forced
 * first-login password change for Staff and password recovery reset sessions).
 */
export async function POST(request: Request) {
  let body: {
    newPassword?: unknown;
    confirmPassword?: unknown;
    mode?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload.", code: "VALIDATION_ERROR" satisfies AuthErrorCode },
      { status: 400 }
    );
  }

  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const mode = body.mode === "recovery" ? "recovery" : "first_login";

  const strengthError = validateNewPasswordStrength(newPassword);
  if (strengthError) {
    return NextResponse.json(
      { error: strengthError, code: "VALIDATION_ERROR" satisfies AuthErrorCode },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      {
        error: "New password and confirmation do not match.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (mode === "recovery") {
    // Recovery session established via /auth/callback
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json(
        {
          error:
            "Your password reset link is invalid or has expired. Please request a new reset link.",
          code: "UNAUTHENTICATED" satisfies AuthErrorCode,
        },
        { status: 401 }
      );
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    if (updateErr) {
      return NextResponse.json(
        {
          error: updateErr.message || "Unable to update your password.",
          code: "SERVER_ERROR" satisfies AuthErrorCode,
        },
        { status: 500 }
      );
    }

    // Clear must_change_password if set
    await admin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);

    // Sign out recovery session so user signs in cleanly with their new password
    await supabase.auth.signOut().catch(() => {});

    return NextResponse.json(
      { ok: true, redirectTo: "/login?reset=success" },
      { status: 200 }
    );
  }

  // Forced first-login password change flow
  const auth = await requireApiAuth(undefined, {
    allowPendingPasswordChange: true,
  });
  if (!auth.ok) return auth.response;

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    auth.user.id,
    { password: newPassword }
  );

  if (updateErr) {
    return NextResponse.json(
      {
        error: updateErr.message || "Unable to update your password right now.",
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }

  // Clear persistent first-login flag
  await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", auth.user.id);

  // Refresh user session cookie with the new password so dashboard access works immediately
  await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: newPassword,
  });

  return NextResponse.json(
    {
      ok: true,
      redirectTo: getDashboardPathForRole(auth.user.role),
    },
    { status: 200 }
  );
}
