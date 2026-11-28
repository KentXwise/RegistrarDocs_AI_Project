import { AdminShell } from "@/components/admin/AdminShell";
import { requirePageRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageRole("admin");
  return <AdminShell user={user}>{children}</AdminShell>;
}
