export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import HolidayCalendar from "@/models/HolidayCalendar";
import { OptionalHolidaySelectionSchema } from "@/lib/schemas/leave.schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await req.json();
  const parsed = OptionalHolidaySelectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { year, holidayIds } = parsed.data;

  // Check selection window (January 1–31)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  if (year === currentYear && currentMonth > 0) {
    // After January — check if selections are already locked
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingSelection = user.optionalHolidaySelections?.find(
      (s: { year: number; isLocked: boolean }) => s.year === year
    );

    if (existingSelection?.isLocked) {
      return NextResponse.json(
        { error: "Optional holiday selections are locked after January 31st" },
        { status: 400 }
      );
    }
  }

  // Validate max 2
  if (holidayIds.length > 2) {
    return NextResponse.json(
      { error: "Maximum 2 optional holidays can be selected" },
      { status: 400 }
    );
  }

  // Validate holidays exist
  const calendar = await HolidayCalendar.findOne({ year });
  if (!calendar) {
    return NextResponse.json({ error: "Holiday calendar not found for this year" }, { status: 404 });
  }

  const optionalHolidayIds = calendar.holidays
    .filter((h: { isOptional: boolean }) => h.isOptional)
    .map((h: { _id: { toString(): string } }) => h._id.toString());

  for (const id of holidayIds) {
    if (!optionalHolidayIds.includes(id)) {
      return NextResponse.json({ error: `Holiday ${id} is not an optional holiday` }, { status: 400 });
    }
  }

  // Check if weekends
  for (const id of holidayIds) {
    const holiday = calendar.holidays.find(
      (h: { _id: { toString(): string } }) => h._id.toString() === id
    );
    if (holiday) {
      const day = new Date(holiday.date).getDay();
      if (day === 0 || day === 6) {
        return NextResponse.json(
          { error: `Cannot select ${holiday.name} — it falls on a weekend` },
          { status: 400 }
        );
      }
    }
  }

  // Determine if should lock (after Jan 31 of the year, or admin override)
  const shouldLock = year === currentYear && currentMonth >= 1;

  await User.findByIdAndUpdate(
    session.user.id,
    {
      $pull: { optionalHolidaySelections: { year } },
    }
  );

  await User.findByIdAndUpdate(
    session.user.id,
    {
      $push: {
        optionalHolidaySelections: {
          year,
          selectedHolidayIds: holidayIds,
          isLocked: shouldLock,
          lockedAt: shouldLock ? new Date() : undefined,
        },
      },
    }
  );

  return NextResponse.json({ success: true, locked: shouldLock });
}
