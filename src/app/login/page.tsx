import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { LoginForm } from "@/components/login/LoginForm";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/types/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In | RegistrarDocs AI",
  description:
    "Sign in to your RegistrarDocs AI account using your email or Student ID and password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect(
      user.mustChangePassword
        ? "/auth/change-password"
        : getDashboardPathForRole(user.role)
    );
  }

  const params = await searchParams;
  const resetSuccess = params.reset === "success";
  const authError = params.error;
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5EF]">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] sm:inline-flex"
            >
              Create Account
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#174D32]/40 hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      >
        {resetSuccess && (
          <div
            role="status"
            className="w-full max-w-md rounded-xl border border-[#246B45]/30 bg-[#E6EFE8] px-4 py-3 text-xs font-semibold text-[#174D32] shadow-2xs"
          >
            Your password has been reset successfully. Please sign in with your
            new password.
          </div>
        )}
        {authError && (
          <div
            role="alert"
            className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 shadow-2xs"
          >
            {authError === "auth_callback_failed"
              ? "Your sign-in link is invalid or has expired. Please sign in normally or request a new link."
              : "Your account is not eligible to sign in right now. Please contact the Registrar's Office."}
          </div>
        )}
        <LoginForm />
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {currentYear} RegistrarDocs AI. All rights reserved.</p>
          <p>Pilot Institution: Davao del Norte State College (DNSC)</p>
        </div>
      </footer>
    </div>
  );
}
