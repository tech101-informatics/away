export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const year = body.year || new Date().getFullYear();

  const user = await User.findById(params.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const selections = (user as { optionalHolidaySelections?: Array<{ year: number; isLocked: boolean }> }).optionalHolidaySelections;
  const selection = selections?.find((s) => s.year === year);

  if (selection) {
    selection.isLocked = false;
    await user.save();
  }

  return NextResponse.json({ success: true, year, userId: params.id });
}
