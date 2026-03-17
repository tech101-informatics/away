import { connectDB } from "./db";
import { getSlackClient } from "./slack-client";
import {
  buildApprovedBlocks,
  buildRejectedBlocks,
  buildRejectionModal,
} from "./slack-blocks";
import User from "@/models/User";
import LeaveRequest from "@/models/LeaveRequest";
import WFHRequest from "@/models/WFHRequest";
import { format } from "date-fns";

function formatDate(d: Date | string) {
  return format(new Date(d), "MMM d, yyyy");
}

function formatRange(start: Date | string, end: Date | string) {
  const s = formatDate(start);
  const e = formatDate(end);
  return s === e ? s : `${s} → ${e}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlackPayload = any;

export async function handleInteraction(payload: SlackPayload) {
  const { type, actions, view } = payload;

  if (type === "block_actions" && actions?.length) {
    const action = actions[0];
    switch (action.action_id) {
      case "leave_approve":
        await handleLeaveApprove(payload, action);
        break;
      case "leave_reject":
        await handleLeaveRejectModal(payload, action);
        break;
      case "wfh_approve":
        await handleWFHApprove(payload, action);
        break;
      case "wfh_reject":
        await handleWFHRejectModal(payload, action);
        break;
      // "view_leave" and "view_wfh" are URL buttons — no handler needed
    }
  }

  if (type === "view_submission") {
    if (view?.callback_id === "leave_reject_modal") {
      await handleLeaveRejectSubmit(payload);
    }
    if (view?.callback_id === "wfh_reject_modal") {
      await handleWFHRejectSubmit(payload);
    }
  }
}

// --- Leave Approve ---

async function handleLeaveApprove(payload: SlackPayload, action: SlackPayload) {
  await connectDB();
  const slack = getSlackClient();

  const manager = await User.findOne({ slackUserId: payload.user.id });
  if (!manager) {
    await slack.chat.postEphemeral({
      channel: payload.channel.id,
      user: payload.user.id,
      text: "You are not registered in Away. Contact your admin.",
    });
    return;
  }

  // Atomic update — only succeeds if still pending
  const leaveRequest = await LeaveRequest.findOneAndUpdate(
    { _id: action.value, status: "pending" },
    { status: "approved", managerComment: null },
    { new: true }
  ).populate("employeeId");

  if (!leaveRequest) {
    // Already actioned
    await slack.chat.postEphemeral({
      channel: payload.channel.id,
      user: payload.user.id,
      text: "This request has already been processed.",
    });
    return;
  }

  const employee = leaveRequest.employeeId as unknown as Record<string, unknown>;

  // Update balance
  await User.updateOne(
    { _id: employee._id, "leaveBalances.leaveType": leaveRequest.leaveType },
    {
      $inc: {
        "leaveBalances.$.used": leaveRequest.numberOfDays,
        "leaveBalances.$.remaining": -leaveRequest.numberOfDays,
      },
    }
  );

  const dateRange = formatRange(leaveRequest.startDate, leaveRequest.endDate);
  const updated = buildApprovedBlocks({
    type: "leave",
    employeeName: employee.name as string,
    leaveType: leaveRequest.leaveType,
    dateRange,
    numberOfDays: leaveRequest.numberOfDays,
    approvedByName: manager.name,
  });

  // Update the message the manager clicked on
  try {
    await slack.chat.update({
      channel: payload.channel.id,
      ts: payload.message.ts,
      text: updated.text,
      blocks: updated.blocks as never[],
    });
  } catch (e) {
    console.error("Failed to update message:", e);
  }

  // Update admin channel message + post thread reply
  if (leaveRequest.adminChannelMessageTs && process.env.SLACK_ADMIN_CHANNEL_ID) {
    try {
      await slack.chat.update({
        channel: process.env.SLACK_ADMIN_CHANNEL_ID,
        ts: leaveRequest.adminChannelMessageTs,
        text: updated.text,
        blocks: updated.blocks as never[],
      });
      // Thread reply
      await slack.chat.postMessage({
        channel: process.env.SLACK_ADMIN_CHANNEL_ID,
        thread_ts: leaveRequest.adminChannelMessageTs,
        text: `:white_check_mark: Approved by ${manager.name}`,
      });
    } catch (e) {
      console.error("Failed to update admin channel:", e);
    }
  }

  // DM employee
  if (employee.isSlackLinked && employee.slackUserId) {
    await slack.chat.postMessage({
      channel: employee.slackUserId as string,
      text: `:white_check_mark: Your *${leaveRequest.leaveType} leave* has been approved by *${manager.name}*.\n*${dateRange}* (${leaveRequest.numberOfDays} day${leaveRequest.numberOfDays > 1 ? "s" : ""})`,
    });
  }
}

// --- Leave Reject (open modal) ---

async function handleLeaveRejectModal(payload: SlackPayload, action: SlackPayload) {
  await connectDB();
  const slack = getSlackClient();

  const leaveRequest = await LeaveRequest.findById(action.value).populate("employeeId");
  if (!leaveRequest) return;

  const employee = leaveRequest.employeeId as unknown as Record<string, unknown>;

  await slack.views.open({
    trigger_id: payload.trigger_id,
    view: buildRejectionModal({
      callbackId: "leave_reject_modal",
      employeeName: employee.name as string,
      dateRange: formatRange(leaveRequest.startDate, leaveRequest.endDate),
      privateMetadata: JSON.stringify({
        leaveRequestId: action.value,
        channelId: payload.channel.id,
        messageTs: payload.message.ts,
        adminMessageTs: leaveRequest.adminChannelMessageTs,
      }),
    }),
  });
}

// --- Leave Reject Submit (modal) ---

async function handleLeaveRejectSubmit(payload: SlackPayload) {
  await connectDB();
  const slack = getSlackClient();

  const meta = JSON.parse(payload.view.private_metadata);
  const reason = payload.view.state?.values?.rejection_reason?.reason_input?.value || null;

  const manager = await User.findOne({ slackUserId: payload.user.id });
  if (!manager) return;

  const leaveRequest = await LeaveRequest.findOneAndUpdate(
    { _id: meta.leaveRequestId, status: "pending" },
    { status: "rejected", managerComment: reason },
    { new: true }
  ).populate("employeeId");

  if (!leaveRequest) return;

  const employee = leaveRequest.employeeId as unknown as Record<string, unknown>;
  const dateRange = formatRange(leaveRequest.startDate, leaveRequest.endDate);

  const updated = buildRejectedBlocks({
    type: "leave",
    employeeName: employee.name as string,
    leaveType: leaveRequest.leaveType,
    dateRange,
    rejectedByName: manager.name,
    reason: reason ?? undefined,
  });

  // Update manager DM
  try {
    await slack.chat.update({
      channel: meta.channelId,
      ts: meta.messageTs,
      text: updated.text,
      blocks: updated.blocks as never[],
    });
  } catch (e) {
    console.error("Failed to update message:", e);
  }

  // Update admin channel + thread reply
  if (meta.adminMessageTs && process.env.SLACK_ADMIN_CHANNEL_ID) {
    try {
      await slack.chat.update({
        channel: process.env.SLACK_ADMIN_CHANNEL_ID,
        ts: meta.adminMessageTs,
        text: updated.text,
        blocks: updated.blocks as never[],
      });
      await slack.chat.postMessage({
        channel: process.env.SLACK_ADMIN_CHANNEL_ID,
        thread_ts: meta.adminMessageTs,
        text: `:x: Rejected by ${manager.name}${reason ? ` — ${reason}` : ""}`,
      });
    } catch (e) {
      console.error("Failed to update admin channel:", e);
    }
  }

  // DM employee
  if (employee.isSlackLinked && employee.slackUserId) {
    await slack.chat.postMessage({
      channel: employee.slackUserId as string,
      text: `:x: Your *${leaveRequest.leaveType} leave* (${dateRange}) has been *rejected* by *${manager.name}*.${reason ? `\n\n*Reason:* ${reason}` : ""}`,
    });
  }
}

// --- WFH Approve ---

async function handleWFHApprove(payload: SlackPayload, action: SlackPayload) {
  await connectDB();
  const slack = getSlackClient();

  const manager = await User.findOne({ slackUserId: payload.user.id });
  if (!manager) {
    await slack.chat.postEphemeral({
      channel: payload.channel.id,
      user: payload.user.id,
      text: "You are not registered in Away. Contact your admin.",
    });
    return;
  }

  const wfhRequest = await WFHRequest.findOneAndUpdate(
    { _id: action.value, status: "pending" },
    { status: "approved", managerComment: null },
    { new: true }
  ).populate("employeeId");

  if (!wfhRequest) {
    await slack.chat.postEphemeral({
      channel: payload.channel.id,
      user: payload.user.id,
      text: "This request has already been processed.",
    });
    return;
  }

  const employee = wfhRequest.employeeId as unknown as Record<string, unknown>;
  const dateStr = formatDate(wfhRequest.date);

  // Update balance
  await User.updateOne(
    { _id: employee._id, "leaveBalances.leaveType": "wfh" },
    {
      $inc: {
        "leaveBalances.$.used": wfhRequest.isHalfDay ? 0.5 : 1,
        "leaveBalances.$.remaining": wfhRequest.isHalfDay ? -0.5 : -1,
      },
    }
  );

  const updated = buildApprovedBlocks({
    type: "wfh",
    employeeName: employee.name as string,
    dateRange: dateStr,
    approvedByName: manager.name,
  });

  try {
    await slack.chat.update({
      channel: payload.channel.id,
      ts: payload.message.ts,
      text: updated.text,
      blocks: updated.blocks as never[],
    });
  } catch (e) {
    console.error("Failed to update message:", e);
  }

  if (employee.isSlackLinked && employee.slackUserId) {
    await slack.chat.postMessage({
      channel: employee.slackUserId as string,
      text: `Your WFH request for ${dateStr} has been approved by ${manager.name}.`,
    });
  }
}

// --- WFH Reject (open modal) ---

async function handleWFHRejectModal(payload: SlackPayload, action: SlackPayload) {
  await connectDB();
  const slack = getSlackClient();

  const wfhRequest = await WFHRequest.findById(action.value).populate("employeeId");
  if (!wfhRequest) return;

  const employee = wfhRequest.employeeId as unknown as Record<string, unknown>;

  await slack.views.open({
    trigger_id: payload.trigger_id,
    view: buildRejectionModal({
      callbackId: "wfh_reject_modal",
      employeeName: employee.name as string,
      dateRange: formatDate(wfhRequest.date),
      privateMetadata: JSON.stringify({
        wfhRequestId: action.value,
        channelId: payload.channel.id,
        messageTs: payload.message.ts,
      }),
    }),
  });
}

// --- WFH Reject Submit (modal) ---

async function handleWFHRejectSubmit(payload: SlackPayload) {
  await connectDB();
  const slack = getSlackClient();

  const meta = JSON.parse(payload.view.private_metadata);
  const reason = payload.view.state?.values?.rejection_reason?.reason_input?.value || null;

  const manager = await User.findOne({ slackUserId: payload.user.id });
  if (!manager) return;

  const wfhRequest = await WFHRequest.findOneAndUpdate(
    { _id: meta.wfhRequestId, status: "pending" },
    { status: "rejected", managerComment: reason },
    { new: true }
  ).populate("employeeId");

  if (!wfhRequest) return;

  const employee = wfhRequest.employeeId as unknown as Record<string, unknown>;
  const dateStr = formatDate(wfhRequest.date);

  const updated = buildRejectedBlocks({
    type: "wfh",
    employeeName: employee.name as string,
    dateRange: dateStr,
    rejectedByName: manager.name,
    reason: reason ?? undefined,
  });

  try {
    await slack.chat.update({
      channel: meta.channelId,
      ts: meta.messageTs,
      text: updated.text,
      blocks: updated.blocks as never[],
    });
  } catch (e) {
    console.error("Failed to update message:", e);
  }

  if (employee.isSlackLinked && employee.slackUserId) {
    await slack.chat.postMessage({
      channel: employee.slackUserId as string,
      text: `Your WFH request for ${dateStr} was rejected${reason ? `: ${reason}` : ""}.`,
    });
  }
}
