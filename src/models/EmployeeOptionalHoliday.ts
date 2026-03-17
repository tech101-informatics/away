import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISelectedHoliday {
  holidayId: Types.ObjectId;
  date: Date;
  name: string;
}

export interface IEmployeeOptionalHoliday extends Document {
  employeeId: Types.ObjectId;
  year: number;
  selectedHolidays: ISelectedHoliday[];
}

const SelectedHolidaySchema = new Schema<ISelectedHoliday>(
  {
    holidayId: { type: Schema.Types.ObjectId, required: true },
    date: { type: Date, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const EmployeeOptionalHolidaySchema = new Schema<IEmployeeOptionalHoliday>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    selectedHolidays: [SelectedHolidaySchema],
  },
  { timestamps: true }
);

EmployeeOptionalHolidaySchema.index({ employeeId: 1, year: 1 }, { unique: true });

export default mongoose.models.EmployeeOptionalHoliday ||
  mongoose.model<IEmployeeOptionalHoliday>(
    "EmployeeOptionalHoliday",
    EmployeeOptionalHolidaySchema
  );
