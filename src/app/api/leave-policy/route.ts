export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LeavePolicy from "@/models/LeavePolicy";
import { invalidatePolicyCache } from "@/lib/leave-policy";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const policies = await LeavePolicy.find().sort({ leaveType: 1 }).lean();
  return NextResponse.json(policies);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();

  const existing = await LeavePolicy.findOne({ leaveType: body.leaveType });
  if (existing) {
    return NextResponse.json({ error: "Policy for this leave type already exists" }, { status: 409 });
  }

  const policy = await LeavePolicy.create(body);
  invalidatePolicyCache();
  return NextResponse.json(policy, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { _id, ...updateData } = body;

  if (!_id) {
    return NextResponse.json({ error: "_id is required" }, { status: 400 });
  }

  const policy = await LeavePolicy.findByIdAndUpdate(_id, updateData, { new: true });
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  invalidatePolicyCache();
  return NextResponse.json(policy);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const { _id } = await req.json();

  if (!_id) {
    return NextResponse.json({ error: "_id is required" }, { status: 400 });
  }

  await LeavePolicy.findByIdAndDelete(_id);
  invalidatePolicyCache();
  return NextResponse.json({ success: true });
}
