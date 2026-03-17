import mongoose, { Schema, Document } from "mongoose";

export interface IHoliday {
  _id?: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  type: "national" | "company" | "optional";
  isOptional: boolean;
}

export interface IHolidayCalendar extends Document {
  year: number;
  holidays: IHoliday[];
  optionalHolidayQuota: number;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ["national", "company", "optional"],
      required: true,
    },
    isOptional: { type: Boolean, default: false },
  },
);

const HolidayCalendarSchema = new Schema<IHolidayCalendar>(
  {
    year: { type: Number, required: true, unique: true },
    holidays: [HolidaySchema],
    optionalHolidayQuota: { type: Number, default: 2 },
  },
  { timestamps: true }
);

export default mongoose.models.HolidayCalendar ||
  mongoose.model<IHolidayCalendar>("HolidayCalendar", HolidayCalendarSchema);
