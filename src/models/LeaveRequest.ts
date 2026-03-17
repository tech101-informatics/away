import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILeaveRequest extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  managerId?: Types.ObjectId;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  numberOfDays: number;
  isHalfDay: boolean;
  halfDayPeriod?: "morning" | "afternoon";
  unpaidDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  managerComment?: string;
  policyWarnings?: string[];
  source: "manual" | "import";
  originalType?: string;
  submittedOn?: string;
  importedBy?: Types.ObjectId;
  importedAt?: Date;
  adminChannelMessageTs?: string;
  managerDMChannelId?: string;
  managerDMMessageTs?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "personal", "optional", "unpaid", "annual", "wfh"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberOfDays: { type: Number, required: true },
    isHalfDay: { type: Boolean, default: false },
    halfDayPeriod: { type: String, enum: ["morning", "afternoon"] },
    unpaidDays: { type: Number, default: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    managerComment: { type: String },
    policyWarnings: [{ type: String }],
    source: { type: String, enum: ["manual", "import"], default: "manual" },
    originalType: { type: String, default: null },
    submittedOn: { type: String, default: null },
    importedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    importedAt: { type: Date, default: null },
    adminChannelMessageTs: { type: String, default: null },
    managerDMChannelId: { type: String, default: null },
    managerDMMessageTs: { type: String, default: null },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employeeId: 1, status: 1 });
LeaveRequestSchema.index({ managerId: 1, status: 1 });
LeaveRequestSchema.index({ employeeId: 1, startDate: 1, source: 1 });

// Force schema refresh — delete stale cached model in dev
if (mongoose.models.LeaveRequest) {
  delete (mongoose.models as Record<string, unknown>).LeaveRequest;
}

export default mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
