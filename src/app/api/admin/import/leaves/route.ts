export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import LeaveRequest from "@/models/LeaveRequest";
import { ImportRowSchema } from "@/lib/schemas/import.schema";
import Papa from "papaparse";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin" && (session.user as { role: string }).role !== "manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    return NextResponse.json({
      error: "CSV parse error",
      details: parsed.errors.slice(0, 10),
    }, { status: 400 });
  }

  const rows = parsed.data as Record<string, string>[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  // Validate each row
  const validationErrors: Array<{ row: number; errors: string[] }> = [];
  const validRows: Array<{ index: number; data: ReturnType<typeof ImportRowSchema.parse> }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Convert duration to number for Zod
    const prepared = {
      ...row,
      duration: row.duration ? parseFloat(row.duration) : undefined,
    };
    const result = ImportRowSchema.safeParse(prepared);
    if (!result.success) {
      validationErrors.push({
        row: i + 2, // 1-indexed + header
        errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
    } else {
      validRows.push({ index: i, data: result.data });
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json({
      error: "Validation failed",
      validationErrors,
    }, { status: 422 });
  }

  await connectDB();

  // Match employee names
  const uniqueNames = Array.from(new Set(validRows.map((r) => r.data.employeeName)));
  const users = await User.find({ isActive: true }).lean();
  const userList = users.map((u) => ({
    id: (u as Record<string, unknown>)._id?.toString(),
    name: ((u as Record<string, unknown>).name as string || "").toLowerCase().trim(),
    firstName: ((u as Record<string, unknown>).name as string || "").split(" ")[0].toLowerCase().trim(),
  }));

  const nameToId: Record<string, string> = {};
  const unmatchedNames: string[] = [];

  for (const name of uniqueNames) {
    const searchName = name.toLowerCase().trim();
    const match =
      userList.find((u) => u.name === searchName) ||
      userList.find((u) => u.firstName === searchName.split(" ")[0]) ||
      userList.find((u) => u.name.includes(searchName) || searchName.includes(u.name));

    if (match && match.id) {
      nameToId[name] = match.id;
    } else {
      unmatchedNames.push(name);
    }
  }

  if (unmatchedNames.length > 0) {
    return NextResponse.json({
      error: "employee_not_found",
      unmatchedNames,
      message: "Please ensure all employees exist in Away before importing",
    }, { status: 422 });
  }

  // Duplicate check and import
  let imported = 0;
  let skipped = 0;
  const skippedRows: Array<{ name: string; date: string }> = [];
  const overdrawnEmployees: string[] = [];

  for (const { data: row } of validRows) {
    const employeeId = nameToId[row.employeeName];

    // Check duplicate
    const existing = await LeaveRequest.findOne({
      employeeId,
      startDate: new Date(row.leaveDate),
      source: "import",
    });

    if (existing) {
      skipped++;
      skippedRows.push({ name: row.employeeName, date: row.leaveDate });
      continue;
    }

    // Map legacy leave types to current ones
    const typeMap: Record<string, string> = { annual: "casual" };
    const mappedType = typeMap[row.leaveType] || row.leaveType;

    // Create leave request
    await LeaveRequest.create({
      employeeId,
      leaveType: mappedType,
      startDate: row.leaveDate,
      endDate: row.leaveDate,
      numberOfDays: row.duration,
      isHalfDay: row.isHalfDay,
      status: "approved",
      source: "import",
      originalType: row.originalType,
      submittedOn: row.submittedOn,
      reason: `Imported from historical records (${row.originalType})`,
      importedBy: session.user.id,
      importedAt: new Date(),
    });

    // Update balance
    const balanceUpdate = await User.findOneAndUpdate(
      {
        _id: employeeId,
        "leaveBalances.leaveType": mappedType,
      },
      {
        $inc: {
          "leaveBalances.$.used": row.duration,
          "leaveBalances.$.remaining": -row.duration,
        },
      },
      { new: true }
    );

    if (balanceUpdate) {
      const bal = (balanceUpdate.leaveBalances as Array<{ leaveType: string; remaining: number }>)
        .find((b) => b.leaveType === mappedType);
      if (bal && bal.remaining < 0) {
        if (!overdrawnEmployees.includes(row.employeeName)) {
          overdrawnEmployees.push(row.employeeName);
        }
      }
    }

    imported++;
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    skippedRows,
    overdrawnEmployees,
  });
}
