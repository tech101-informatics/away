import {
  eachDayOfInterval,
  isWeekend,
  parseISO,
  format,
  differenceInDays,
  isBefore,
  startOfDay,
} from "date-fns";
import { getLeavePolicyConfig, getPolicyForType } from "../leave-policy";

interface LeavePayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  reason: string;
}

interface UserData {
  onNoticePeriod?: boolean;
  leaveBalances: Array<{
    leaveType: string;
    allocated: number;
    used: number;
    remaining: number;
  }>;
}

interface PublicHoliday {
  name: string;
  date: string;
}

export interface LeaveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  unpaidDays: number;
  effectiveDays: number;
  weekendsExcluded: number;
  holidaysExcluded: string[];
}

export async function validateLeaveRequest(
  payload: LeavePayload,
  user: UserData,
  publicHolidays: PublicHoliday[]
): Promise<LeaveValidationResult> {
  const config = await getLeavePolicyConfig();
  const typePolicy = getPolicyForType(config, payload.leaveType);
  const errors: string[] = [];
  const warnings: string[] = [];
  let unpaidDays = 0;
  let weekendsExcluded = 0;
  const holidaysExcluded: string[] = [];

  const start = parseISO(payload.startDate);
  const end = parseISO(payload.endDate);
  const today = startOfDay(new Date());

  // Check policy exists
  if (!typePolicy && payload.leaveType !== "unpaid") {
    errors.push(`No active policy found for leave type: ${payload.leaveType}`);
    return { valid: false, errors, warnings, unpaidDays: 0, effectiveDays: 0, weekendsExcluded: 0, holidaysExcluded: [] };
  }

  // 1. NOTICE PERIOD CHECK
  if (user.onNoticePeriod && typePolicy && !typePolicy.allowDuringNoticePeriod) {
    errors.push("Leave cannot be applied during notice period");
    return { valid: false, errors, warnings, unpaidDays: 0, effectiveDays: 0, weekendsExcluded: 0, holidaysExcluded: [] };
  }

  // 2. PUBLIC HOLIDAY CHECK
  const holidayDateSet = new Set(publicHolidays.map((h) => h.date));
  const holidayNameMap = new Map(publicHolidays.map((h) => [h.date, h.name]));

  if (config.general.cannotApplyOnPublicHolidays) {
    const allDays = eachDayOfInterval({ start, end });
    for (const day of allDays) {
      const dayStr = format(day, "yyyy-MM-dd");
      if (holidayDateSet.has(dayStr) && !isWeekend(day)) {
        const hName = holidayNameMap.get(dayStr) || "a public holiday";
        holidaysExcluded.push(hName);
      }
    }
  }

  // 3. WEEKEND EXCLUSION
  const allDays = eachDayOfInterval({ start, end });
  const workingDays = allDays.filter((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    if (isWeekend(day)) {
      weekendsExcluded++;
      return false;
    }
    if (holidayDateSet.has(dayStr)) {
      return false;
    }
    return true;
  });

  const effectiveDays = payload.isHalfDay ? 0.5 : workingDays.length;

  if (effectiveDays <= 0) {
    errors.push("Selected dates fall entirely on weekends or public holidays");
    return { valid: false, errors, warnings, unpaidDays: 0, effectiveDays: 0, weekendsExcluded, holidaysExcluded };
  }

  // 4. ADVANCE NOTICE CHECK (from policy)
  if (typePolicy && typePolicy.advanceNoticeDays > 0) {
    const noticeDiff = differenceInDays(start, today);
    if (noticeDiff < typePolicy.advanceNoticeDays) {
      errors.push(
        `${typePolicy.label} requires at least ${typePolicy.advanceNoticeDays} day advance notice`
      );
    }
  }

  // 5. RETROACTIVE CHECK (from policy)
  if (isBefore(start, today)) {
    if (typePolicy && typePolicy.allowRetroactive) {
      const daysBack = differenceInDays(today, start);
      const limit = typePolicy.retroactiveLimitDays || 7;
      if (daysBack > limit) {
        errors.push(
          `${typePolicy.label} can only be applied retroactively up to ${limit} days`
        );
      }
    } else if (typePolicy) {
      errors.push(`${typePolicy.label} cannot be applied for past dates`);
    }
  }

  // 6. HALF DAY CHECK
  if (payload.isHalfDay) {
    if (typePolicy && !typePolicy.allowHalfDay) {
      errors.push(`${typePolicy.label} does not allow half-day applications`);
    }
    if (workingDays.length > 1) {
      errors.push("Half day leave can only be applied for a single day");
    }
  }

  // 7. BALANCE CHECK
  if (payload.leaveType !== "unpaid") {
    const balance = user.leaveBalances.find(
      (b) => b.leaveType === payload.leaveType
    );
    const remaining = balance?.remaining ?? 0;

    if (remaining < effectiveDays) {
      const excess = effectiveDays - remaining;
      unpaidDays = excess;
      warnings.push(
        `Insufficient ${typePolicy?.label || payload.leaveType} balance (${remaining} days available). ${excess} day(s) will be marked as unpaid leave.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    unpaidDays,
    effectiveDays,
    weekendsExcluded,
    holidaysExcluded,
  };
}
