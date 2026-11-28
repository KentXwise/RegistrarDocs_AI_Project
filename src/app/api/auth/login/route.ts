import { NextResponse } from "next/server";
import {
  checkLoginRateLimit,
  clearFailedLoginAttempts,
  recordFailedLoginAttempt,
} from "@/lib/auth/rate-limit";
import { getAccountStatusDenial } from "@/lib/auth/rbac";
import {
  findProfileById,
  resolveProfileByLoginIdentifier,
  toSafeUser,
  updateProfileLastLogin,
} from "@/lib/db/profiles";
import {
  validateLoginIdentifier,
  validateLoginPassword,
} from "@/lib/login-validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDashboardPathForRole, type AuthErrorCode } from "@/types/auth";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase authentication is not configured yet. Please configure Supabase environment variables before signing in.",
        code: "SUPABASE_NOT_CONFIGURED" satisfies AuthErrorCode,
      },
      { status: 503 }
    );
  }

  let body: { identifier?: unknown; password?: unknown };
  try {
    body = (await request.json()) as {
      identifier?: unknown;
      password?: unknown;
    };
  } catch {
    return NextResponse.json(
      {
        error: "Invalid login request payload.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const identifier =
    typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const fieldErrors: Record<string, string> = {};
  const identifierError = validateLoginIdentifier(identifier);
  if (identifierError) fieldErrors.identifier = identifierError;

  const passwordError = validateLoginPassword(password);
  if (passwordError) fieldErrors.password = passwordError;

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        error: "Please enter your email or Student ID and password.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
        fieldErrors,
      },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request);
  const rateLimit = checkLoginRateLimit(clientIp, identifier);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many failed sign-in attempts. Please wait a few minutes before trying again.",
        code: "RATE_LIMITED" satisfies AuthErrorCode,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  // Server-only resolution: Student ID or email -> email for Supabase Auth
  const matchedProfile = await resolveProfileByLoginIdentifier(identifier);
  const resolvedEmail =
    matchedProfile?.email ?? (identifier.includes("@") ? identifier : null);

  if (!resolvedEmail) {
    recordFailedLoginAttempt(clientIp, identifier);
    return NextResponse.json(
      {
        error: "Invalid email/Student ID or password.",
        code: "INVALID_CREDENTIALS" satisfies AuthErrorCode,
      },
      { status: 401 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

  if (signInError || !signInData.user) {
    recordFailedLoginAttempt(clientIp, identifier);
    return NextResponse.json(
      {
        error: "Invalid email/Student ID or password.",
        code: "INVALID_CREDENTIALS" satisfies AuthErrorCode,
      },
      { status: 401 }
    );
  }

  // Load authoritative profile from PostgreSQL and enforce account status
  const profile =
    matchedProfile && matchedProfile.id === signInData.user.id
      ? matchedProfile
      : await findProfileById(signInData.user.id);

  if (!profile) {
    await supabase.auth.signOut().catch(() => {});
    return NextResponse.json(
      {
        error: "Invalid email/Student ID or password.",
        code: "INVALID_CREDENTIALS" satisfies AuthErrorCode,
      },
      { status: 401 }
    );
  }

  const statusDenial = getAccountStatusDenial(profile.role, profile.status);
  if (statusDenial) {
    await supabase.auth.signOut().catch(() => {});
    return NextResponse.json(
      {
        error: statusDenial.message,
        code: statusDenial.code,
        status: profile.status,
      },
      { status: 403 }
    );
  }

  clearFailedLoginAttempts(clientIp, identifier);
  await updateProfileLastLogin(profile.id);

  const safeUser = toSafeUser({
    ...profile,
    last_login_at: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      user: safeUser,
      redirectTo: safeUser.mustChangePassword
        ? "/auth/change-password"
        : getDashboardPathForRole(safeUser.role),
    },
    { status: 200 }
  );
}
