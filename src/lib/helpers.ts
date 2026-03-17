import {
  eachDayOfInterval,
  isWeekend,
  parseISO,
  format,
} from "date-fns";

/**
 * Calculate the number of working days between two dates,
 * excluding weekends and public holidays.
 */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  publicHolidays: string[] = []
): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (start > end) return 0;

  const allDays = eachDayOfInterval({ start, end });
  const holidaySet = new Set(publicHolidays.map((d) => format(parseISO(d), "yyyy-MM-dd")));

  return allDays.filter((day) => {
    if (isWeekend(day)) return false;
    if (holidaySet.has(format(day, "yyyy-MM-dd"))) return false;
    return true;
  }).length;
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
    return format(start, "MMM d, yyyy");
  }
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export const leaveTypeLabels: Record<string, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  wfh: "Work From Home",
  optional: "Optional Holiday",
  unpaid: "Unpaid Leave",
};

export const leaveTypeColors: Record<string, string> = {
  casual: "bg-emerald-100 text-emerald-700",
  sick: "bg-rose-100 text-rose-700",
  wfh: "bg-blue-100 text-blue-700",
  optional: "bg-amber-100 text-amber-700",
  unpaid: "bg-gray-100 text-gray-700",
};

export const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-gray-100 text-gray-500",
};
