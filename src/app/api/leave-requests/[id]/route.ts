import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";
import { notifyEmployee, buildStatusUpdateMessage } from "@/lib/slack";
import { formatDateRange } from "@/lib/helpers";
import { format } from "date-fns";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await req.json();
  const { status, managerComment } = body;

  const leaveRequest = await LeaveRequest.findById(params.id);
  if (!leaveRequest) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }

  // Employee cancelling their own request
  if (status === "cancelled") {
    if (leaveRequest.employeeId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (leaveRequest.status !== "pending") {
      return NextResponse.json({ error: "Can only cancel pending requests" }, { status: 400 });
    }
    leaveRequest.status = "cancelled";
    await leaveRequest.save();
    return NextResponse.json(leaveRequest);
  }

  // Manager approving/rejecting
  if (
    session.user.role !== "admin" &&
    leaveRequest.managerId.toString() !== session.user.id
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (leaveRequest.status !== "pending") {
    return NextResponse.json({ error: "Request is no longer pending" }, { status: 400 });
  }

  leaveRequest.status = status;
  if (managerComment) leaveRequest.managerComment = managerComment;
  await leaveRequest.save();

  // If approved, update leave balance
  if (status === "approved") {
    await User.findOneAndUpdate(
      {
        _id: leaveRequest.employeeId,
        "leaveBalances.leaveType": leaveRequest.leaveType,
      },
      {
        $inc: {
          "leaveBalances.$.used": leaveRequest.numberOfDays,
          "leaveBalances.$.remaining": -leaveRequest.numberOfDays,
        },
      }
    );
  }

  // DM the employee about the decision
  const dates = formatDateRange(
    format(leaveRequest.startDate, "yyyy-MM-dd"),
    format(leaveRequest.endDate, "yyyy-MM-dd")
  );
  notifyEmployee(
    leaveRequest.employeeId.toString(),
    buildStatusUpdateMessage({
      requestType: "leave",
      status,
      dates,
      managerComment,
    })
  );

  return NextResponse.json(leaveRequest);
}
