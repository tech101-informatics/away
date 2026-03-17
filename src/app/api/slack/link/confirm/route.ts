export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { fetchSlackUser } from "@/lib/slack";
import User from "@/models/User";
import { LinkSlackSchema } from "@/lib/schemas/member.schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await req.json();
  const parsed = LinkSlackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { slackUserId } = parsed.data;

  // Validate Slack user exists
  const slackUser = await fetchSlackUser(slackUserId);
  if (!slackUser) {
    return NextResponse.json({ error: "Slack user not found" }, { status: 404 });
  }

  // Check not already linked to another Away user
  const alreadyLinked = await User.findOne({
    slackUserId,
    _id: { $ne: session.user.id },
  });
  if (alreadyLinked) {
    return NextResponse.json(
      { error: "This Slack account is already linked to another user" },
      { status: 409 }
    );
  }

  await User.findByIdAndUpdate(session.user.id, {
    slackUserId,
    slackDisplayName: slackUser.profile.display_name || slackUser.real_name,
    slackAvatar: slackUser.profile.image_72,
    isSlackLinked: true,
    slackLinkedAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
