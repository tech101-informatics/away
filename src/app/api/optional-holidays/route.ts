export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import EmployeeOptionalHoliday from "@/models/EmployeeOptionalHoliday";
import HolidayCalendar from "@/models/HolidayCalendar";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  await connectDB();
  const selections = await EmployeeOptionalHoliday.findOne({
    employeeId: session.user.id,
    year,
  }).lean();

  return NextResponse.json(selections || { selectedHolidays: [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await req.json();
  const { holidayId, date, name, year } = body;

  const calendar = await HolidayCalendar.findOne({ year });
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  let selection = await EmployeeOptionalHoliday.findOne({
    employeeId: session.user.id,
    year,
  });

  if (!selection) {
    selection = new EmployeeOptionalHoliday({
      employeeId: session.user.id,
      year,
      selectedHolidays: [],
    });
  }

  if (selection.selectedHolidays.length >= calendar.optionalHolidayQuota) {
    return NextResponse.json(
      { error: `You can only select up to ${calendar.optionalHolidayQuota} optional holidays` },
      { status: 400 }
    );
  }

  const alreadySelected = selection.selectedHolidays.some(
    (h: { holidayId: { toString(): string } }) => h.holidayId.toString() === holidayId
  );
  if (alreadySelected) {
    return NextResponse.json({ error: "Holiday already selected" }, { status: 400 });
  }

  selection.selectedHolidays.push({ holidayId, date, name });
  await selection.save();

  return NextResponse.json(selection);
}
