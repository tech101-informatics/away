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
  const users = await User.find().populate("managerId", "name email").sort({ name: 1 }).lean();
  return NextResponse.json(users);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const { userId, role, managerId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (role) updateData.role = role;
  if (managerId !== undefined) updateData.managerId = (managerId && managerId !== "none") ? managerId : null;

  const user = await User.findByIdAndUpdate(userId, updateData, { new: true })
    .populate("managerId", "name email");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
