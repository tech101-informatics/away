"use client";

import { format } from "date-fns";
import { CalendarDays, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Holiday {
  _id?: string;
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

interface HolidayTableProps {
  holidays: Holiday[];
  onRemove?: (index: number) => void;
  readonly?: boolean;
}

const typeColors: Record<string, string> = {
  national: "bg-rose-100 text-rose-700",
  company: "bg-orange-100 text-orange-700",
  optional: "bg-yellow-100 text-yellow-700",
};

export function HolidayTable({
  holidays,
  onRemove,
  readonly = false,
}: HolidayTableProps) {
  const sorted = [...holidays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>No holidays saved for this year.</p>
        <p className="text-sm mt-1">Use Import to get started.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_140px_100px_80px_44px] sm:grid-cols-[1fr_160px_120px_100px_44px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
        <span>Holiday</span>
        <span>Date</span>
        <span>Type</span>
        <span>Optional</span>
        <span />
      </div>
      {/* Rows */}
      <div className="divide-y">
        {sorted.map((holiday) => {
          const originalIndex = holidays.indexOf(holiday);
          return (
            <div
              key={holiday._id || `${holiday.date}-${holiday.name}`}
              className="grid grid-cols-[1fr_140px_100px_80px_44px] sm:grid-cols-[1fr_160px_120px_100px_44px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
            >
              <span className="text-sm font-medium truncate">
                {holiday.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(holiday.date), "dd MMM yyyy")}
              </span>
              <Badge
                className={cn(
                  "text-[10px] capitalize w-fit",
                  typeColors[holiday.type] || "bg-gray-100 text-gray-600"
                )}
                variant="secondary"
              >
                {holiday.type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {holiday.isOptional ? "Yes" : "—"}
              </span>
              <div>
                {!readonly && onRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(originalIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
