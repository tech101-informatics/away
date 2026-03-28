import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { getSlackClient } from "@/lib/slack-client";
import User from "@/models/User";
import { buildLeaveModal, buildWFHModal, buildBalanceBlocks, buildHelpBlocks } from "@/lib/slack-command-modals";

function verifySlackSignature(
  body: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !signature) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;
  const hmac = crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(`v0=${hmac}`), Buffer.from(signature));
}

export async function POST(req: Request) {
  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  if (!verifySlackSignature(body, timestamp, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(body);
  const text = (params.get("text") || "").trim().toLowerCase();
  const triggerId = params.get("trigger_id") || "";
  const slackUserId = params.get("user_id") || "";

  // Check user is registered in Away
  await connectDB();
  const user = await User.findOne({ slackUserId, isActive: true }).lean();

  if (!user) {
    return new Response(
      JSON.stringify({
        response_type: "ephemeral",
        text: "You're not registered in Away. Ask your admin to add you.",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const slack = getSlackClient();

  try {
    switch (text) {
      case "leave":
      case "apply":
      case "leave apply": {
        await slack.views.open({
          trigger_id: triggerId,
          view: buildLeaveModal() as never,
        });
        return new Response("", { status: 200 });
      }

      case "wfh":
      case "work from home": {
        await slack.views.open({
          trigger_id: triggerId,
          view: buildWFHModal() as never,
        });
        return new Response("", { status: 200 });
      }

      case "balance":
      case "balances":
      case "status": {
        const u = user as Record<string, unknown>;
        const balances = (u.leaveBalances as Array<{ leaveType: string; allocated: number; used: number; remaining: number }>) || [];
        return new Response(
          JSON.stringify({
            response_type: "ephemeral",
            blocks: buildBalanceBlocks(balances),
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      case "help":
      case "":
      default: {
        return new Response(
          JSON.stringify({
            response_type: "ephemeral",
            blocks: buildHelpBlocks(),
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }
  } catch (err) {
    console.error("Slash command error:", err);
    return new Response(
      JSON.stringify({
        response_type: "ephemeral",
        text: "Something went wrong. Please try again.",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
