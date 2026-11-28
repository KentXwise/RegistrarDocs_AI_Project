import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";
import { getDashboardPathForRole } from "@/types/auth";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: auth.user,
      dashboardPath: getDashboardPathForRole(auth.user.role),
    },
    { status: 200 }
  );
}
