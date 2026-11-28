import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";

interface AuthPlaceholderViewProps {
  badge: string;
  title: string;
  description: string;
  milestoneNote: string;
  alternateLabel: string;
  alternateHref: string;
  alternatePrompt: string;
}

export function AuthPlaceholderView({
  badge,
  title,
  description,
  milestoneNote,
  alternateLabel,
  alternateHref,
  alternatePrompt,
}: AuthPlaceholderViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5EF]">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3.5 py-1 text-xs font-semibold text-[#174D32]">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{badge}</span>
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl">
            {title}
          </h1>

          <p className="mt-3 text-base leading-relaxed text-slate-600">
            {description}
          </p>

          <div className="mt-6 rounded-xl border border-[#E6EFE8] bg-[#F5F5EF]/80 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#174D32] text-white">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[#25352B]">
                  Development Status — Milestone 1
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {milestoneNote}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#174D32] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Return to Homepage</span>
            </Link>
            <Link
              href={alternateHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8]/60 hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
            >
              <span>{alternateLabel}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            {alternatePrompt}{" "}
            <Link
              href={alternateHref}
              className="font-semibold text-[#174D32] underline-offset-2 hover:text-[#246B45] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
            >
              {alternateLabel}
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-5">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          RegistrarDocs AI &middot; Pilot Institution: Davao del Norte State College (DNSC)
        </div>
      </footer>
    </div>
  );
}
