import Link from "next/link";
import { ClipboardList, FilePlus2, GraduationCap } from "lucide-react";
import type { SafeUser } from "@/types/auth";

interface RequesterWelcomeBannerProps {
  user: SafeUser;
}

export function RequesterWelcomeBanner({ user }: RequesterWelcomeBannerProps) {
  return (
    <section
      aria-labelledby="requester-welcome-heading"
      className="rounded-2xl border border-[#246B45]/20 bg-white p-6 shadow-xs sm:p-7"
    >
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-1 text-xs font-semibold text-[#174D32]">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Approved Requester
              {user.studentId ? ` · Student ID ${user.studentId}` : ""}
            </span>
          </div>

          <h1
            id="requester-welcome-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl"
          >
            Welcome back, {user.fullName}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            This is your centralized portal for requesting DNSC Registrar&apos;s
            Office academic documents, monitoring request progress, and viewing
            release updates.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row lg:shrink-0">
          <Link
            href="/dashboard/requester/request"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#174D32] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            <span>Request a Document</span>
          </Link>

          <Link
            href="/dashboard/requester/requests"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8]/70 hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
          >
            <ClipboardList className="h-4 w-4 text-[#174D32]" aria-hidden="true" />
            <span>Track My Requests</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
