import { connectDB } from "../db";
import User from "@/models/User";
import LeavePolicy from "@/models/LeavePolicy";
import { calculateProratedLeaves } from "../prorate";

interface ResetSummary {
  totalUsers: number;
  resetAt: Date;
  year: number;
  details: Array<{
    userId: string;
    name: string;
    prorated: boolean;
    noticePeriod: boolean;
  }>;
}

/**
 * Reset yearly leave balances for all active users.
 * Reads allocations from LeavePolicy documents in DB.
 */
export async function resetYearlyLeaveBalances(
  year: number
): Promise<ResetSummary> {
  await connectDB();

  // Fetch active policies from DB
  const policies = await LeavePolicy.find({ isActive: true }).lean();
  const allocations: Record<string, number> = {};
  for (const p of policies) {
    allocations[p.leaveType] = p.allocatedDays;
  }

  const users = await User.find();
  const summary: ResetSummary = {
    totalUsers: users.length,
    resetAt: new Date(),
    year,
    details: [],
  };

  for (const user of users) {
    const userData = user as {
      _id: { toString(): string };
      name: string;
      onNoticePeriod?: boolean;
      joiningDate?: Date;
    };

    let isProrated = false;
    let yearAllocations: Record<string, number>;

    if (userData.onNoticePeriod) {
      // On notice period — zero allocation
      yearAllocations = {};
      for (const type of Object.keys(allocations)) {
        yearAllocations[type] = 0;
      }
    } else if (userData.joiningDate) {
      const joiningYear = new Date(userData.joiningDate).getFullYear();
      if (joiningYear === year) {
        // New joiner — prorate
        yearAllocations = calculateProratedLeaves(
          new Date(userData.joiningDate),
          year,
          allocations
        );
        isProrated = true;
      } else {
        yearAllocations = { ...allocations };
      }
    } else {
      yearAllocations = { ...allocations };
    }

    const newBalances = Object.entries(yearAllocations).map(
      ([leaveType, allocated]) => ({
        leaveType,
        allocated,
        used: 0,
        remaining: allocated,
        carriedForward: 0,
      })
    );

    await User.findByIdAndUpdate(userData._id, {
      leaveBalances: newBalances,
    });

    summary.details.push({
      userId: userData._id.toString(),
      name: userData.name,
      prorated: isProrated,
      noticePeriod: !!userData.onNoticePeriod,
    });
  }

  return summary;
}
