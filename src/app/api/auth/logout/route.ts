import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth/session";

export async function POST() {
  await revokeCurrentSession();
  return NextResponse.json(
    { message: "Signed out successfully." },
    { status: 200 }
  );
}
