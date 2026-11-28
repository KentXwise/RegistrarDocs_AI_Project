import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { BENEFITS } from "@/lib/landing-data";

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      aria-labelledby="benefits-heading"
      className="scroll-mt-20 bg-white py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            Proposed Portal Benefits
          </p>
          <h2
            id="benefits-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl"
          >
            Designed for a Clearer Document Request Experience
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            RegistrarDocs AI is being developed to support a more organized and
            transparent experience for requesters and Registrar&apos;s Office
            personnel.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.id}
              className="rounded-xl border border-slate-200 bg-[#F5F5EF]/80 p-6 transition-colors hover:border-[#246B45]/40 hover:bg-[#E6EFE8]/60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#174D32] shadow-2xs ring-1 ring-slate-200/80">
                <FeatureIcon name={benefit.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-[#25352B]">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
