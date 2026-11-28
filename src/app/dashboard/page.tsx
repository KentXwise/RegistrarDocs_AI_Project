import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/types/auth";

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }
  redirect(getDashboardPathForRole(user.role));
}
