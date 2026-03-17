export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resetYearlyLeaveBalances } from "@/lib/jobs/reset-leave-balances";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const year = body.year || new Date().getFullYear();

    const summary = await resetYearlyLeaveBalances(year);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reset balances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
