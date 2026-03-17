import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import HolidayCalendar from "@/models/HolidayCalendar";

export async function GET(req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const year = parseInt(params.year);
  const calendar = await HolidayCalendar.findOne({ year }).lean();
  return NextResponse.json(calendar || { year, holidays: [], optionalHolidayQuota: 2 });
}

export async function POST(req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const year = parseInt(params.year);
  const body = await req.json();

  let calendar = await HolidayCalendar.findOne({ year });
  if (!calendar) {
    calendar = await HolidayCalendar.create({
      year,
      holidays: [],
      optionalHolidayQuota: body.optionalHolidayQuota || 2,
    });
  }

  if (body.holiday) {
    calendar.holidays.push({
      ...body.holiday,
      isOptional: body.holiday.isOptional || body.holiday.type === "optional",
    });
    await calendar.save();
  }

  if (body.optionalHolidayQuota !== undefined) {
    calendar.optionalHolidayQuota = body.optionalHolidayQuota;
    await calendar.save();
  }

  return NextResponse.json(calendar);
}

export async function PATCH(req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const year = parseInt(params.year);
  const body = await req.json();

  if (body.optionalHolidayQuota !== undefined) {
    const calendar = await HolidayCalendar.findOneAndUpdate(
      { year },
      { optionalHolidayQuota: body.optionalHolidayQuota },
      { new: true }
    );
    return NextResponse.json(calendar);
  }

  if (body.holidayId) {
    const calendar = await HolidayCalendar.findOne({ year });
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    const holiday = calendar.holidays.id(body.holidayId);
    if (!holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    if (body.name) holiday.name = body.name;
    if (body.date) holiday.date = body.date;
    if (body.type) {
      holiday.type = body.type;
    }
    if (body.isOptional !== undefined) {
      holiday.isOptional = body.isOptional;
    } else if (body.type) {
      holiday.isOptional = body.type === "optional";
    }
    await calendar.save();
    return NextResponse.json(calendar);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(req: Request, { params }: { params: { year: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const year = parseInt(params.year);
  const { holidayId } = await req.json();

  const calendar = await HolidayCalendar.findOne({ year });
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  calendar.holidays = calendar.holidays.filter(
    (h: { _id: { toString(): string } }) => h._id.toString() !== holidayId
  );
  await calendar.save();
  return NextResponse.json(calendar);
}
