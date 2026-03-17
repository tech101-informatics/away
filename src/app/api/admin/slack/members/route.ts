export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { fetchSlackMembers } from "@/lib/slack";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const slackMembers = await fetchSlackMembers();

    await connectDB();
    const existingUsers = await User.find({
      slackUserId: { $ne: null },
    }).lean();
    const linkedSlackIds = new Set(
      existingUsers.map((u) => (u as Record<string, unknown>).slackUserId as string)
    );

    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || "storepecker.me";

    const mapped = slackMembers.map((m) => ({
      slackUserId: m.id,
      slackDisplayName: m.profile.display_name || m.real_name,
      slackEmail: m.profile.email || "",
      slackAvatar: m.profile.image_72,
      isStorepeckerEmail: m.profile.email?.endsWith(`@${allowedDomain}`) || false,
      alreadyAdded: linkedSlackIds.has(m.id),
    }));

    // Sort: not-yet-added first
    mapped.sort((a, b) => {
      if (a.alreadyAdded !== b.alreadyAdded) return a.alreadyAdded ? 1 : -1;
      return a.slackDisplayName.localeCompare(b.slackDisplayName);
    });

    return NextResponse.json(mapped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Slack members";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
