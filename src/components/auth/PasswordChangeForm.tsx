"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
} from "lucide-react";

interface PasswordChangeFormProps {
  mode: "first_login" | "recovery";
  heading: string;
  description: string;
  submitLabel: string;
}

export function PasswordChangeForm({
  mode,
  heading,
  description,
  submitLabel,
}: PasswordChangeFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setError(
        "Password must include at least one uppercase letter, one lowercase letter, and one number."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
          mode,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to update your password right now.");
        return;
      }

      setSuccess(
        mode === "recovery"
          ? "Your password has been reset successfully. Redirecting to Sign In..."
          : "Your password has been updated. Redirecting to your dashboard..."
      );
      router.push(data.redirectTo || "/login");
      router.refresh();
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
        <KeyRound className="h-5 w-5" aria-hidden="true" />
      </div>

      <h1 className="mt-4 text-xl font-bold tracking-tight text-[#25352B] sm:text-2xl">
        {heading}
      </h1>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
        {description}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="new-password"
            className="block text-xs font-semibold text-[#25352B]"
          >
            New Password <span className="text-red-700">*</span>
          </label>
          <div className="relative mt-1.5">
            <input
              id="new-password"
              type={showNew ? "text" : "password"}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a strong new password"
              className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-500 hover:text-[#174D32]"
            >
              {showNew ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            At least 8 characters with uppercase, lowercase, and a number.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-xs font-semibold text-[#25352B]"
          >
            Confirm New Password <span className="text-red-700">*</span>
          </label>
          <div className="relative mt-1.5">
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-[#25352B] focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-500 hover:text-[#174D32]"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-[#246B45]/30 bg-[#E6EFE8] p-3 text-xs text-[#25352B]"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#174D32] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{isSubmitting ? "Updating Password..." : submitLabel}</span>
        </button>
      </form>
    </div>
  );
}
