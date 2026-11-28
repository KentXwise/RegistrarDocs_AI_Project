"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Info,
  ShieldCheck,
} from "lucide-react";
import {
  validateLoginForm,
  validateLoginIdentifier,
  validateLoginPassword,
} from "@/lib/login-validation";
import type { AuthErrorCode } from "@/types/auth";
import type {
  LoginFieldName,
  LoginFormErrors,
  LoginFormValues,
} from "@/types/login";

const INITIAL_VALUES: LoginFormValues = {
  identifier: "",
  password: "",
};

const STATUS_NOTICE_CODES: readonly AuthErrorCode[] = [
  "ACCOUNT_PENDING_APPROVAL",
  "ACCOUNT_NEEDS_CORRECTION",
  "ACCOUNT_INVITATION_PENDING",
];

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverFeedback, setServerFeedback] = useState<{
    message: string;
    code?: AuthErrorCode;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const revalidateFieldIfNeeded = (
    field: LoginFieldName,
    nextValues: LoginFormValues
  ) => {
    if (!hasSubmitted && !errors[field]) return;

    setErrors((prev) => {
      const updated = { ...prev };
      const nextError =
        field === "identifier"
          ? validateLoginIdentifier(nextValues.identifier)
          : validateLoginPassword(nextValues.password);

      if (nextError) updated[field] = nextError;
      else delete updated[field];

      return updated;
    });
  };

  const handleFieldChange = (field: LoginFieldName, value: string) => {
    if (serverFeedback) setServerFeedback(null);
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    revalidateFieldIfNeeded(field, nextValues);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);
    setServerFeedback(null);

    const normalizedValues: LoginFormValues = {
      ...values,
      identifier: values.identifier.trim(),
    };
    if (normalizedValues.identifier !== values.identifier) {
      setValues(normalizedValues);
    }

    const validationErrors = validateLoginForm(normalizedValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.identifier) {
        identifierRef.current?.focus();
      } else if (validationErrors.password) {
        passwordRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: normalizedValues.identifier,
          password: normalizedValues.password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        code?: AuthErrorCode;
        fieldErrors?: LoginFormErrors;
        redirectTo?: string;
      } | null;

      if (!response.ok) {
        if (payload?.fieldErrors) {
          setErrors(payload.fieldErrors);
        }
        setServerFeedback({
          message:
            payload?.error ||
            "Unable to sign in right now. Please check your credentials and try again.",
          code: payload?.code,
        });
        return;
      }

      const destination = payload?.redirectTo || "/dashboard";
      router.push(destination);
      router.refresh();
    } catch {
      setServerFeedback({
        message:
          "A network error occurred while signing in. Please check your connection and try again.",
        code: "SERVER_ERROR",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputBorderClass = (hasError: boolean) =>
    hasError
      ? "border-red-500 focus:border-red-600 focus:ring-red-200"
      : "border-slate-300 hover:border-slate-400 focus:border-[#174D32] focus:ring-[#246B45]/25";

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl">
          Welcome Back
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Sign in to your RegistrarDocs AI account.
        </p>
      </div>

      {serverFeedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`mt-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            serverFeedback.code &&
            STATUS_NOTICE_CODES.includes(serverFeedback.code)
              ? "border-[#246B45]/30 bg-[#E6EFE8]/75 text-[#25352B]"
              : "border-red-200 bg-red-50/80 text-red-800"
          }`}
        >
          {serverFeedback.code &&
          STATUS_NOTICE_CODES.includes(serverFeedback.code) ? (
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-700"
              aria-hidden="true"
            />
          )}
          <span className="leading-relaxed">{serverFeedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        {/* Email or Student ID */}
        <div>
          <label
            htmlFor="login-identifier"
            className="block text-sm font-semibold text-[#25352B]"
          >
            Email or Student ID <span className="text-red-700">*</span>
          </label>
          <input
            ref={identifierRef}
            id="login-identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            value={values.identifier}
            onChange={(e) => handleFieldChange("identifier", e.target.value)}
            placeholder="Enter your email or Student ID"
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={
              errors.identifier
                ? "login-identifier-hint login-identifier-error"
                : "login-identifier-hint"
            }
            className={`mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#25352B] placeholder:text-slate-400 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${getInputBorderClass(Boolean(errors.identifier))}`}
          />
          <p
            id="login-identifier-hint"
            className="mt-1.5 text-xs text-slate-500"
          >
            Sign in with your Student ID (e.g., 2021-00440) or institutional
            email address.
          </p>
          {errors.identifier && (
            <p
              id="login-identifier-error"
              role="alert"
              className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
            >
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{errors.identifier}</span>
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold text-[#25352B]"
            >
              Password <span className="text-red-700">*</span>
            </label>
            <Link
              href="/forgot-password"
              className="rounded text-xs font-semibold text-[#174D32] underline-offset-2 transition-colors hover:text-[#246B45] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="relative mt-1.5">
            <input
              ref={passwordRef}
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={values.password}
              onChange={(e) => handleFieldChange("password", e.target.value)}
              placeholder="Enter your password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              className={`block w-full rounded-lg border bg-white py-2.5 pr-11 pl-3.5 text-sm text-[#25352B] placeholder:text-slate-400 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${getInputBorderClass(Boolean(errors.password))}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-lg px-3 text-slate-500 transition-colors hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {errors.password && (
            <p
              id="login-password-error"
              role="alert"
              className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
            >
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{errors.password}</span>
            </p>
          )}
        </div>

        {/* Submit CTA */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#174D32] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
        </div>

        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#174D32] underline-offset-2 hover:text-[#246B45] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
          >
            Create Account
          </Link>
        </p>
      </form>

      {/* Account approval informational note */}
      <div className="mt-6 rounded-xl border border-[#246B45]/20 bg-[#E6EFE8]/55 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-slate-700">
            <strong className="font-semibold text-[#25352B]">
              Account Approval Required:
            </strong>{" "}
            New registrations require administrator review and approval before
            requester portal access is enabled. Approval updates will be sent to
            your DNSC email account.
          </p>
        </div>
      </div>
    </div>
  );
}
