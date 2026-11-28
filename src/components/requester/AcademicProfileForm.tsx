"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Save,
} from "lucide-react";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import {
  DNSC_INSTITUTES,
  getProgramsForInstitute,
} from "@/lib/dnsc/academic-programs";

interface AcademicProfileFormProps {
  initialInstitute: string | null;
  initialProgram: string | null;
}

const INSTITUTE_OPTIONS = DNSC_INSTITUTES.map((inst) => inst.name);

export function AcademicProfileForm({
  initialInstitute,
  initialProgram,
}: AcademicProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToRaw = searchParams.get("returnTo");
  const safeReturnTo =
    returnToRaw && returnToRaw.startsWith("/dashboard/requester")
      ? returnToRaw
      : null;

  const [institute, setInstitute] = useState(initialInstitute ?? "");
  const [program, setProgram] = useState(initialProgram ?? "");
  const [savedInstitute, setSavedInstitute] = useState(initialInstitute ?? "");
  const [savedProgram, setSavedProgram] = useState(initialProgram ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const availablePrograms = useMemo(
    () => getProgramsForInstitute(institute),
    [institute]
  );

  const isDirty = institute !== savedInstitute || program !== savedProgram;

  const handleInstituteChange = (nextInstitute: string) => {
    setInstitute(nextInstitute);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.institute;
      return next;
    });

    // Clear previously selected Program if it does not belong to the newly selected Institute
    const nextPrograms = getProgramsForInstitute(nextInstitute);
    if (!nextPrograms.includes(program)) {
      setProgram("");
    }
  };

  const handleProgramChange = (nextProgram: string) => {
    setProgram(nextProgram);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.program;
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const nextErrors: Record<string, string> = {};
    if (!institute) {
      nextErrors.institute = "Please select your DNSC Institute.";
    }
    if (!program) {
      nextErrors.program = "Please select your academic Program.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/requester/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institute, program }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        fieldErrors?: Record<string, string>;
        profile?: { institute: string | null; program: string | null };
      } | null;

      if (!res.ok || !data?.profile) {
        if (data?.fieldErrors) setFieldErrors(data.fieldErrors);
        setErrorMessage(
          data?.error || "Unable to save your academic information right now."
        );
        return;
      }

      const nextInst = data.profile.institute ?? "";
      const nextProg = data.profile.program ?? "";
      setInstitute(nextInst);
      setProgram(nextProg);
      setSavedInstitute(nextInst);
      setSavedProgram(nextProg);
      setFieldErrors({});
      setSuccessMessage(
        "Your academic profile has been saved and will automatically be reused across applicable document requests."
      );
      router.refresh();
    } catch {
      setErrorMessage(
        "A network error occurred while saving your profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      id="academic-profile"
      aria-labelledby="academic-profile-heading"
      className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6EFE8] text-[#174D32]">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="academic-profile-heading"
              className="text-lg font-bold tracking-tight text-[#25352B]"
            >
              Academic Information
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Select your DNSC Institute and Program once. These verified
              details are automatically reused across all applicable document
              requests so you do not have to retype them.
            </p>
          </div>
        </div>

        {safeReturnTo && (
          <Link
            href={safeReturnTo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#174D32]/30 bg-[#E6EFE8] px-3 py-2 text-xs font-semibold text-[#174D32] transition-colors hover:bg-[#174D32] hover:text-white"
          >
            <span>Return to Document Request</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#246B45]/30 bg-[#E6EFE8]/75 p-3.5 text-xs text-[#174D32]"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
            <span className="font-medium">{successMessage}</span>
          </div>
          {safeReturnTo && (
            <Link
              href={safeReturnTo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#174D32] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#246B45]"
            >
              <span>Continue Document Request</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <SearchableCombobox
            id="profile-institute"
            label="Institute"
            required
            options={INSTITUTE_OPTIONS}
            value={institute}
            onChange={handleInstituteChange}
            placeholder="Select your DNSC Institute"
            searchPlaceholder="Search DNSC institutes (e.g., IC, IAAS, IBPA, ITED)..."
            emptyMessage="No matching DNSC institute found."
            error={fieldErrors.institute}
          />

          <SearchableCombobox
            id="profile-program"
            label="Program"
            required
            options={availablePrograms}
            value={program}
            onChange={handleProgramChange}
            placeholder={
              institute
                ? "Select your academic Program"
                : "Select an Institute first"
            }
            searchPlaceholder="Search programs under selected Institute..."
            disabled={!institute}
            disabledHint="Please select your Institute first to view its available Programs."
            emptyMessage="No matching programs available for the selected Institute."
            error={fieldErrors.program}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Options reflect official DNSC Institutes and Program Offerings.
          </p>
          <button
            type="submit"
            disabled={isSaving || (!isDirty && Boolean(savedInstitute && savedProgram))}
            className="inline-flex items-center gap-2 rounded-lg bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {isSaving ? "Saving..." : "Save Academic Information"}
            </span>
          </button>
        </div>
      </form>
    </section>
  );
}
