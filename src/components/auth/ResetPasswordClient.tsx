"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";

interface ResetPasswordClientProps {
  initialHasSession: boolean;
  initialError?: string | null;
}

type RecoveryState = "verifying" | "ready" | "invalid";

/**
 * Handles both server-verified recovery sessions (from `/auth/callback`) AND
 * implicit-flow URL fragment recovery tokens (`#access_token=...&refresh_token=...&type=recovery`)
 * by exchanging them server-side into HttpOnly cookies via `/api/auth/recovery-session`
 * and immediately stripping tokens from the URL bar.
 */
export function ResetPasswordClient({
  initialHasSession,
  initialError,
}: ResetPasswordClientProps) {
  const [state, setState] = useState<RecoveryState>(() =>
    initialHasSession ? "ready" : "verifying"
  );
  const [errorMessage, setErrorMessage] = useState<string>(
    initialError ||
      "This password reset link is invalid, expired, or has already been used. Please request a fresh password reset link to continue."
  );

  useEffect(() => {
    if (initialHasSession) return;

    let cancelled = false;

    async function verifyFromUrl() {
      const rawHash = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(rawHash);
      const searchParams = new URLSearchParams(window.location.search);

      const hashError =
        hashParams.get("error_description") || hashParams.get("error");
      const queryError =
        searchParams.get("error_description") || searchParams.get("error");

      if (hashError) {
        window.history.replaceState(null, "", "/auth/reset-password");
        if (!cancelled) {
          setErrorMessage(
            hashError.replace(/\+/g, " ") ||
              "This password reset link has expired or is invalid."
          );
          setState("invalid");
        }
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        // Immediately scrub tokens from browser URL bar / history
        window.history.replaceState(null, "", "/auth/reset-password");

        try {
          const res = await fetch("/api/auth/recovery-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken, refreshToken }),
          });
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            error?: string;
          } | null;

          if (!cancelled) {
            if (res.ok && data?.ok) {
              setState("ready");
            } else {
              setErrorMessage(
                data?.error ||
                  "This password reset link is invalid, expired, or has already been used."
              );
              setState("invalid");
            }
          }
          return;
        } catch {
          if (!cancelled) {
            setErrorMessage(
              "A network error occurred while verifying your password reset link."
            );
            setState("invalid");
          }
          return;
        }
      }

      // Check if Supabase redirected with a PKCE ?code= or ?token_hash= directly to /auth/reset-password
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (code) {
        window.location.replace(
          `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent("/auth/reset-password")}`
        );
        return;
      }
      if (tokenHash) {
        window.location.replace(
          `/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type || "recovery")}&next=${encodeURIComponent("/auth/reset-password")}`
        );
        return;
      }

      if (!cancelled) {
        if (queryError && queryError !== "invalid_link") {
          setErrorMessage(queryError.replace(/\+/g, " "));
        }
        setState("invalid");
      }
    }

    void verifyFromUrl();
    return () => {
      cancelled = true;
    };
  }, [initialHasSession]);

  if (state === "verifying") {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#174D32]" />
        <h1 className="mt-4 text-base font-bold text-[#25352B]">
          Verifying Password Reset Link...
        </h1>
        <p className="mt-1.5 text-xs text-slate-600">
          Please wait while we securely validate your recovery session.
        </p>
      </div>
    );
  }

  if (state === "ready") {
    return (
      <PasswordChangeForm
        mode="recovery"
        heading="Choose a New Password"
        description="Your recovery link has been verified. Enter a new password below to regain access to your RegistrarDocs AI account."
        submitLabel="Reset Password"
      />
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-md sm:p-8">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-[#25352B]">
        Reset Link Invalid or Expired
      </h1>
      <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
        {errorMessage}
      </p>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center rounded-lg bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#246B45]"
        >
          Request New Reset Link
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#25352B] hover:bg-slate-50"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
