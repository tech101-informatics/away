"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface YearSelectorProps {
  value: number;
  onChange: (year: number) => void;
  range?: number;
}

export function YearSelector({ value, onChange, range = 2 }: YearSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: range * 2 + 1 },
    (_, i) => currentYear - range + i
  );

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(parseInt(v))}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
