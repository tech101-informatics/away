import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWFHRequest extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  managerId: Types.ObjectId;
  date: Date;
  isHalfDay: boolean;
  halfDayPeriod?: "morning" | "afternoon";
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  managerComment?: string;
  quotaExceeded: boolean;
  requiresManagerApproval: boolean;
  policyWarnings?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const WFHRequestSchema = new Schema<IWFHRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    isHalfDay: { type: Boolean, default: false },
    halfDayPeriod: { type: String, enum: ["morning", "afternoon"] },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    managerComment: { type: String },
    quotaExceeded: { type: Boolean, default: false },
    requiresManagerApproval: { type: Boolean, default: false },
    policyWarnings: [{ type: String }],
  },
  { timestamps: true }
);

WFHRequestSchema.index({ employeeId: 1, status: 1 });
WFHRequestSchema.index({ managerId: 1, status: 1 });
WFHRequestSchema.index({ employeeId: 1, date: 1 });

export default mongoose.models.WFHRequest ||
  mongoose.model<IWFHRequest>("WFHRequest", WFHRequestSchema);
