import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { BrandMark } from "@/components/ui/BrandMark";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/types/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Change Temporary Password | RegistrarDocs AI",
};

export default async function ChangePasswordPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.mustChangePassword) {
    redirect(getDashboardPathForRole(user.role));
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5EF]">
      <header className="border-b border-slate-200/90 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <span className="text-xs font-semibold text-[#174D32]">
            First-Login Security Step
          </span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <PasswordChangeForm
          mode="first_login"
          heading="Set Your New Password"
          description={`Welcome, ${user.fullName}. For security, please replace your temporary password before accessing the RegistrarDocs AI portal.`}
          submitLabel="Update Password & Continue"
        />
      </main>
    </div>
  );
}
