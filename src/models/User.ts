import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILeaveBalance {
  leaveType: string;
  allocated: number;
  used: number;
  remaining: number;
  carriedForward: number;
}

export interface IOptionalHolidaySelection {
  year: number;
  selectedHolidayIds: Types.ObjectId[];
  lockedAt?: Date;
  isLocked: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  googleId: string;
  image?: string;
  avatar?: string;
  role: "admin" | "manager" | "employee";
  managerId?: Types.ObjectId;
  joiningDate?: Date;
  onNoticePeriod: boolean;
  noticePeriodStartDate?: Date;
  isOnProbation: boolean;

  // Access control
  isActive: boolean;
  isApproved: boolean;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;

  // Slack linkage
  slackUserId?: string;
  slackEmail?: string;
  slackDisplayName?: string;
  slackAvatar?: string;
  slackLinkedAt?: Date;
  isSlackLinked: boolean;

  // Leave
  leaveBalances: ILeaveBalance[];
  optionalHolidaySelections: IOptionalHolidaySelection[];
  createdAt: Date;
  updatedAt: Date;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    leaveType: {
      type: String,
      enum: ["casual", "sick", "personal", "wfh", "optional", "unpaid"],
      required: true,
    },
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    carriedForward: { type: Number, default: 0 },
  },
  { _id: false }
);

const OptionalHolidaySelectionSchema = new Schema<IOptionalHolidaySelection>(
  {
    year: { type: Number, required: true },
    selectedHolidayIds: [{ type: Schema.Types.ObjectId, ref: "HolidayCalendar" }],
    lockedAt: { type: Date },
    isLocked: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, default: "" },
    image: { type: String },
    avatar: { type: String },
    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "employee",
    },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    joiningDate: { type: Date },
    onNoticePeriod: { type: Boolean, default: false },
    noticePeriodStartDate: { type: Date },
    isOnProbation: { type: Boolean, default: false },

    // Access control
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Slack
    slackUserId: { type: String, default: null },
    slackEmail: { type: String, default: null },
    slackDisplayName: { type: String, default: null },
    slackAvatar: { type: String, default: null },
    slackLinkedAt: { type: Date, default: null },
    isSlackLinked: { type: Boolean, default: false },

    // Leave
    leaveBalances: [LeaveBalanceSchema],
    optionalHolidaySelections: [OptionalHolidaySelectionSchema],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
