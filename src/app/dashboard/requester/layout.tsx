import { RequesterShell } from "@/components/requester/RequesterShell";
import { requirePageRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export default async function RequesterDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requirePageRole("requester");

  return <RequesterShell user={user}>{children}</RequesterShell>;
}
