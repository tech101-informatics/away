import { z } from "zod";

export const leaveTypes = [
  "casual",
  "sick",
  "wfh",
  "optional",
  "unpaid",
] as const;

export type LeaveType = (typeof leaveTypes)[number];

export const roles = ["admin", "manager", "employee"] as const;
export type Role = (typeof roles)[number];

export const requestStatuses = ["pending", "approved", "rejected", "cancelled"] as const;
export type RequestStatus = (typeof requestStatuses)[number];

export const holidayTypes = ["national", "company", "optional"] as const;
export type HolidayType = (typeof holidayTypes)[number];

// Leave Policy
export const leavePolicySchema = z.object({
  leaveType: z.enum(leaveTypes),
  allocatedDays: z.number().min(0).max(365),
  carryForward: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Holiday
export const holidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(holidayTypes),
  isOptional: z.boolean().default(false),
});

export const holidayCalendarSchema = z.object({
  year: z.number().min(2020).max(2100),
  holidays: z.array(holidaySchema),
  optionalHolidayQuota: z.number().min(0).max(20).default(2),
});

// Leave Request
export const leaveRequestSchema = z.object({
  leaveType: z.enum(leaveTypes),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required").max(500),
});

// WFH Request
export const wfhRequestSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reason: z.string().min(1, "Reason is required").max(500),
});

// User update
export const userUpdateSchema = z.object({
  role: z.enum(roles).optional(),
  managerId: z.string().nullable().optional(),
});

// Optional holiday selection
export const optionalHolidaySelectionSchema = z.object({
  holidayId: z.string().min(1),
  date: z.string().min(1),
  name: z.string().min(1),
});

// Manager action
export const managerActionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  managerComment: z.string().max(500).optional(),
});

// Holiday calendar save (Calendarific import)
export const holidayCalendarSaveSchema = z.object({
  year: z.number().min(2020).max(2100),
  holidays: z.array(
    z.object({
      name: z.string().min(1),
      date: z.string().min(1),
      type: z.enum(holidayTypes),
      isOptional: z.boolean(),
    })
  ).min(1, "At least one holiday is required"),
  optionalHolidayQuota: z.number().min(0).max(20),
});
