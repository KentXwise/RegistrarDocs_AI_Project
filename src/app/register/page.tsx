import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { RegistrationInfoPanel } from "@/components/registration/RegistrationInfoPanel";

export const metadata: Metadata = {
  title: "Create Your Account | RegistrarDocs AI",
  description:
    "Register for a RegistrarDocs AI requester account for Davao del Norte State College (DNSC). Accounts require administrator verification and approval.",
};

export default function RegisterPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5EF]">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] sm:inline-flex"
            >
              Login
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
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      >
        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <RegistrationForm />
          </div>
          <div className="lg:col-span-5">
            <RegistrationInfoPanel />
          </div>
        </div>
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
