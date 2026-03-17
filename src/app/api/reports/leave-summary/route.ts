export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const users = await User.find().sort({ name: 1 }).lean();

  const rows = ["Name,Email,Leave Type,Allocated,Used,Remaining"];

  for (const user of users) {
    const u = user as { name: string; email: string; leaveBalances?: Array<{ leaveType: string; allocated: number; used: number; remaining: number }> };
    if (u.leaveBalances && u.leaveBalances.length > 0) {
      for (const balance of u.leaveBalances) {
        rows.push(
          `"${u.name}","${u.email}","${balance.leaveType}",${balance.allocated},${balance.used},${balance.remaining}`
        );
      }
    } else {
      rows.push(`"${u.name}","${u.email}","N/A",0,0,0`);
    }
  }

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leave-summary-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
