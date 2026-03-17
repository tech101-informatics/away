import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WFHRequest from "@/models/WFHRequest";
import User from "@/models/User";
import { notifyEmployee, buildStatusUpdateMessage, sendAdminChannelMessage } from "@/lib/slack";
import { format } from "date-fns";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await req.json();
  const { status, managerComment } = body;

  const wfhRequest = await WFHRequest.findById(params.id);
  if (!wfhRequest) {
    return NextResponse.json({ error: "WFH request not found" }, { status: 404 });
  }

  if (status === "cancelled") {
    if (wfhRequest.employeeId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (wfhRequest.status !== "pending" && wfhRequest.status !== "approved") {
      return NextResponse.json({ error: "Can only cancel pending or approved requests" }, { status: 400 });
    }

    const wasApproved = wfhRequest.status === "approved";
    wfhRequest.status = "cancelled";
    await wfhRequest.save();

    // Restore balance if was approved
    if (wasApproved) {
      const deduction = wfhRequest.isHalfDay ? 0.5 : 1;
      await User.findOneAndUpdate(
        { _id: wfhRequest.employeeId, "leaveBalances.leaveType": "wfh" },
        {
          $inc: {
            "leaveBalances.$.used": -deduction,
            "leaveBalances.$.remaining": deduction,
          },
        }
      );
    }

    // Notify admin channel
    const employee = await User.findById(wfhRequest.employeeId);
    if (employee) {
      sendAdminChannelMessage({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:no_entry_sign: *WFH Cancelled*\n*${employee.name}* cancelled WFH on ${format(wfhRequest.date, "MMM d, yyyy")}${wasApproved ? " — balance restored" : ""}`,
            },
          },
        ],
        fallbackText: `${employee.name} cancelled their WFH request`,
      });
    }

    return NextResponse.json(wfhRequest);
  }

  // Manager approving/rejecting
  if (
    session.user.role !== "admin" &&
    wfhRequest.managerId?.toString() !== session.user.id
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (wfhRequest.status !== "pending") {
    return NextResponse.json({ error: "Request is no longer pending" }, { status: 400 });
  }

  wfhRequest.status = status;
  if (managerComment) wfhRequest.managerComment = managerComment;
  await wfhRequest.save();

  // If approved, update WFH balance
  if (status === "approved") {
    const deduction = wfhRequest.isHalfDay ? 0.5 : 1;
    await User.findOneAndUpdate(
      { _id: wfhRequest.employeeId, "leaveBalances.leaveType": "wfh" },
      {
        $inc: {
          "leaveBalances.$.used": deduction,
          "leaveBalances.$.remaining": -deduction,
        },
      }
    );
  }

  // DM the employee
  notifyEmployee(
    wfhRequest.employeeId.toString(),
    buildStatusUpdateMessage({
      requestType: "wfh",
      status,
      dates: format(wfhRequest.date, "MMM d, yyyy"),
      managerComment,
    })
  );

  return NextResponse.json(wfhRequest);
}
