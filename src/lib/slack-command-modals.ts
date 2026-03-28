import { format, addDays } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");
const tomorrow = () => format(addDays(new Date(), 1), "yyyy-MM-dd");

export function buildLeaveModal() {
  return {
    type: "modal" as const,
    callback_id: "slash_leave_submit",
    title: { type: "plain_text" as const, text: "Apply for Leave" },
    submit: { type: "plain_text" as const, text: "Submit Request" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "leave_type",
        element: {
          type: "static_select",
          action_id: "leave_type_select",
          placeholder: { type: "plain_text", text: "Select leave type" },
          options: [
            { text: { type: "plain_text", text: "Casual Leave" }, value: "casual" },
            { text: { type: "plain_text", text: "Sick Leave" }, value: "sick" },
            { text: { type: "plain_text", text: "Personal Leave" }, value: "personal" },
          ],
        },
        label: { type: "plain_text", text: "Leave Type" },
      },
      {
        type: "input",
        block_id: "start_date",
        element: {
          type: "datepicker",
          action_id: "start_date_pick",
          initial_date: tomorrow(),
          placeholder: { type: "plain_text", text: "Select start date" },
        },
        label: { type: "plain_text", text: "Start Date" },
      },
      {
        type: "input",
        block_id: "end_date",
        element: {
          type: "datepicker",
          action_id: "end_date_pick",
          initial_date: tomorrow(),
          placeholder: { type: "plain_text", text: "Select end date" },
        },
        label: { type: "plain_text", text: "End Date" },
      },
      {
        type: "input",
        block_id: "half_day",
        optional: true,
        element: {
          type: "static_select",
          action_id: "half_day_select",
          placeholder: { type: "plain_text", text: "Full day (default)" },
          options: [
            { text: { type: "plain_text", text: "Full Day" }, value: "full" },
            { text: { type: "plain_text", text: "Half Day - Morning" }, value: "morning" },
            { text: { type: "plain_text", text: "Half Day - Afternoon" }, value: "afternoon" },
          ],
        },
        label: { type: "plain_text", text: "Duration" },
      },
      {
        type: "input",
        block_id: "reason",
        element: {
          type: "plain_text_input",
          action_id: "reason_input",
          multiline: true,
          min_length: 5,
          max_length: 500,
          placeholder: { type: "plain_text", text: "Reason for leave..." },
        },
        label: { type: "plain_text", text: "Reason" },
      },
    ],
  };
}

export function buildWFHModal() {
  return {
    type: "modal" as const,
    callback_id: "slash_wfh_submit",
    title: { type: "plain_text" as const, text: "Request WFH" },
    submit: { type: "plain_text" as const, text: "Submit Request" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "wfh_date",
        element: {
          type: "datepicker",
          action_id: "wfh_date_pick",
          initial_date: today(),
          placeholder: { type: "plain_text", text: "Select date" },
        },
        label: { type: "plain_text", text: "Date" },
      },
      {
        type: "input",
        block_id: "half_day",
        optional: true,
        element: {
          type: "static_select",
          action_id: "half_day_select",
          placeholder: { type: "plain_text", text: "Full day (default)" },
          options: [
            { text: { type: "plain_text", text: "Full Day" }, value: "full" },
            { text: { type: "plain_text", text: "Half Day - Morning" }, value: "morning" },
            { text: { type: "plain_text", text: "Half Day - Afternoon" }, value: "afternoon" },
          ],
        },
        label: { type: "plain_text", text: "Duration" },
      },
      {
        type: "input",
        block_id: "reason",
        element: {
          type: "plain_text_input",
          action_id: "reason_input",
          multiline: true,
          min_length: 5,
          max_length: 300,
          placeholder: { type: "plain_text", text: "Reason for WFH..." },
        },
        label: { type: "plain_text", text: "Reason" },
      },
    ],
  };
}

export function buildBalanceBlocks(balances: Array<{ leaveType: string; allocated: number; used: number; remaining: number }>) {
  if (balances.length === 0) {
    return [
      {
        type: "section",
        text: { type: "mrkdwn", text: "No leave balances configured. Contact your admin." },
      },
    ];
  }

  const lines = balances.map((b) => {
    const bar = "█".repeat(Math.round((b.used / Math.max(b.allocated, 1)) * 10));
    const empty = "░".repeat(10 - bar.length);
    return `*${capitalize(b.leaveType)}*: ${b.remaining}/${b.allocated} remaining  ${bar}${empty}  (${b.used} used)`;
  });

  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: ":bar_chart: *Your Leave Balances*\n\n" + lines.join("\n") },
    },
  ];
}

export function buildHelpBlocks() {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":wave: *Away — Slash Commands*\n\n" +
          "`/away leave` — Apply for leave\n" +
          "`/away wfh` — Request work from home\n" +
          "`/away balance` — Check your leave balances\n" +
          "`/away help` — Show this help message\n\n" +
          "Or visit <" + (process.env.NEXT_PUBLIC_APP_URL || "https://away.storepecker.com") + "|Away Dashboard>",
      },
    },
  ];
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
