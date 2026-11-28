"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/landing-data";

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  const toggleItem = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <section
      id="faqs"
      aria-labelledby="faqs-heading"
      className="scroll-mt-20 border-t border-slate-200/80 bg-[#F5F5EF] py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-bold tracking-wider text-[#174D32] uppercase">
            Frequently Asked Questions
          </p>
          <h2
            id="faqs-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-[#25352B] sm:text-3xl"
          >
            Common Questions About the Portal
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            General answers about RegistrarDocs AI and its planned workflow.
            Official policies, fees, and document requirements must always be
            confirmed by the Registrar&apos;s Office.
          </p>
        </div>

        <div className="mt-10 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            const buttonId = `faq-button-${item.id}`;
            const panelId = `faq-panel-${item.id}`;

            return (
              <div key={item.id} className={isOpen ? "bg-[#E6EFE8]/35" : ""}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleItem(item.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#E6EFE8]/60 focus:outline-none focus-visible:bg-[#E6EFE8]/70 focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-inset sm:px-6 sm:py-5"
                  >
                    <span className="text-sm font-semibold text-[#25352B] sm:text-base">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#174D32] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="px-5 pb-5 text-sm leading-relaxed text-slate-600 sm:px-6 sm:pb-6"
                >
                  {item.answer}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
