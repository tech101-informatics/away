export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import HolidayCalendar from "@/models/HolidayCalendar";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  await connectDB();

  const calendar = await HolidayCalendar.findOne({ year }).lean();
  const optionalHolidays = calendar
    ? (calendar.holidays as Array<{ _id: unknown; name: string; date: Date; type: string; isOptional: boolean }>)
        .filter((h) => h.isOptional)
        .map((h) => ({
          _id: h._id,
          name: h.name,
          date: h.date,
          type: h.type,
        }))
    : [];

  // Get user's current selections
  const user = await User.findById(session.user.id).lean();
  const userData = user as { optionalHolidaySelections?: Array<{ year: number; selectedHolidayIds: string[]; isLocked: boolean; lockedAt?: Date }> } | null;
  const selection = userData?.optionalHolidaySelections?.find(
    (s) => s.year === year
  );

  return NextResponse.json({
    holidays: optionalHolidays,
    selectedIds: selection?.selectedHolidayIds || [],
    isLocked: selection?.isLocked || false,
    lockedAt: selection?.lockedAt || null,
    quota: calendar?.optionalHolidayQuota || 2,
  });
}
