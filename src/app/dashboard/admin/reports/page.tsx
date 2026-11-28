import type { Metadata } from "next";
import { AdminReportsView } from "@/components/admin/AdminReportsView";
import { requirePageRole } from "@/lib/auth/rbac";
import { getAdminReportsData } from "@/lib/db/admin-reports";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports & Analytics | Admin — RegistrarDocs AI",
  description:
    "System-wide document request statistics, document demand reports, monthly trends, user statistics, and CSV exports.",
};

export default async function AdminReportsPage() {
  await requirePageRole("admin");
  const result = await getAdminReportsData();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        {result.error}
      </div>
    );
  }

  return <AdminReportsView initialReport={result.report} />;
}
