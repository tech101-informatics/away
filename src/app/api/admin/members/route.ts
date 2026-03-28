export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { AddMemberSchema } from "@/lib/schemas/member.schema";
import { sendSlackDM } from "@/lib/slack";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const role = searchParams.get("role");

  const filter: Record<string, unknown> = {};
  if (status === "active") filter.isActive = true;
  if (status === "deactivated") filter.isActive = false;
  if (role) filter.role = role;

  const users = await User.find(filter)
    .populate("managerId", "name email")
    .populate("approvedBy", "name")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const parsed = AddMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAIN || "storepecker.me")
    .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const hasSlack = !!data.slackEmail;
  const slackDomain = data.slackEmail.split("@")[1]?.toLowerCase();
  const isSlackEmailMatch = hasSlack && allowedDomains.includes(slackDomain);

  let loginEmail: string;
  let isSlackLinked: boolean;

  if (isSlackEmailMatch) {
    loginEmail = data.slackEmail.toLowerCase();
    isSlackLinked = true;
  } else {
    if (!data.workEmail) {
      return NextResponse.json(
        { error: `Work email (@${allowedDomains.join(" or @")}) is required` },
        { status: 400 }
      );
    }
    loginEmail = data.workEmail.toLowerCase();
    isSlackLinked = false;
  }

  // Check duplicate
  const existing = await User.findOne({ email: loginEmail });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const user = await User.create({
    name: data.slackDisplayName,
    email: loginEmail,
    googleId: "",
    role: data.role,
    managerId: data.managerId && data.managerId !== "none" ? data.managerId : undefined,
    joiningDate: data.joiningDate,
    isApproved: true,
    isActive: true,
    approvedAt: new Date(),
    approvedBy: session.user.id,
    slackUserId: data.slackUserId,
    slackEmail: data.slackEmail,
    slackDisplayName: data.slackDisplayName,
    slackAvatar: data.slackAvatar || undefined,
    isSlackLinked,
    slackLinkedAt: isSlackLinked ? new Date() : undefined,
    leaveBalances: [],
  });

  // Send welcome DM via Slack
  if (data.slackUserId) {
    sendSlackDM(data.slackUserId, {
      fallbackText: `Welcome to Away! You've been added by ${session.user.name}. Login at away.storepecker.com`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:wave: *Welcome to Away!*\nYou've been added by ${session.user.name}. Login at away.storepecker.com with your work email.`,
          },
        },
      ],
    });
  }

  return NextResponse.json(user, { status: 201 });
}
