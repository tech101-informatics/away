"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HolidayTypeSelectProps {
  value: string;
  onChange: (value: "national" | "company" | "optional") => void;
  size?: "sm" | "default";
}

export function HolidayTypeSelect({
  value,
  onChange,
  size = "default",
}: HolidayTypeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange as (v: string) => void}>
      <SelectTrigger
        className={size === "sm" ? "h-8 w-28 text-xs" : "w-36"}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="national">National</SelectItem>
        <SelectItem value="company">Company</SelectItem>
        <SelectItem value="optional">Optional</SelectItem>
      </SelectContent>
    </Select>
  );
}
