export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";
import HolidayCalendar from "@/models/HolidayCalendar";
import { LeaveRequestSchema } from "@/lib/schemas/leave.schema";
import { validateLeaveRequest } from "@/lib/validators/leave-validator";
import { leaveTypeLabels } from "@/lib/helpers";
import { getSlackClient } from "@/lib/slack-client";
import { buildLeaveRequestBlocks } from "@/lib/slack-blocks";
import { format } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const self = searchParams.get("self");

  let filter: Record<string, unknown> = {};

  // Self — only current user's own requests (used by dashboard)
  if (self === "true") {
    filter = { employeeId: session.user.id };
  }
  // Admin/manager can view a specific user's records
  else if (userId && (session.user.role === "admin" || session.user.role === "manager")) {
    filter = { employeeId: userId };
  } else if (session.user.role === "employee") {
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

  // If no manager assigned, fall back to any admin
  let approverId = user.managerId;
  if (!approverId) {
    const admin = await User.findOne({ role: "admin", isActive: true }).lean();
    approverId = admin ? (admin as Record<string, unknown>)._id : null;
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
    managerId: approverId || undefined,
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

  // Send interactive Slack messages
  const balance = user.leaveBalances?.find(
    (b: { leaveType: string; remaining: number }) => b.leaveType === parsed.data.leaveType
  );

  const slackMsg = buildLeaveRequestBlocks({
    employeeName: user.name,
    leaveType: leaveTypeLabels[parsed.data.leaveType] || parsed.data.leaveType,
    startDate: format(new Date(parsed.data.startDate), "MMM d, yyyy"),
    endDate: format(new Date(parsed.data.endDate), "MMM d, yyyy"),
    numberOfDays: validation.effectiveDays,
    reason: parsed.data.reason,
    remainingBalance: balance?.remaining ?? 0,
    leaveRequestId: leaveRequest._id.toString(),
    awayUrl: process.env.NEXT_PUBLIC_APP_URL || "https://away.storepecker.com",
  });

  // Post to admin channel + DM manager (async, don't block response)
  (async () => {
    try {
      const slack = getSlackClient();

      // Admin channel
      if (process.env.SLACK_ADMIN_CHANNEL_ID) {
        const adminMsg = await slack.chat.postMessage({
          channel: process.env.SLACK_ADMIN_CHANNEL_ID,
          text: slackMsg.text,
          blocks: slackMsg.blocks as never[],
        });
        if (adminMsg.ts) {
          await LeaveRequest.findByIdAndUpdate(leaveRequest._id, {
            adminChannelMessageTs: adminMsg.ts,
          });
        }
      }

      // DM to manager
      if (approverId) {
        const mgr = await User.findById(approverId).lean();
        const mgrData = mgr as Record<string, unknown> | null;
        if (mgrData?.isSlackLinked && mgrData?.slackUserId) {
          const dmMsg = await slack.chat.postMessage({
            channel: mgrData.slackUserId as string,
            text: slackMsg.text,
            blocks: slackMsg.blocks as never[],
          });
          if (dmMsg.ts && dmMsg.channel) {
            await LeaveRequest.findByIdAndUpdate(leaveRequest._id, {
              managerDMChannelId: dmMsg.channel,
              managerDMMessageTs: dmMsg.ts,
            });
          }
        }
      }
    } catch (err) {
      console.error("Slack notification failed:", err);
    }
  })();

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
