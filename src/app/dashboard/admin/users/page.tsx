import type { Metadata } from "next";
import { AdminUsersManager } from "@/components/admin/AdminUsersManager";
import { requirePageRole } from "@/lib/auth/rbac";
import { listAdminUsers } from "@/lib/db/admin-users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User Management | Admin — RegistrarDocs AI",
};

export default async function AdminUsersPage() {
  const admin = await requirePageRole("admin");
  const result = await listAdminUsers();

  return (
    <AdminUsersManager
      initialUsers={result.ok ? result.users : []}
      currentAdminId={admin.id}
      mode="all_users"
    />
  );
}
