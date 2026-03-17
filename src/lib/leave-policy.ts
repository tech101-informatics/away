import { connectDB } from "./db";
import LeavePolicy from "@/models/LeavePolicy";
import type { ILeavePolicy } from "@/models/LeavePolicy";

export interface PolicyRule {
  leaveType: string;
  label: string;
  allocatedDays: number;
  carryForward: boolean;
  isActive: boolean;
  allowHalfDay: boolean;
  advanceNoticeDays: number;
  allowRetroactive: boolean;
  retroactiveLimitDays: number;
  allowDuringNoticePeriod: boolean;
  maxConsecutiveDays: number;
  maxDaysPerWeek: number;
  requiresApprovalBeyondQuota: boolean;
}

export interface LeavePolicyConfig {
  policies: PolicyRule[];
  general: {
    weekendsExcludedFromDateRange: boolean;
    publicHolidaysExcludedFromDateRange: boolean;
    cannotApplyOnPublicHolidays: boolean;
  };
}

// In-memory cache with TTL
let cachedConfig: LeavePolicyConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load all leave policies from MongoDB.
 * Caches in memory for 5 minutes.
 */
export async function getLeavePolicyConfig(): Promise<LeavePolicyConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  await connectDB();
  const docs: ILeavePolicy[] = await LeavePolicy.find({ isActive: true }).lean();

  const policies: PolicyRule[] = docs.map((d) => ({
    leaveType: d.leaveType,
    label: d.label || d.leaveType,
    allocatedDays: d.allocatedDays,
    carryForward: d.carryForward,
    isActive: d.isActive,
    allowHalfDay: d.allowHalfDay ?? true,
    advanceNoticeDays: d.advanceNoticeDays ?? 0,
    allowRetroactive: d.allowRetroactive ?? false,
    retroactiveLimitDays: d.retroactiveLimitDays ?? 0,
    allowDuringNoticePeriod: d.allowDuringNoticePeriod ?? false,
    maxConsecutiveDays: d.maxConsecutiveDays ?? 0,
    maxDaysPerWeek: d.maxDaysPerWeek ?? 0,
    requiresApprovalBeyondQuota: d.requiresApprovalBeyondQuota ?? false,
  }));

  cachedConfig = {
    policies,
    general: {
      weekendsExcludedFromDateRange: true,
      publicHolidaysExcludedFromDateRange: true,
      cannotApplyOnPublicHolidays: true,
    },
  };

  cacheTimestamp = now;
  return cachedConfig;
}

/** Get a single leave type's policy. Returns null if not found. */
export function getPolicyForType(
  config: LeavePolicyConfig,
  leaveType: string
): PolicyRule | null {
  return config.policies.find((p) => p.leaveType === leaveType) || null;
}

/** Invalidate the cached policy (call after admin edits). */
export function invalidatePolicyCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}
