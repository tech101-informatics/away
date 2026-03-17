import { connectDB } from "./db";
import User from "@/models/User";

// --- Types ---

interface SlackMember {
  id: string;
  deleted: boolean;
  is_bot: boolean;
  real_name: string;
  profile: {
    display_name: string;
    email?: string;
    image_72: string;
  };
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  members?: SlackMember[];
  user?: SlackMember;
}

export interface SlackMessage {
  blocks: Array<Record<string, unknown>>;
  fallbackText: string;
}

// --- Slack Bot API helpers ---

let slackMembersCache: { data: SlackMember[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchSlackMembers(): Promise<SlackMember[]> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not configured");

  if (slackMembersCache && Date.now() - slackMembersCache.timestamp < CACHE_TTL) {
    return slackMembersCache.data;
  }

  const res = await fetch("https://slack.com/api/users.list", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data: SlackApiResponse = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);

  const members = (data.members || []).filter(
    (m) => !m.is_bot && !m.deleted && m.id !== "USLACKBOT"
  );

  slackMembersCache = { data: members, timestamp: Date.now() };
  return members;
}

export async function fetchSlackUser(slackUserId: string): Promise<SlackMember | null> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not configured");

  const res = await fetch(`https://slack.com/api/users.info?user=${slackUserId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data: SlackApiResponse = await res.json();
  if (!data.ok) return null;
  return data.user || null;
}

// --- Send DM to a Slack user by their Slack user ID ---

export async function sendSlackDM(
  slackUserId: string,
  message: SlackMessage
): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn("SLACK_BOT_TOKEN not set, skipping DM");
    return { sent: false, reason: "no_bot_token" };
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: slackUserId,
        blocks: message.blocks,
        text: message.fallbackText,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`Slack DM failed: ${data.error}`);
      return { sent: false, reason: data.error };
    }
    return { sent: true };
  } catch (error) {
    console.error("Failed to send Slack DM:", error);
    return { sent: false, reason: "api_error" };
  }
}

// --- Post to the locked admin channel ---

export async function sendAdminChannelMessage(
  message: SlackMessage
): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_ADMIN_CHANNEL_ID;
  if (!token || !channelId) {
    console.warn("SLACK_BOT_TOKEN or SLACK_ADMIN_CHANNEL_ID not set, skipping");
    return { sent: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        blocks: message.blocks,
        text: message.fallbackText,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`Admin channel post failed: ${data.error}`);
      return { sent: false, reason: data.error };
    }
    return { sent: true };
  } catch (error) {
    console.error("Failed to post to admin channel:", error);
    return { sent: false, reason: "api_error" };
  }
}

// --- Notify an employee by their Away user ID (handles unlinked gracefully) ---

export async function notifyEmployee(
  userId: string,
  message: SlackMessage
): Promise<{ sent: boolean; reason?: string }> {
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return { sent: false, reason: "user_not_found" };

  const u = user as Record<string, unknown>;
  if (!u.isSlackLinked || !u.slackUserId) {
    console.log(`Slack notification skipped for ${u.email} — not linked`);
    return { sent: false, reason: "slack_not_linked" };
  }

  return sendSlackDM(u.slackUserId as string, message);
}

// --- Message builders ---

export function buildLeaveRequestMessage(params: {
  employeeName: string;
  leaveType: string;
  dates: string;
  numberOfDays: number;
  reason: string;
  unpaidDays?: number;
}): SlackMessage {
  const blocks: Array<Record<string, unknown>> = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:calendar: *Leave Request*\n*Employee:* ${params.employeeName}\n*Type:* ${params.leaveType}\n*Dates:* ${params.dates} (${params.numberOfDays} day${params.numberOfDays !== 1 ? "s" : ""})\n*Reason:* ${params.reason}`,
      },
    },
  ];

  if (params.unpaidDays && params.unpaidDays > 0) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `:warning: ${params.unpaidDays} day(s) will be unpaid` }],
    });
  }

  return {
    blocks,
    fallbackText: `Leave request from ${params.employeeName}: ${params.leaveType}, ${params.dates}`,
  };
}

export function buildWFHRequestMessage(params: {
  employeeName: string;
  date: string;
  reason: string;
  quotaExceeded?: boolean;
}): SlackMessage {
  const blocks: Array<Record<string, unknown>> = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:house: *WFH Request*\n*Employee:* ${params.employeeName}\n*Date:* ${params.date}\n*Reason:* ${params.reason}`,
      },
    },
  ];

  if (params.quotaExceeded) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `:warning: WFH quota exceeded — manager approval required` }],
    });
  }

  return {
    blocks,
    fallbackText: `WFH request from ${params.employeeName}: ${params.date}`,
  };
}

export function buildStatusUpdateMessage(params: {
  requestType: "leave" | "wfh";
  status: "approved" | "rejected";
  dates: string;
  managerComment?: string;
}): SlackMessage {
  const emoji = params.status === "approved" ? ":white_check_mark:" : ":x:";
  const label = params.requestType === "leave" ? "Leave" : "WFH";
  const statusText = params.status === "approved" ? "Approved" : "Rejected";

  const text = `${emoji} Your ${label} request for *${params.dates}* has been *${statusText}*${params.managerComment ? `\n_"${params.managerComment}"_` : ""}`;

  return {
    blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
    fallbackText: `${label} request ${statusText}: ${params.dates}`,
  };
}
