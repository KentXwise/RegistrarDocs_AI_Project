import type { Metadata } from "next";
import { AdminStaffManager } from "@/components/admin/AdminStaffManager";
import { requirePageRole } from "@/lib/auth/rbac";
import { listAdminUsers } from "@/lib/db/admin-users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff Management | Admin — RegistrarDocs AI",
};

export default async function AdminStaffPage() {
  await requirePageRole("admin");
  const result = await listAdminUsers({ role: "staff" });

  return <AdminStaffManager initialStaff={result.ok ? result.users : []} />;
}
