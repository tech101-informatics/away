import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILeaveRequest extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  managerId: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "optional", "unpaid"],
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
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employeeId: 1, status: 1 });
LeaveRequestSchema.index({ managerId: 1, status: 1 });

export default mongoose.models.LeaveRequest ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
