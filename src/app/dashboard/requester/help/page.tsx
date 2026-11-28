import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";
import { listPublishedFaqsForRequester } from "@/lib/db/admin-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FAQs & Help | RegistrarDocs AI",
  description:
    "Frequently asked questions and guidance for DNSC RegistrarDocs AI requesters.",
};

export default async function RequesterHelpPage() {
  const faqs = await listPublishedFaqsForRequester();

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-1 text-xs font-semibold text-[#174D32]">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Requester Support</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#25352B]">
          FAQs &amp; Help
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          General guidance about RegistrarDocs AI and the document request
          workflow. Official policies, fees, and document requirements must
          always be confirmed by the DNSC Registrar&apos;s Office.
        </p>

        <dl className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {faqs.map((item) => (
            <div key={item.id} className="p-4 sm:p-5">
              <dt className="text-sm font-bold text-[#25352B]">
                {item.question}
              </dt>
              <dd className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-600 sm:text-sm">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
