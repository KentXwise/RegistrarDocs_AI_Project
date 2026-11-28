import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/rbac";

export async function GET() {
  const auth = await requireApiAuth(["admin"]);
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json(
    {
      authorized: true,
      role: auth.user.role,
      fullName: auth.user.fullName,
      status: auth.user.status,
    },
    { status: 200 }
  );
}
