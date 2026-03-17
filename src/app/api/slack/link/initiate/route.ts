export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { fetchSlackMembers } from "@/lib/slack";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if ((user as { isSlackLinked?: boolean }).isSlackLinked) {
    return NextResponse.json({ alreadyLinked: true });
  }

  try {
    const slackMembers = await fetchSlackMembers();

    // Build full member list (excluding already linked)
    const existingLinked = await User.find({
      isSlackLinked: true,
      slackUserId: { $ne: null },
    }).lean();
    const linkedIds = new Set(
      existingLinked.map((u) => (u as Record<string, unknown>).slackUserId as string)
    );

    const allMembers = slackMembers
      .filter((m) => !linkedIds.has(m.id))
      .map((m) => ({
        slackUserId: m.id,
        displayName: m.profile.display_name || m.real_name,
        email: m.profile.email || "",
        avatar: m.profile.image_72,
      }));

    // Try auto-match by slackEmail stored at add time
    let match = null;
    const slackEmail = (user as { slackEmail?: string }).slackEmail;
    if (slackEmail) {
      match = allMembers.find(
        (m) => m.email.toLowerCase() === slackEmail.toLowerCase()
      ) || null;
    }

    // Try match by work email
    if (!match) {
      const workEmail = user.email;
      match = allMembers.find(
        (m) => m.email.toLowerCase() === workEmail.toLowerCase()
      ) || null;
    }

    return NextResponse.json({
      autoMatched: !!match,
      match,
      members: allMembers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Slack members";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
