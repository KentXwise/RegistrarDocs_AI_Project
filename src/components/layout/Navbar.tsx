"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { NAV_ITEMS } from "@/lib/landing-data";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8"
      >
        <BrandMark href="/#top" />

        {/* Desktop navigation links */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] active:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop auth actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-[#174D32] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation-menu"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-[#25352B] transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] md:hidden"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-menu"
          className="border-t border-slate-200 bg-white px-4 pt-3 pb-5 shadow-md md:hidden"
        >
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={closeMenu}
                  className="block rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 transition-colors hover:bg-[#E6EFE8] hover:text-[#174D32] active:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-slate-200 pt-4">
            <Link
              href="/login"
              onClick={closeMenu}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={closeMenu}
              className="inline-flex items-center justify-center rounded-lg bg-[#174D32] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#246B45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
