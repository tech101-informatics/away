function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ts() {
  return Math.floor(Date.now() / 1000);
}

// --- Interactive leave request message ---

export function buildLeaveRequestBlocks(params: {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  remainingBalance: number;
  leaveRequestId: string;
  awayUrl: string;
}) {
  return {
    text: `New leave request from ${params.employeeName}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "New Leave Request", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Employee:*\n${params.employeeName}` },
          { type: "mrkdwn", text: `*Type:*\n${capitalize(params.leaveType)}` },
          {
            type: "mrkdwn",
            text: `*Dates:*\n${params.startDate} → ${params.endDate} (${params.numberOfDays}d)`,
          },
          {
            type: "mrkdwn",
            text: `*Balance after:*\n${Math.max(0, params.remainingBalance - params.numberOfDays)} days remaining`,
          },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Reason:* ${params.reason}` },
      },
      { type: "divider" },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Approve", emoji: true },
            style: "primary",
            action_id: "leave_approve",
            value: params.leaveRequestId,
            confirm: {
              title: { type: "plain_text", text: "Approve leave?" },
              text: { type: "mrkdwn", text: `Approve *${params.numberOfDays} day(s)* for *${params.employeeName}*?` },
              confirm: { type: "plain_text", text: "Yes, approve" },
              deny: { type: "plain_text", text: "Cancel" },
            },
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Reject", emoji: true },
            style: "danger",
            action_id: "leave_reject",
            value: params.leaveRequestId,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "View in Away", emoji: true },
            action_id: "view_leave",
            url: `${params.awayUrl}/manager`,
          },
        ],
      },
    ],
  };
}

// --- Interactive WFH request message ---

export function buildWFHRequestBlocks(params: {
  employeeName: string;
  date: string;
  reason: string;
  remainingBalance: number;
  wfhRequestId: string;
  quotaExceeded?: boolean;
  awayUrl: string;
}) {
  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: { type: "plain_text", text: "New WFH Request", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Employee:*\n${params.employeeName}` },
        { type: "mrkdwn", text: `*Date:*\n${params.date}` },
        { type: "mrkdwn", text: `*Balance:*\n${params.remainingBalance} days remaining` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Reason:* ${params.reason}` },
    },
  ];

  if (params.quotaExceeded) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: ":warning: *WFH quota exceeded — approval required*" }],
    });
  }

  blocks.push(
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve", emoji: true },
          style: "primary",
          action_id: "wfh_approve",
          value: params.wfhRequestId,
          confirm: {
            title: { type: "plain_text", text: "Approve WFH?" },
            text: { type: "mrkdwn", text: `Approve WFH for *${params.employeeName}* on *${params.date}*?` },
            confirm: { type: "plain_text", text: "Yes, approve" },
            deny: { type: "plain_text", text: "Cancel" },
          },
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Reject", emoji: true },
          style: "danger",
          action_id: "wfh_reject",
          value: params.wfhRequestId,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "View in Away", emoji: true },
          action_id: "view_wfh",
          url: `${params.awayUrl}/manager`,
        },
      ],
    }
  );

  return { text: `New WFH request from ${params.employeeName}`, blocks };
}

// --- Approved message (replaces buttons) ---

export function buildApprovedBlocks(params: {
  type: "leave" | "wfh";
  employeeName: string;
  leaveType?: string;
  dateRange: string;
  numberOfDays?: number;
  approvedByName: string;
}) {
  const label = params.type === "leave" ? `${capitalize(params.leaveType || "")} Leave` : "WFH";
  return {
    text: `${label} approved for ${params.employeeName}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${label} Request*` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Employee:*\n${params.employeeName}` },
          { type: "mrkdwn", text: `*Dates:*\n${params.dateRange}${params.numberOfDays ? ` (${params.numberOfDays}d)` : ""}` },
        ],
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `:white_check_mark: *Approved* by ${params.approvedByName} · <!date^${ts()}^{date_short_pretty} at {time}|just now>`,
          },
        ],
      },
    ],
  };
}

// --- Rejected message (replaces buttons) ---

export function buildRejectedBlocks(params: {
  type: "leave" | "wfh";
  employeeName: string;
  leaveType?: string;
  dateRange: string;
  rejectedByName: string;
  reason?: string;
}) {
  const label = params.type === "leave" ? `${capitalize(params.leaveType || "")} Leave` : "WFH";
  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: { type: "plain_text", text: `${label} Request`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Employee:*\n${params.employeeName}` },
        { type: "mrkdwn", text: `*Dates:*\n${params.dateRange}` },
      ],
    },
  ];

  if (params.reason) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Reason for rejection:* ${params.reason}` },
    });
  }

  blocks.push(
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `:x: *Rejected* by ${params.rejectedByName} · <!date^${ts()}^{date_short_pretty} at {time}|just now>`,
        },
      ],
    }
  );

  return { text: `${label} rejected for ${params.employeeName}`, blocks };
}

// --- Rejection reason modal ---

export function buildRejectionModal(params: {
  callbackId: "leave_reject_modal" | "wfh_reject_modal";
  employeeName: string;
  dateRange: string;
  privateMetadata: string;
}) {
  return {
    type: "modal" as const,
    callback_id: params.callbackId,
    private_metadata: params.privateMetadata,
    title: { type: "plain_text" as const, text: "Reject Request" },
    submit: { type: "plain_text" as const, text: "Confirm Rejection" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Rejecting *${params.employeeName}*'s request\n*${params.dateRange}*`,
        },
      },
      {
        type: "input",
        optional: true,
        block_id: "rejection_reason",
        element: {
          type: "plain_text_input",
          action_id: "reason_input",
          multiline: true,
          placeholder: { type: "plain_text", text: "Add a reason (optional)..." },
          max_length: 500,
        },
        label: { type: "plain_text", text: "Reason for rejection" },
      },
    ],
  };
}
