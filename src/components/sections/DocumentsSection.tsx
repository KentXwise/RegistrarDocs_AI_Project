import { Info } from "lucide-react";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { DOCUMENT_EXAMPLES } from "@/lib/landing-data";

export function DocumentsSection() {
  return (
    <section
      id="documents"
      aria-labelledby="documents-heading"
      className="scroll-mt-20 bg-white py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            Document Information
          </p>
          <h2
            id="documents-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl"
          >
            Examples of Academic Documents
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            RegistrarDocs AI is being designed to support common academic record
            requests handled by the Registrar&apos;s Office. Below are
            illustrative examples of document types that may be offered through
            the portal.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DOCUMENT_EXAMPLES.map((doc) => (
            <article
              key={doc.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-2xs transition-all hover:border-[#246B45]/50 hover:shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E6EFE8] text-[#174D32]">
                <FeatureIcon name={doc.icon} className="h-5 w-5" />
              </span>

              <h3 className="mt-4 text-lg font-bold text-[#25352B]">
                {doc.title}
              </h3>

              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {doc.description}
              </p>

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
                {doc.note}
              </p>
            </article>
          ))}
        </div>

        <div
          role="note"
          className="mt-8 flex items-start gap-3 rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/60 p-4 sm:p-5"
        >
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-[#174D32]"
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-slate-700">
            <span className="font-semibold text-[#25352B]">
              Illustrative List Only:
            </span>{" "}
            The document categories shown above are examples for planning
            purposes. The finalized list of requestable documents, applicable
            fees, processing rules, and exact requirements must be confirmed by
            the Registrar&apos;s Office.
          </p>
        </div>
      </div>
    </section>
  );
}
