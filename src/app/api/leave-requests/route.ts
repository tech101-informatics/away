export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";
import HolidayCalendar from "@/models/HolidayCalendar";
import { LeaveRequestSchema } from "@/lib/schemas/leave.schema";
import { validateLeaveRequest } from "@/lib/validators/leave-validator";
import { formatDateRange, leaveTypeLabels } from "@/lib/helpers";
import { sendAdminChannelMessage, buildLeaveRequestMessage } from "@/lib/slack";
import { format } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  let filter: Record<string, unknown> = {};
  if (session.user.role === "employee") {
    filter = { employeeId: session.user.id };
  } else if (session.user.role === "manager") {
    filter = {
      $or: [
        { managerId: session.user.id },
        { employeeId: session.user.id },
      ],
    };
  }

  const requests = await LeaveRequest.find(filter)
    .populate("employeeId", "name email image")
    .populate("managerId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await req.json();
  const parsed = LeaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.managerId) {
    return NextResponse.json({ error: "No manager assigned. Please contact admin." }, { status: 400 });
  }

  // Get public holidays
  const startYear = new Date(parsed.data.startDate).getFullYear();
  const calendar = await HolidayCalendar.findOne({ year: startYear });
  const publicHolidays = calendar
    ? (calendar.holidays as Array<{ name: string; date: Date; type: string }>)
        .filter((h) => h.type !== "optional")
        .map((h) => ({ name: h.name, date: format(h.date, "yyyy-MM-dd") }))
    : [];

  // Run policy validation
  const validation = await validateLeaveRequest(
    {
      leaveType: parsed.data.leaveType,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      isHalfDay: parsed.data.isHalfDay,
      reason: parsed.data.reason,
    },
    {
      onNoticePeriod: (user as unknown as { onNoticePeriod?: boolean }).onNoticePeriod,
      leaveBalances: (user.leaveBalances || []).map((b: { leaveType: string; allocated: number; used: number; remaining: number }) => ({
        leaveType: b.leaveType,
        allocated: b.allocated,
        used: b.used,
        remaining: b.remaining,
      })),
    },
    publicHolidays
  );

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errors[0], errors: validation.errors },
      { status: 400 }
    );
  }

  const leaveRequest = await LeaveRequest.create({
    employeeId: session.user.id,
    managerId: user.managerId,
    leaveType: parsed.data.leaveType,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    numberOfDays: validation.effectiveDays,
    isHalfDay: parsed.data.isHalfDay,
    halfDayPeriod: parsed.data.halfDayPeriod,
    unpaidDays: validation.unpaidDays,
    reason: parsed.data.reason,
    status: "pending",
    policyWarnings: validation.warnings,
  });

  // Notify admin channel
  sendAdminChannelMessage(
    buildLeaveRequestMessage({
      employeeName: user.name,
      leaveType: leaveTypeLabels[parsed.data.leaveType] || parsed.data.leaveType,
      dates: formatDateRange(parsed.data.startDate, parsed.data.endDate),
      numberOfDays: validation.effectiveDays,
      reason: parsed.data.reason,
      unpaidDays: validation.unpaidDays,
    })
  );

  return NextResponse.json(
    {
      ...leaveRequest.toObject(),
      _validation: {
        warnings: validation.warnings,
        weekendsExcluded: validation.weekendsExcluded,
        holidaysExcluded: validation.holidaysExcluded,
        unpaidDays: validation.unpaidDays,
      },
    },
    { status: 201 }
  );
}
