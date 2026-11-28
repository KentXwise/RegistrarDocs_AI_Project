import Link from "next/link";
import { Building2 } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { NAV_ITEMS } from "@/lib/landing-data";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#25352B]/10 bg-[#25352B] text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand & description */}
          <div className="lg:col-span-5">
            <BrandMark variant="dark" href="/#top" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
              A web-based Registrar&apos;s Office document request and release
              management portal designed to make requesting academic documents
              easier, clarify requirements, and support request progress
              visibility.
            </p>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold tracking-wider text-white uppercase">
              Quick Links
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-slate-300 transition-colors hover:text-white focus:outline-none focus-visible:underline"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="text-slate-300 transition-colors hover:text-white focus:outline-none focus-visible:underline"
                >
                  Login (Upcoming)
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-slate-300 transition-colors hover:text-white focus:outline-none focus-visible:underline"
                >
                  Register (Upcoming)
                </Link>
              </li>
            </ul>
          </div>

          {/* Institutional info placeholder */}
          <div className="lg:col-span-4">
            <h2 className="text-sm font-semibold tracking-wider text-white uppercase">
              Institutional Information
            </h2>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <Building2
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#E6EFE8]"
                  aria-hidden="true"
                />
                <div className="space-y-1.5 text-sm text-slate-300">
                  <p className="font-semibold text-white">
                    Pilot Institution: Davao del Norte State College (DNSC)
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Official Registrar&apos;s Office contact details, office
                    hours, and verified support channels will be published here
                    once confirmed by the institution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p>&copy; {currentYear} RegistrarDocs AI. All rights reserved.</p>
          <p>
            Development Preview &middot; Official policies subject to
            Registrar&apos;s Office confirmation
          </p>
        </div>
      </div>
    </footer>
  );
}
