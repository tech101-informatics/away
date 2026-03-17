export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LeaveRequest from "@/models/LeaveRequest";
import WFHRequest from "@/models/WFHRequest";
import User from "@/models/User";
import { startOfDay, endOfDay, format } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  // Find approved leaves that cover today
  const onLeave = await LeaveRequest.find({
    status: "approved",
    startDate: { $lte: dayEnd },
    endDate: { $gte: dayStart },
  })
    .populate("employeeId", "name email image slackAvatar")
    .lean();

  // Find approved WFH for today
  const onWFH = await WFHRequest.find({
    status: "approved",
    date: { $gte: dayStart, $lte: dayEnd },
  })
    .populate("employeeId", "name email image slackAvatar")
    .lean();

  // Get all active users for "in office" count
  const totalActive = await User.countDocuments({ isActive: true });

  const leaveList = onLeave.map((r) => {
    const emp = r.employeeId as unknown as Record<string, unknown>;
    return {
      _id: emp?._id?.toString(),
      name: emp?.name,
      image: emp?.image || emp?.slackAvatar,
      type: "leave" as const,
      leaveType: r.leaveType,
      isHalfDay: r.isHalfDay,
    };
  });

  const wfhList = onWFH.map((r) => {
    const emp = r.employeeId as unknown as Record<string, unknown>;
    return {
      _id: emp?._id?.toString(),
      name: emp?.name,
      image: emp?.image || emp?.slackAvatar,
      type: "wfh" as const,
      isHalfDay: (r as Record<string, unknown>).isHalfDay,
    };
  });

  const awayIds = new Set([
    ...leaveList.map((l) => l._id),
    ...wfhList.map((w) => w._id),
  ]);

  return NextResponse.json({
    date: format(targetDate, "yyyy-MM-dd"),
    totalActive,
    inOffice: totalActive - awayIds.size,
    onLeave: leaveList,
    onWFH: wfhList,
  });
}
