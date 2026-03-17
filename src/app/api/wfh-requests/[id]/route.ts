import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WFHRequest from "@/models/WFHRequest";
import { notifyEmployee, buildStatusUpdateMessage } from "@/lib/slack";
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
    if (wfhRequest.status !== "pending") {
      return NextResponse.json({ error: "Can only cancel pending requests" }, { status: 400 });
    }
    wfhRequest.status = "cancelled";
    await wfhRequest.save();
    return NextResponse.json(wfhRequest);
  }

  if (
    session.user.role !== "admin" &&
    wfhRequest.managerId.toString() !== session.user.id
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (wfhRequest.status !== "pending") {
    return NextResponse.json({ error: "Request is no longer pending" }, { status: 400 });
  }

  wfhRequest.status = status;
  if (managerComment) wfhRequest.managerComment = managerComment;
  await wfhRequest.save();

  // DM the employee about the decision
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
