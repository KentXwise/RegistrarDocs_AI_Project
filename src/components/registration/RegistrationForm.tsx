"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { StudentIdUploadField } from "@/components/registration/StudentIdUploadField";
import {
  MIN_PASSWORD_LENGTH,
  sanitizeStudentIdInput,
  validateConfirmPassword,
  validateDnscEmail,
  validateFullName,
  validatePassword,
  validatePrivacyAcknowledged,
  validateRegistrationForm,
  validateStudentId,
} from "@/lib/registration-validation";
import type {
  RegistrationFieldName,
  RegistrationFormErrors,
  RegistrationFormValues,
} from "@/types/registration";

const INITIAL_VALUES: RegistrationFormValues = {
  fullName: "",
  studentId: "",
  dnscEmail: "",
  studentIdImage: null,
  password: "",
  confirmPassword: "",
  privacyAcknowledged: false,
};

export function RegistrationForm() {
  const router = useRouter();
  const [values, setValues] = useState<RegistrationFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedAccount, setSubmittedAccount] = useState<{
    email: string;
    studentId: string;
  } | null>(null);
  const [redirectSeconds, setRedirectSeconds] = useState(3);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!submittedAccount) return;

    const countdownInterval = window.setInterval(() => {
      setRedirectSeconds((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const redirectTimer = window.setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => {
      window.clearInterval(countdownInterval);
      window.clearTimeout(redirectTimer);
    };
  }, [submittedAccount, router]);

  const fullNameRef = useRef<HTMLInputElement>(null);
  const studentIdRef = useRef<HTMLInputElement>(null);
  const dnscEmailRef = useRef<HTMLInputElement>(null);
  const studentIdImageTriggerRef = useRef<HTMLButtonElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const privacyRef = useRef<HTMLInputElement>(null);

  const revalidateFieldIfNeeded = (
    field: RegistrationFieldName,
    nextValues: RegistrationFormValues
  ) => {
    if (!hasSubmitted && !errors[field]) return;

    setErrors((prev) => {
      const updated = { ...prev };
      let nextError: string | undefined;

      switch (field) {
        case "fullName":
          nextError = validateFullName(nextValues.fullName);
          break;
        case "studentId":
          nextError = validateStudentId(nextValues.studentId);
          break;
        case "dnscEmail":
          nextError = validateDnscEmail(nextValues.dnscEmail);
          break;
        case "password":
          nextError = validatePassword(nextValues.password);
          if (hasSubmitted || prev.confirmPassword) {
            const confirmErr = validateConfirmPassword(
              nextValues.password,
              nextValues.confirmPassword
            );
            if (confirmErr) updated.confirmPassword = confirmErr;
            else delete updated.confirmPassword;
          }
          break;
        case "confirmPassword":
          nextError = validateConfirmPassword(
            nextValues.password,
            nextValues.confirmPassword
          );
          break;
        case "privacyAcknowledged":
          nextError = validatePrivacyAcknowledged(
            nextValues.privacyAcknowledged
          );
          break;
        default:
          break;
      }

      if (nextError) updated[field] = nextError;
      else delete updated[field];

      return updated;
    });
  };

  const handleTextChange = (
    field: "fullName" | "studentId" | "dnscEmail" | "password" | "confirmPassword",
    value: string
  ) => {
    if (submittedAccount) setSubmittedAccount(null);
    if (submitError) setSubmitError(null);
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    revalidateFieldIfNeeded(field, nextValues);
  };

  const handlePrivacyChange = (checked: boolean) => {
    if (submittedAccount) setSubmittedAccount(null);
    if (submitError) setSubmitError(null);
    const nextValues = { ...values, privacyAcknowledged: checked };
    setValues(nextValues);
    revalidateFieldIfNeeded("privacyAcknowledged", nextValues);
  };

  const handleStudentIdImageChange = (
    file: File | null,
    validationError?: string
  ) => {
    if (submittedAccount) setSubmittedAccount(null);
    if (submitError) setSubmitError(null);
    setValues((prev) => ({ ...prev, studentIdImage: file }));
    setErrors((prev) => {
      const updated = { ...prev };
      if (validationError) {
        updated.studentIdImage = validationError;
      } else if (!file && hasSubmitted) {
        updated.studentIdImage =
          "Please upload a clear photo of your DNSC Student ID.";
      } else {
        delete updated.studentIdImage;
      }
      return updated;
    });
  };

  const focusFirstInvalidField = (validationErrors: RegistrationFormErrors) => {
    if (validationErrors.fullName) {
      fullNameRef.current?.focus();
    } else if (validationErrors.studentId) {
      studentIdRef.current?.focus();
    } else if (validationErrors.dnscEmail) {
      dnscEmailRef.current?.focus();
    } else if (validationErrors.studentIdImage) {
      studentIdImageTriggerRef.current?.focus();
    } else if (validationErrors.password) {
      passwordRef.current?.focus();
    } else if (validationErrors.confirmPassword) {
      confirmPasswordRef.current?.focus();
    } else if (validationErrors.privacyAcknowledged) {
      privacyRef.current?.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);
    setSubmitError(null);

    const validationErrors = validateRegistrationForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSubmittedAccount(null);
      focusFirstInvalidField(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("fullName", values.fullName.trim());
      formData.append("studentId", values.studentId.trim());
      formData.append("dnscEmail", values.dnscEmail.trim());
      formData.append("password", values.password);
      formData.append("confirmPassword", values.confirmPassword);
      formData.append(
        "privacyAcknowledged",
        String(values.privacyAcknowledged)
      );
      if (values.studentIdImage) {
        formData.append("studentIdImage", values.studentIdImage);
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        fieldErrors?: RegistrationFormErrors;
        user?: { email?: string; studentId?: string };
      } | null;

      if (!response.ok) {
        if (payload?.fieldErrors) {
          setErrors(payload.fieldErrors);
          focusFirstInvalidField(payload.fieldErrors);
        }
        setSubmitError(
          payload?.error ||
            "Unable to submit your registration. Please review your details and try again."
        );
        setSubmittedAccount(null);
        return;
      }

      setRedirectSeconds(3);
      setSubmittedAccount({
        email: payload?.user?.email ?? values.dnscEmail.trim(),
        studentId: payload?.user?.studentId ?? values.studentId.trim(),
      });
      setValues(INITIAL_VALUES);
      setErrors({});
      setHasSubmitted(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch {
      setSubmitError(
        "A network error occurred while submitting your registration. Please check your connection and try again."
      );
      setSubmittedAccount(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClass =
    "mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#25352B] placeholder:text-slate-400 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0";

  const getInputBorderClass = (hasError: boolean) =>
    hasError
      ? "border-red-500 focus:border-red-600 focus:ring-red-200"
      : "border-slate-300 hover:border-slate-400 focus:border-[#174D32] focus:ring-[#246B45]/25";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Register for a RegistrarDocs AI requester account. All new
          registrations require administrator verification and approval before
          portal access is granted.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-red-700"
            aria-hidden="true"
          />
          <span>{submitError}</span>
        </div>
      )}

      {submittedAccount && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-success-title"
          aria-describedby="registration-success-description"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#25352B]/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E6EFE8] text-[#174D32]">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>

            <span className="mt-4 inline-block rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-0.5 text-[11px] font-bold tracking-wide text-[#174D32] uppercase">
              Status: Pending Approval
            </span>

            <h2
              id="registration-success-title"
              className="mt-3 text-xl font-bold tracking-tight text-[#25352B] sm:text-2xl"
            >
              Registration Submitted Successfully
            </h2>

            <p
              id="registration-success-description"
              className="mt-2 text-sm leading-relaxed text-slate-600"
            >
              Your registration has been submitted. Please wait for
              administrator approval before signing in to your account.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-[#F5F5EF] px-4 py-3 text-left text-xs text-slate-700">
              <p>
                <strong className="font-semibold text-[#25352B]">
                  Student ID:
                </strong>{" "}
                {submittedAccount.studentId}
              </p>
              <p className="mt-1 truncate">
                <strong className="font-semibold text-[#25352B]">
                  DNSC Email:
                </strong>{" "}
                {submittedAccount.email}
              </p>
            </div>

            <p
              role="status"
              aria-live="polite"
              className="mt-4 text-xs font-medium text-[#174D32]"
            >
              Redirecting to the login page in {redirectSeconds}{" "}
              {redirectSeconds === 1 ? "second" : "seconds"}...
            </p>

            <div className="mt-5">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#174D32] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
              >
                Go to Login Now
              </Link>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        {/* Full Name */}
        <div>
          <label
            htmlFor="full-name"
            className="block text-sm font-semibold text-[#25352B]"
          >
            Full Name <span className="text-red-700">*</span>
          </label>
          <input
            ref={fullNameRef}
            id="full-name"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            value={values.fullName}
            onChange={(e) => handleTextChange("fullName", e.target.value)}
            placeholder="e.g., Juan Dela Cruz"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "full-name-error" : undefined}
            className={`${inputBaseClass} ${getInputBorderClass(Boolean(errors.fullName))}`}
          />
          {errors.fullName && (
            <p
              id="full-name-error"
              role="alert"
              className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
            >
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{errors.fullName}</span>
            </p>
          )}
        </div>

        {/* Student ID Number */}
        <div>
          <label
            htmlFor="student-id"
            className="block text-sm font-semibold text-[#25352B]"
          >
            Student ID Number <span className="text-red-700">*</span>
          </label>
          <input
            ref={studentIdRef}
            id="student-id"
            name="studentId"
            type="text"
            inputMode="text"
            autoComplete="username"
            required
            value={values.studentId}
            onKeyDown={(e) => {
              if (
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey &&
                e.key.length === 1 &&
                !/^[0-9-]$/.test(e.key)
              ) {
                e.preventDefault();
              }
            }}
            onChange={(e) =>
              handleTextChange("studentId", sanitizeStudentIdInput(e.target.value))
            }
            placeholder="e.g., 2021-00440"
            aria-invalid={Boolean(errors.studentId)}
            aria-describedby={
              errors.studentId
                ? "student-id-hint student-id-error"
                : "student-id-hint"
            }
            className={`${inputBaseClass} ${getInputBorderClass(Boolean(errors.studentId))}`}
          />
          <p id="student-id-hint" className="mt-1.5 text-xs text-slate-500">
            Example format: <span className="font-medium text-slate-700">2021-00440</span>.
            This will serve as your primary login identifier once accounts are
            active.
          </p>
          {errors.studentId && (
            <p
              id="student-id-error"
              role="alert"
              className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
            >
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{errors.studentId}</span>
            </p>
          )}
        </div>

        {/* DNSC Email Account */}
        <div>
          <label
            htmlFor="dnsc-email"
            className="block text-sm font-semibold text-[#25352B]"
          >
            DNSC Email Account <span className="text-red-700">*</span>
          </label>
          <input
            ref={dnscEmailRef}
            id="dnsc-email"
            name="dnscEmail"
            type="email"
            autoComplete="email"
            required
            value={values.dnscEmail}
            onChange={(e) => handleTextChange("dnscEmail", e.target.value)}
            placeholder="Enter your DNSC institutional email"
            aria-invalid={Boolean(errors.dnscEmail)}
            aria-describedby={
              errors.dnscEmail
                ? "dnsc-email-hint dnsc-email-error"
                : "dnsc-email-hint"
            }
            className={`${inputBaseClass} ${getInputBorderClass(Boolean(errors.dnscEmail))}`}
          />
          <p id="dnsc-email-hint" className="mt-1.5 text-xs text-slate-500">
            Used for account approval, correction requests, and document status
            email notifications (not used as your login username).
          </p>
          {errors.dnscEmail && (
            <p
              id="dnsc-email-error"
              role="alert"
              className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
            >
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{errors.dnscEmail}</span>
            </p>
          )}
        </div>

        {/* Student ID Image Upload */}
        <StudentIdUploadField
          file={values.studentIdImage}
          error={errors.studentIdImage}
          onFileChange={handleStudentIdImageChange}
          triggerRef={studentIdImageTriggerRef}
        />

        {/* Password & Confirm Password */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-[#25352B]"
            >
              Password <span className="text-red-700">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={values.password}
                onChange={(e) => handleTextChange("password", e.target.value)}
                placeholder="At least 8 characters"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password
                    ? "password-hint password-error"
                    : "password-hint"
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
            <p id="password-hint" className="mt-1.5 text-xs text-slate-500">
              Minimum {MIN_PASSWORD_LENGTH} characters.
            </p>
            {errors.password && (
              <p
                id="password-error"
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

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-semibold text-[#25352B]"
            >
              Confirm Password <span className="text-red-700">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                ref={confirmPasswordRef}
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={values.confirmPassword}
                onChange={(e) =>
                  handleTextChange("confirmPassword", e.target.value)
                }
                placeholder="Re-enter your password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? "confirm-password-error" : undefined
                }
                className={`block w-full rounded-lg border bg-white py-2.5 pr-11 pl-3.5 text-sm text-[#25352B] placeholder:text-slate-400 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${getInputBorderClass(Boolean(errors.confirmPassword))}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-lg px-3 text-slate-500 transition-colors hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                id="confirm-password-error"
                role="alert"
                className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{errors.confirmPassword}</span>
              </p>
            )}
          </div>
        </div>

        {/* Privacy Acknowledgment */}
        <div className="rounded-xl border border-slate-200 bg-[#F5F5EF]/70 p-4">
          <div className="flex items-start gap-3">
            <input
              ref={privacyRef}
              id="privacy-acknowledged"
              name="privacyAcknowledged"
              type="checkbox"
              checked={values.privacyAcknowledged}
              onChange={(e) => handlePrivacyChange(e.target.checked)}
              aria-invalid={Boolean(errors.privacyAcknowledged)}
              aria-describedby={
                errors.privacyAcknowledged ? "privacy-error" : undefined
              }
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
            />
            <label
              htmlFor="privacy-acknowledged"
              className="text-xs leading-relaxed text-slate-700 sm:text-sm"
            >
              I acknowledge that the information I provide will be used for
              account registration, verification, and document-request services.{" "}
              <span className="text-red-700">*</span>
            </label>
          </div>
          {errors.privacyAcknowledged && (
            <p
              id="privacy-error"
              role="alert"
              className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-700"
            >
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{errors.privacyAcknowledged}</span>
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
            {isSubmitting
              ? "Submitting Registration..."
              : "Submit Registration for Approval"}
          </button>
        </div>

        <p className="pt-1 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#174D32] underline-offset-2 hover:text-[#246B45] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
          >
            Go to Login
          </Link>
        </p>
      </form>
    </div>
  );
}
