interface PolicyAllocations {
  [leaveType: string]: number; // e.g. { casual: 12, sick: 6, wfh: 6, optional: 2 }
}

interface ProratedBalances {
  [leaveType: string]: number;
}

/**
 * Calculate prorated leave balances for a new joiner.
 * Formula: Math.ceil((remainingMonths / 12) * allocatedDays * 2) / 2
 * (rounds up to nearest 0.5)
 *
 * @param joiningDate - Employee's joining date
 * @param year - Target year for allocation
 * @param allocations - Map of leaveType → allocatedDays from DB policies
 */
export function calculateProratedLeaves(
  joiningDate: Date,
  year: number,
  allocations: PolicyAllocations
): ProratedBalances {
  const joiningMonth = joiningDate.getMonth();
  const joiningYear = joiningDate.getFullYear();

  // If joining year is before the target year, full allocation
  if (joiningYear < year) {
    return { ...allocations };
  }

  // If joining year is after target year, zero
  if (joiningYear > year) {
    const result: ProratedBalances = {};
    for (const type of Object.keys(allocations)) {
      result[type] = 0;
    }
    return result;
  }

  // Same year — prorate from joining month
  const remainingMonths = 12 - joiningMonth;

  const prorate = (allocated: number): number => {
    const raw = (remainingMonths / 12) * allocated;
    return Math.ceil(raw * 2) / 2;
  };

  const result: ProratedBalances = {};
  for (const [type, allocated] of Object.entries(allocations)) {
    if (type === "optional") {
      // Optional holidays: special logic
      const joiningDateObj = new Date(year, joiningMonth, joiningDate.getDate());
      const june30 = new Date(year, 5, 30);
      const oct1 = new Date(year, 9, 1);
      if (joiningDateObj <= june30) {
        result[type] = allocated; // full
      } else if (joiningDateObj < oct1) {
        result[type] = Math.min(1, allocated);
      } else {
        result[type] = 0;
      }
    } else {
      result[type] = prorate(allocated);
    }
  }

  return result;
}
