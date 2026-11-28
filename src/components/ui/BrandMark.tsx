import Link from "next/link";
import { FileCheck2 } from "lucide-react";

interface BrandMarkProps {
  variant?: "light" | "dark";
  href?: string;
}

export function BrandMark({ variant = "light", href = "/#top" }: BrandMarkProps) {
  const isDark = variant === "dark";

  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
      aria-label="RegistrarDocs AI home"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
          isDark
            ? "border-white/20 bg-white/10 text-white group-hover:bg-white/15"
            : "border-[#174D32]/15 bg-[#174D32] text-white group-hover:bg-[#246B45]"
        }`}
        aria-hidden="true"
      >
        <FileCheck2 className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`font-[family-name:var(--font-plus-jakarta)] text-base font-bold tracking-tight sm:text-lg ${
            isDark ? "text-white" : "text-[#25352B]"
          }`}
        >
          RegistrarDocs <span className={isDark ? "text-[#E6EFE8]" : "text-[#174D32]"}>AI</span>
        </span>
        <span
          className={`mt-0.5 text-[11px] font-medium tracking-wide ${
            isDark ? "text-slate-300" : "text-slate-500"
          }`}
        >
          Document Request Portal
        </span>
      </span>
    </Link>
  );
}
