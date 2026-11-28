import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordClient } from "@/components/auth/ResetPasswordClient";
import { BrandMark } from "@/components/ui/BrandMark";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set New Password | RegistrarDocs AI",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialHasSession = Boolean(user) && params.error !== "invalid_link";

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5EF]">
      <header className="border-b border-slate-200/90 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[#E6EFE8] hover:text-[#174D32]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <ResetPasswordClient
          initialHasSession={initialHasSession}
          initialError={
            params.error === "invalid_link"
              ? "This password reset link is invalid, expired, or has already been used. Please request a fresh password reset link to continue."
              : null
          }
        />
      </main>
    </div>
  );
}
