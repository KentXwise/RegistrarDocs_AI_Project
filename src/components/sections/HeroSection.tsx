import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  SearchCheck,
} from "lucide-react";

const PREVIEW_STAGES = [
  {
    label: "Request Submitted",
    detail: "Online request logged with document details",
    status: "complete",
  },
  {
    label: "Requirements Verification",
    detail: "Registrar's Office reviews eligibility & clearances",
    status: "active",
  },
  {
    label: "Ready for Release",
    detail: "Collection schedule & instructions provided",
    status: "upcoming",
  },
] as const;

export function HeroSection() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-slate-200/80 bg-[#174D32] py-16 sm:py-20 lg:py-24"
    >
      {/* Campus Background Image */}
      <Image
        src="/images/dnsc-hero-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* DNSC Forest Green Gradient Overlay for crisp text contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#174D32]/90 via-[#174D32]/75 to-[#25352B]/60"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left column: headline, copy, CTAs */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#25352B] shadow-xs backdrop-blur-xs">
              <GraduationCap
                className="h-4 w-4 text-[#174D32]"
                aria-hidden="true"
              />
              <span>Pilot Institution: Davao del Norte State College (DNSC)</span>
            </div>

            <h1
              id="hero-heading"
              className="mt-6 text-3xl font-extrabold tracking-tight text-white drop-shadow-xs sm:text-4xl lg:text-5xl lg:leading-[1.12]"
            >
              Your school documents, made easier.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#E6EFE8] sm:text-lg">
              Request academic documents, review requirements, and keep track of
              your requests&mdash;all in one convenient portal.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-[#174D32] shadow-sm transition-colors hover:bg-[#E6EFE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#174D32] sm:text-base"
              >
                <span>Request a Document</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <a
                href="#tracking-info"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 bg-[#174D32]/55 px-6 py-3.5 text-sm font-semibold text-white shadow-2xs backdrop-blur-xs transition-colors hover:border-white hover:bg-[#246B45]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#174D32] sm:text-base"
              >
                <SearchCheck className="h-4 w-4 text-[#E6EFE8]" aria-hidden="true" />
                <span>Track a Request</span>
              </a>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-white/80">
              Note: Account registration, online request submission, and live
              request tracking are scheduled for upcoming development
              milestones.
            </p>
          </div>

          {/* Right column: institutional portal preview UI card */}
          <div className="lg:col-span-6">
            <div
              aria-label="Illustrative preview of the planned RegistrarDocs AI portal interface"
              className="rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-xs sm:p-6"
            >
              {/* Mock window header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#174D32] text-white">
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#25352B]">
                      Request Progress Overview
                    </p>
                    <p className="text-xs text-slate-500">
                      Illustrative Portal Preview
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-2.5 py-1 text-[11px] font-semibold text-[#174D32]">
                  Planned View
                </span>
              </div>

              {/* Sample document summary card */}
              <div className="mt-4 rounded-xl border border-[#E6EFE8] bg-[#F5F5EF] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#174D32] shadow-2xs">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#25352B]">
                        Transcript of Records (Example)
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Clearance &amp; requirement checklist attached
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#E6EFE8] px-2 py-1 text-[11px] font-semibold text-[#174D32]">
                    In Review
                  </span>
                </div>
              </div>

              {/* Planned status stages */}
              <ol className="mt-5 space-y-3.5">
                {PREVIEW_STAGES.map((stage) => (
                  <li
                    key={stage.label}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5"
                  >
                    {stage.status === "complete" && (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#174D32]"
                        aria-hidden="true"
                      />
                    )}
                    {stage.status === "active" && (
                      <Clock
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#246B45]"
                        aria-hidden="true"
                      />
                    )}
                    {stage.status === "upcoming" && (
                      <span
                        className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-slate-300"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#25352B]">
                        {stage.label}
                      </p>
                      <p className="text-xs text-slate-500">{stage.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Footer strip */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-500">
                <span>Registrar&apos;s Office Document Workflow</span>
                <span className="font-medium text-[#174D32]">
                  Visual Concept Only
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
