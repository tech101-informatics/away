import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/away";

async function seed() {
  console.log("🌱 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db!;

  // Clear existing seed data (policies & holidays only, preserve users)
  await db.collection("leavepolicies").deleteMany({});
  await db.collection("holidaycalendars").deleteMany({});

  console.log("📋 Seeding leave policies...");
  const now = new Date();
  await db.collection("leavepolicies").insertMany([
    {
      leaveType: "casual",
      label: "Casual Leave",
      allocatedDays: 12,
      carryForward: false,
      isActive: true,
      allowHalfDay: true,
      advanceNoticeDays: 1,
      allowRetroactive: false,
      retroactiveLimitDays: 0,
      allowDuringNoticePeriod: false,
      maxConsecutiveDays: 0,
      requiresApprovalBeyondQuota: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      leaveType: "sick",
      label: "Sick Leave",
      allocatedDays: 6,
      carryForward: false,
      isActive: true,
      allowHalfDay: true,
      advanceNoticeDays: 0,
      allowRetroactive: true,
      retroactiveLimitDays: 7,
      allowDuringNoticePeriod: false,
      maxConsecutiveDays: 0,
      requiresApprovalBeyondQuota: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      leaveType: "wfh",
      label: "Work From Home",
      allocatedDays: 6,
      carryForward: false,
      isActive: true,
      allowHalfDay: true,
      advanceNoticeDays: 0,
      allowRetroactive: false,
      retroactiveLimitDays: 0,
      allowDuringNoticePeriod: false,
      maxConsecutiveDays: 2,
      maxDaysPerWeek: 2,
      requiresApprovalBeyondQuota: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      leaveType: "optional",
      label: "Optional Holiday",
      allocatedDays: 2,
      carryForward: false,
      isActive: true,
      allowHalfDay: false,
      advanceNoticeDays: 0,
      allowRetroactive: false,
      retroactiveLimitDays: 0,
      allowDuringNoticePeriod: false,
      maxConsecutiveDays: 0,
      requiresApprovalBeyondQuota: false,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const currentYear = new Date().getFullYear();
  console.log(`📅 Seeding holiday calendar for ${currentYear}...`);

  await db.collection("holidaycalendars").insertOne({
    year: currentYear,
    optionalHolidayQuota: 2,
    holidays: [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "New Year's Day",
        date: new Date(`${currentYear}-01-01`),
        type: "national",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Republic Day",
        date: new Date(`${currentYear}-01-26`),
        type: "national",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Holi",
        date: new Date(`${currentYear}-03-14`),
        type: "national",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Good Friday",
        date: new Date(`${currentYear}-04-18`),
        type: "national",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "May Day",
        date: new Date(`${currentYear}-05-01`),
        type: "company",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Independence Day",
        date: new Date(`${currentYear}-08-15`),
        type: "national",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Gandhi Jayanti",
        date: new Date(`${currentYear}-10-02`),
        type: "national",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Diwali",
        date: new Date(`${currentYear}-10-20`),
        type: "national",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Christmas",
        date: new Date(`${currentYear}-12-25`),
        type: "national",
        isOptional: false,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Company Foundation Day",
        date: new Date(`${currentYear}-06-15`),
        type: "company",
        isOptional: false,
      },
      // Optional holidays
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Makar Sankranti",
        date: new Date(`${currentYear}-01-14`),
        type: "optional",
        isOptional: true,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Pongal",
        date: new Date(`${currentYear}-01-15`),
        type: "optional",
        isOptional: true,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Eid-ul-Fitr",
        date: new Date(`${currentYear}-03-31`),
        type: "optional",
        isOptional: true,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Raksha Bandhan",
        date: new Date(`${currentYear}-08-09`),
        type: "optional",
        isOptional: true,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Onam",
        date: new Date(`${currentYear}-09-05`),
        type: "optional",
        isOptional: true,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("✅ Seed complete!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
