import { z } from "zod";

export const policyLeaveTypes = [
  "casual",
  "sick",
  "personal",
  "wfh",
  "optional",
  "unpaid",
] as const;

export type PolicyLeaveType = (typeof policyLeaveTypes)[number];

export const halfDayPeriods = ["morning", "afternoon"] as const;

export const LeaveRequestSchema = z.object({
  leaveType: z.enum(["casual", "sick", "personal", "optional", "unpaid"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(halfDayPeriods).optional(),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
});

export const WFHRequestSchema = z.object({
  date: z.string().min(1, "Date is required"),
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(halfDayPeriods).optional(),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(300),
});

export const OptionalHolidaySelectionSchema = z.object({
  year: z.number().min(2024).max(2100),
  holidayIds: z.array(z.string()).min(1).max(2),
});

export type LeaveRequestInput = z.infer<typeof LeaveRequestSchema>;
export type WFHRequestInput = z.infer<typeof WFHRequestSchema>;
export type OptionalHolidaySelectionInput = z.infer<typeof OptionalHolidaySelectionSchema>;
