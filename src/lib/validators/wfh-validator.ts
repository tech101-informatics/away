import {
  parseISO,
  format,
  subDays,
  addDays,
  startOfDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { getLeavePolicyConfig, getPolicyForType } from "../leave-policy";

interface WFHPayload {
  date: string;
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

interface WFHRequestRecord {
  date: Date | string;
  status: string;
  isHalfDay?: boolean;
}

export interface WFHValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  quotaExceeded: boolean;
  requiresManagerApproval: boolean;
  consecutiveWarning: boolean;
}

export async function validateWFHRequest(
  payload: WFHPayload,
  user: UserData,
  recentWFHRequests: WFHRequestRecord[]
): Promise<WFHValidationResult> {
  const config = await getLeavePolicyConfig();
  const wfhPolicy = getPolicyForType(config, "wfh");
  const errors: string[] = [];
  const warnings: string[] = [];
  let quotaExceeded = false;
  let requiresManagerApproval = false;
  let consecutiveWarning = false;

  const requestDate = startOfDay(parseISO(payload.date));

  if (!wfhPolicy) {
    errors.push("WFH policy is not configured. Contact admin.");
    return { valid: false, errors, warnings, quotaExceeded: false, requiresManagerApproval: false, consecutiveWarning: false };
  }

  // 1. NOTICE PERIOD CHECK
  if (user.onNoticePeriod && !wfhPolicy.allowDuringNoticePeriod) {
    errors.push("WFH cannot be applied during notice period");
    return { valid: false, errors, warnings, quotaExceeded: false, requiresManagerApproval: false, consecutiveWarning: false };
  }

  // 2. CONSECUTIVE DAYS CHECK
  const maxConsecutive = wfhPolicy.maxConsecutiveDays;

  if (maxConsecutive > 0 && !payload.isHalfDay) {
    const wfhDateSet = new Set<string>();
    for (const req of recentWFHRequests) {
      if (req.status === "approved" || req.status === "pending") {
        if (!req.isHalfDay) {
          const dateStr =
            typeof req.date === "string"
              ? req.date.split("T")[0]
              : format(new Date(req.date), "yyyy-MM-dd");
          wfhDateSet.add(dateStr);
        }
      }
    }

    let consecutiveBefore = 0;
    for (let i = 1; i <= maxConsecutive; i++) {
      const prevDate = format(subDays(requestDate, i), "yyyy-MM-dd");
      if (wfhDateSet.has(prevDate)) {
        consecutiveBefore++;
      } else {
        break;
      }
    }

    if (consecutiveBefore >= maxConsecutive) {
      errors.push(
        `Cannot apply WFH for more than ${maxConsecutive} consecutive days`
      );
    }

    const nextDate = format(addDays(requestDate, 1), "yyyy-MM-dd");
    if (wfhDateSet.has(nextDate) && consecutiveBefore >= maxConsecutive - 1) {
      consecutiveWarning = true;
      warnings.push(
        "Approving this will result in consecutive WFH days reaching the limit"
      );
    }
  }

  // 3. WEEKLY LIMIT CHECK
  const maxPerWeek = wfhPolicy.maxDaysPerWeek;
  if (maxPerWeek > 0) {
    const weekStart = startOfWeek(requestDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(requestDate, { weekStartsOn: 1 });
    const weekCount = recentWFHRequests.filter((req) => {
      if (req.status !== "approved" && req.status !== "pending") return false;
      const d = typeof req.date === "string" ? new Date(req.date) : new Date(req.date);
      return d >= weekStart && d <= weekEnd;
    }).length;

    if (weekCount >= maxPerWeek) {
      errors.push(
        `Weekly WFH limit reached (max ${maxPerWeek} days per week)`
      );
    }
  }

  // 4. HALF DAY CHECK
  if (payload.isHalfDay && !wfhPolicy.allowHalfDay) {
    errors.push("WFH policy does not allow half-day requests");
  }

  // 5. BALANCE CHECK (yearly)
  const wfhBalance = user.leaveBalances.find((b) => b.leaveType === "wfh");
  const remaining = wfhBalance?.remaining ?? 0;
  const deduction = payload.isHalfDay ? 0.5 : 1;

  if (remaining < deduction) {
    quotaExceeded = true;
    if (wfhPolicy.requiresApprovalBeyondQuota) {
      requiresManagerApproval = true;
      warnings.push(
        "WFH quota exceeded. Request will require explicit manager approval."
      );
    } else {
      errors.push("WFH quota exhausted for this year");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    quotaExceeded,
    requiresManagerApproval,
    consecutiveWarning,
  };
}
