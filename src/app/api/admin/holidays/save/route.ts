export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import HolidayCalendar from "@/models/HolidayCalendar";
import { holidayCalendarSaveSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = holidayCalendarSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { year, holidays, optionalHolidayQuota } = parsed.data;

  try {
    await connectDB();

    const mappedHolidays = holidays.map((h) => ({
      name: h.name,
      date: new Date(h.date),
      type: h.type,
      isOptional: h.type === "optional",
    }));

    const calendar = await HolidayCalendar.findOneAndUpdate(
      { year },
      {
        year,
        holidays: mappedHolidays,
        optionalHolidayQuota,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(calendar);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save holidays";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
