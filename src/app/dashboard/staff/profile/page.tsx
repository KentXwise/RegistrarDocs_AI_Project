import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { requirePageRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Profile | Registrar Staff — RegistrarDocs AI",
  description:
    "View your verified RegistrarDocs AI Staff account information.",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Not recorded";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function StaffProfilePage() {
  const user = await requirePageRole("staff");

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-1 text-xs font-semibold text-[#174D32]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Active Registrar Staff Account</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#25352B]">
          My Profile
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Your verified Registrar Staff account details. Staff account roles and
          activation status are managed strictly by system administrators.
        </p>

        <dl className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-[#F5F5EF]/75 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Full Name
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[#25352B]">
              {user.fullName}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Employee ID
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[#25352B]">
              {user.employeeId ?? "Not assigned"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Email Address
            </dt>
            <dd className="mt-1 text-sm font-medium text-[#25352B]">
              {user.email}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Role &amp; Status
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[#174D32]">
              {user.role} &middot; {user.status}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Account Created
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {formatDate(user.createdAt)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Last Sign-In
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {formatDate(user.lastLoginAt)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
