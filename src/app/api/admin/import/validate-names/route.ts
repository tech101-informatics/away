export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const { names } = await req.json();

  if (!Array.isArray(names)) {
    return NextResponse.json({ error: "names must be an array" }, { status: 400 });
  }

  const users = await User.find({ isActive: true }).lean();
  const userNames = users.map((u) => ({
    id: (u as Record<string, unknown>)._id?.toString(),
    name: ((u as Record<string, unknown>).name as string || "").toLowerCase().trim(),
    firstName: ((u as Record<string, unknown>).name as string || "").split(" ")[0].toLowerCase().trim(),
  }));

  const matched: string[] = [];
  const unmatched: string[] = [];
  const nameMap: Record<string, string> = {};

  for (const name of names) {
    const searchName = name.toLowerCase().trim();
    const exactMatch = userNames.find((u) => u.name === searchName);
    if (exactMatch) {
      matched.push(name);
      nameMap[name] = exactMatch.id!;
      continue;
    }
    // Try first name match
    const firstName = searchName.split(" ")[0];
    const firstNameMatch = userNames.find((u) => u.firstName === firstName);
    if (firstNameMatch) {
      matched.push(name);
      nameMap[name] = firstNameMatch.id!;
      continue;
    }
    // Try contains match
    const containsMatch = userNames.find((u) => u.name.includes(searchName) || searchName.includes(u.name));
    if (containsMatch) {
      matched.push(name);
      nameMap[name] = containsMatch.id!;
      continue;
    }
    unmatched.push(name);
  }

  return NextResponse.json({ matched, unmatched, nameMap });
}
