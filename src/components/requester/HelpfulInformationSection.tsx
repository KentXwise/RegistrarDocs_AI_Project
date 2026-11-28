import Link from "next/link";
import {
  Building2,
  ClipboardCheck,
  FileSearch,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

const INFO_ITEMS = [
  {
    title: "Document Request Instructions",
    description:
      "Review available document types and requirements, submit a request to receive a reference number, and monitor status updates from review through release.",
    icon: FileSearch,
  },
  {
    title: "Requirements Reminders",
    description:
      "Prepare clearances and supporting documents before applying. Official document lists, fees, and specific eligibility rules must be confirmed by the Registrar's Office.",
    icon: ClipboardCheck,
  },
  {
    title: "Collection & Release Verification",
    description:
      "When your document is marked Ready for Release, bring valid identification. Registrar Staff perform identity verification and officially record document release.",
    icon: ShieldCheck,
  },
] as const;

export function HelpfulInformationSection() {
  return (
    <section
      aria-labelledby="helpful-info-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2
            id="helpful-info-heading"
            className="text-base font-bold text-[#25352B]"
          >
            Helpful Information
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Key reminders for requesting and claiming academic records at DNSC.
          </p>
        </div>

        <Link
          href="/dashboard/requester/help"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F5F5EF] px-3 py-1.5 text-xs font-semibold text-[#174D32] transition-colors hover:border-[#174D32]/40 hover:bg-[#E6EFE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>FAQs &amp; Help</span>
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {INFO_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200/80 bg-[#F5F5EF]/70 p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#174D32] shadow-2xs ring-1 ring-slate-200/80">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-bold text-[#25352B]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Registrar Contact Information Placeholder */}
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#246B45]/20 bg-[#E6EFE8]/50 p-4">
        <Building2
          className="mt-0.5 h-5 w-5 shrink-0 text-[#174D32]"
          aria-hidden="true"
        />
        <div className="text-xs leading-relaxed text-slate-700">
          <p className="font-semibold text-[#25352B]">
            Registrar&apos;s Office Contact Information — Davao del Norte State
            College (DNSC)
          </p>
          <p className="mt-1">
            Official Registrar&apos;s Office email addresses, telephone numbers,
            window hours, and verified support channels will be published here
            once confirmed by the institution.
          </p>
        </div>
      </div>
    </section>
  );
}
