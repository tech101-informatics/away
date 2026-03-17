export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { fetchKeralaHolidays } from "@/lib/calendarific";
import HolidayCalendar from "@/models/HolidayCalendar";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  if (isNaN(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  try {
    const apiHolidays = await fetchKeralaHolidays(year);

    await connectDB();
    const calendar = await HolidayCalendar.findOne({ year }).lean();
    const savedHolidays = calendar?.holidays || [];

    return NextResponse.json({
      apiHolidays,
      savedHolidays,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch holidays";

    if (message.includes("CALENDARIFIC_API_KEY is not configured")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
