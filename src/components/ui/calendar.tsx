"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, CaptionProps, useNavigation } from "react-day-picker";
import { setMonth, setYear } from "date-fns";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function CustomCaption({ displayMonth }: CaptionProps) {
  const { goToMonth } = useNavigation();
  const currentYear = displayMonth.getFullYear();
  const currentMonth = displayMonth.getMonth();

  // Year range: 10 years back, 5 years forward
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => thisYear - 10 + i);

  return (
    <div className="flex items-center justify-between px-1">
      <button
        type="button"
        onClick={() => goToMonth(setMonth(displayMonth, currentMonth - 1))}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1">
        <select
          value={currentMonth}
          onChange={(e) => goToMonth(setMonth(displayMonth, parseInt(e.target.value)))}
          className="text-sm font-medium bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 pr-1"
        >
          {MONTHS.map((month, i) => (
            <option key={month} value={i}>{month}</option>
          ))}
        </select>
        <select
          value={currentYear}
          onChange={(e) => goToMonth(setYear(displayMonth, parseInt(e.target.value)))}
          className="text-sm font-medium bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => goToMonth(setMonth(displayMonth, currentMonth + 1))}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CustomCaption,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
