import { StaffShell } from "@/components/staff/StaffShell";
import { requirePageRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export default async function StaffDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requirePageRole("staff");

  return <StaffShell user={user}>{children}</StaffShell>;
}
