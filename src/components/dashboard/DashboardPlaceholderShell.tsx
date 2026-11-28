import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import type { SafeUser } from "@/types/auth";

interface DashboardPlaceholderShellProps {
  user: SafeUser;
  roleLabel: string;
  dashboardTitle: string;
  description: string;
}

export function DashboardPlaceholderShell({
  user,
  roleLabel,
  dashboardTitle,
  description,
}: DashboardPlaceholderShellProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5EF]">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-1 text-xs font-semibold text-[#174D32] sm:inline-flex">
              {roleLabel}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3.5 py-1 text-xs font-semibold text-[#174D32]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Authenticated &middot; {roleLabel}</span>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl">
            {dashboardTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {description}
          </p>

          <dl className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-[#F5F5EF]/75 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Full Name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#25352B]">
                {user.fullName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Email Address
              </dt>
              <dd className="mt-1 text-sm font-medium text-[#25352B]">
                {user.email}
              </dd>
            </div>
            {user.studentId && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Student ID Number
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#25352B]">
                  {user.studentId}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Assigned Role &amp; Status
              </dt>
              <dd className="mt-1 text-sm font-medium text-[#174D32]">
                {user.role} &middot; {user.status}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500">
            <span>
              Milestone 4 Foundation: Role-based dashboard features will be
              implemented in upcoming milestones.
            </span>
            <Link
              href="/"
              className="font-semibold text-[#174D32] underline-offset-2 hover:text-[#246B45] hover:underline"
            >
              Return to Public Homepage
            </Link>
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
