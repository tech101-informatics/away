export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WFHRequest from "@/models/WFHRequest";
import User from "@/models/User";
import { WFHRequestSchema } from "@/lib/schemas/leave.schema";
import { validateWFHRequest } from "@/lib/validators/wfh-validator";
import { getSlackClient } from "@/lib/slack-client";
import { buildWFHRequestBlocks } from "@/lib/slack-blocks";
import { format, parseISO, subDays, addDays } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const self = searchParams.get("self");

  let filter: Record<string, unknown> = {};

  if (self === "true") {
    filter = { employeeId: session.user.id };
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

  const requests = await WFHRequest.find(filter)
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
  const parsed = WFHRequestSchema.safeParse(body);
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

  // Check for duplicate date
  const existing = await WFHRequest.findOne({
    employeeId: session.user.id,
    date: parsed.data.date,
    status: { $ne: "cancelled" },
  });
  if (existing) {
    return NextResponse.json({ error: "WFH request already exists for this date" }, { status: 400 });
  }

  // Get recent WFH requests for consecutive check (10 days window)
  const requestDate = parseISO(parsed.data.date);
  const recentWFH = await WFHRequest.find({
    employeeId: session.user.id,
    date: {
      $gte: subDays(requestDate, 5),
      $lte: addDays(requestDate, 5),
    },
    status: { $in: ["pending", "approved"] },
  }).lean();

  // Run policy validation
  const validation = await validateWFHRequest(
    {
      date: parsed.data.date,
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
    recentWFH.map((r) => ({
      date: r.date,
      status: r.status,
      isHalfDay: (r as unknown as { isHalfDay?: boolean }).isHalfDay,
    }))
  );

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errors[0], errors: validation.errors },
      { status: 400 }
    );
  }

  const wfhRequest = await WFHRequest.create({
    employeeId: session.user.id,
    managerId: approverId || undefined,
    date: parsed.data.date,
    isHalfDay: parsed.data.isHalfDay,
    halfDayPeriod: parsed.data.halfDayPeriod,
    reason: parsed.data.reason,
    status: "pending",
    quotaExceeded: validation.quotaExceeded,
    requiresManagerApproval: validation.requiresManagerApproval,
    policyWarnings: validation.warnings,
  });

  // Send interactive Slack messages
  const wfhBal = user.leaveBalances?.find(
    (b: { leaveType: string }) => b.leaveType === "wfh"
  );

  const slackMsg = buildWFHRequestBlocks({
    employeeName: user.name,
    date: format(requestDate, "MMM d, yyyy"),
    reason: parsed.data.reason,
    remainingBalance: wfhBal?.remaining ?? 0,
    wfhRequestId: wfhRequest._id.toString(),
    quotaExceeded: validation.quotaExceeded,
    awayUrl: process.env.NEXT_PUBLIC_APP_URL || "https://away.storepecker.com",
  });

  (async () => {
    try {
      const slack = getSlackClient();

      if (process.env.SLACK_ADMIN_CHANNEL_ID) {
        await slack.chat.postMessage({
          channel: process.env.SLACK_ADMIN_CHANNEL_ID,
          text: slackMsg.text,
          blocks: slackMsg.blocks as never[],
        });
      }

      if (approverId) {
        const mgr = await User.findById(approverId).lean();
        const mgrData = mgr as Record<string, unknown> | null;
        if (mgrData?.isSlackLinked && mgrData?.slackUserId) {
          await slack.chat.postMessage({
            channel: mgrData.slackUserId as string,
            text: slackMsg.text,
            blocks: slackMsg.blocks as never[],
          });
        }
      }
    } catch (err) {
      console.error("Slack notification failed:", err);
    }
  })();

  return NextResponse.json(
    {
      ...wfhRequest.toObject(),
      _validation: {
        warnings: validation.warnings,
        quotaExceeded: validation.quotaExceeded,
        requiresManagerApproval: validation.requiresManagerApproval,
      },
    },
    { status: 201 }
  );
}
