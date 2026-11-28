import Link from "next/link";
import { Clock } from "lucide-react";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { WORKFLOW_STEPS } from "@/lib/landing-data";

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-20 border-y border-slate-200/80 bg-[#F5F5EF] py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            How It Works
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl"
          >
            A Clear, Four-Step Request Workflow
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Here is an overview of the intended document request and release
            journey being built for students, alumni, and Registrar&apos;s
            Office staff.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map((step) => (
            <li
              key={step.number}
              className="relative flex flex-col rounded-xl border border-slate-200/90 bg-white p-6 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#174D32] text-white">
                  <FeatureIcon name={step.icon} className="h-5 w-5" />
                </span>
                <span className="font-[family-name:var(--font-plus-jakarta)] text-sm font-bold text-[#246B45]">
                  Step {step.number}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold text-[#25352B]">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        {/* Informational notice for Track a Request CTA */}
        <div
          id="tracking-info"
          className="mt-10 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6"
        >
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6EFE8] text-[#174D32]">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#25352B]">
                Request Submission &amp; Tracking Coming in Upcoming Milestones
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Live request tracking and online submission are not active yet.
                These capabilities will be enabled after user accounts and
                request management are implemented in the next development
                milestones.
              </p>
            </div>
          </div>

          <div className="mt-4 shrink-0 sm:mt-0">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8]/60 hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
            >
              View Account Status
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
