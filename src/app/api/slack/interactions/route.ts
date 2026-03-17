import crypto from "crypto";
import { handleInteraction } from "@/lib/slack-interactions";

function verifySlackSignature(
  body: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !signature) return false;

  // Reject if older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const sigBaseString = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(sigBaseString)
    .digest("hex");
  const computed = `v0=${hmac}`;

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  if (!verifySlackSignature(body, timestamp, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(body);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    return new Response("Bad request", { status: 400 });
  }

  const payload = JSON.parse(payloadStr);

  // Acknowledge Slack immediately — process async
  handleInteraction(payload).catch((err) => {
    console.error("Slack interaction handler error:", err);
  });

  // Return 200 immediately (Slack requires response within 3s)
  // For view_submission, return empty body to close the modal
  if (payload.type === "view_submission") {
    return new Response("", { status: 200 });
  }

  return new Response("", { status: 200 });
}
