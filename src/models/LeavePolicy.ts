import mongoose, { Schema, Document } from "mongoose";

export interface ILeavePolicy extends Document {
  leaveType: string;
  label: string;
  allocatedDays: number;
  carryForward: boolean;
  isActive: boolean;
  allowHalfDay: boolean;
  advanceNoticeDays: number;
  allowRetroactive: boolean;
  retroactiveLimitDays: number;
  allowDuringNoticePeriod: boolean;
  maxConsecutiveDays: number;
  maxDaysPerWeek: number;
  requiresApprovalBeyondQuota: boolean;
}

const LeavePolicySchema = new Schema<ILeavePolicy>(
  {
    leaveType: {
      type: String,
      enum: ["casual", "sick", "personal", "wfh", "optional", "unpaid"],
      required: true,
      unique: true,
    },
    label: { type: String, required: true },
    allocatedDays: { type: Number, required: true },
    carryForward: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    allowHalfDay: { type: Boolean, default: true },
    advanceNoticeDays: { type: Number, default: 0 },
    allowRetroactive: { type: Boolean, default: false },
    retroactiveLimitDays: { type: Number, default: 0 },
    allowDuringNoticePeriod: { type: Boolean, default: false },
    maxConsecutiveDays: { type: Number, default: 0 },
    maxDaysPerWeek: { type: Number, default: 0 },
    requiresApprovalBeyondQuota: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Force schema refresh in dev to pick up enum changes
if (mongoose.models.LeavePolicy) {
  delete (mongoose.models as Record<string, unknown>).LeavePolicy;
}

export default mongoose.model<ILeavePolicy>("LeavePolicy", LeavePolicySchema);
