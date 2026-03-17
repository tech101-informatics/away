"use client";

import { useState, useMemo } from "react";

import {
  format,
  startOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWeekend,
  addMonths,
  subMonths,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { PageHeader } from "@/components/away/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";

interface HolidayCalendarData {
  holidays: Array<{
    _id: string;
    name: string;
    date: string;
    type: string;
    isOptional: boolean;
  }>;
}

interface LeaveRequestData {
  _id: string;
  employeeId: { _id: string; name: string; image?: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface WFHRequestData {
  _id: string;
  employeeId: { _id: string; name: string; image?: string };
  date: string;
  status: string;
}

interface OptionalHolidayData {
  selectedHolidays: Array<{
    holidayId: string;
    date: string;
    name: string;
  }>;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();

  const { data: holidays } = useFetch<HolidayCalendarData>(
    `/api/holidays/${year}`
  );
  const { data: leaveRequests } = useFetch<LeaveRequestData[]>("/api/leave-requests");
  const { data: wfhRequests } = useFetch<WFHRequestData[]>("/api/wfh-requests");
  const { data: optionalSelections } = useFetch<OptionalHolidayData>(
    `/api/optional-holidays?year=${year}`
  );

  const monthStart = startOfMonth(currentMonth);

  const weeks = useMemo(() => {
    const start = startOfWeek(monthStart);
    const days: Date[] = [];
    let current = start;
    while (days.length < 42) {
      days.push(current);
      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      // Only include week if at least one day is in current month
      if (week.some((d) => isSameMonth(d, currentMonth))) {
        result.push(week);
      }
    }
    return result;
  }, [monthStart, currentMonth]);

  // Build a map: date string -> events
  const eventMap = useMemo(() => {
    const map: Record<string, Array<{ type: string; label: string; color: string; pillColor?: string }>> = {};

    const addEvent = (dateStr: string, event: { type: string; label: string; color: string; pillColor?: string }) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };

    // Holidays — these render as prominent pills
    (holidays?.holidays || []).forEach((h) => {
      const dateStr = format(new Date(h.date), "yyyy-MM-dd");
      const pillColors: Record<string, string> = {
        national: "bg-rose-500 text-white",
        company: "bg-orange-500 text-white",
        optional: "bg-yellow-400 text-yellow-900",
      };
      addEvent(dateStr, {
        type: "holiday",
        label: h.name,
        color: "bg-rose-500",
        pillColor: pillColors[h.type] || "bg-gray-400 text-white",
      });
    });

    // Selected optional holidays
    (optionalSelections?.selectedHolidays || []).forEach((h) => {
      const dateStr = format(new Date(h.date), "yyyy-MM-dd");
      addEvent(dateStr, {
        type: "optional-selected",
        label: h.name,
        color: "bg-yellow-400",
        pillColor: "bg-yellow-400 text-yellow-900",
      });
    });

    // Leave requests
    (leaveRequests || []).forEach((lr) => {
      if (lr.status !== "approved" && lr.status !== "pending") return;
      const start = new Date(lr.startDate);
      const end = new Date(lr.endDate);
      const days = eachDayOfInterval({ start, end });
      days.forEach((d) => {
        if (!isWeekend(d)) {
          const dateStr = format(d, "yyyy-MM-dd");
          addEvent(dateStr, {
            type: "leave",
            label: `${lr.employeeId?.name || "You"} - Leave`,
            color: lr.status === "approved" ? "bg-emerald-500" : "bg-gray-300",
          });
        }
      });
    });

    // WFH requests
    (wfhRequests || []).forEach((wr) => {
      if (wr.status !== "approved" && wr.status !== "pending") return;
      const dateStr = format(new Date(wr.date), "yyyy-MM-dd");
      addEvent(dateStr, {
        type: "wfh",
        label: `${wr.employeeId?.name || "You"} - WFH`,
        color: wr.status === "approved" ? "bg-blue-500" : "bg-gray-300",
      });
    });

    return map;
  }, [holidays, leaveRequests, wfhRequests, optionalSelections]);

  const today = new Date();

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="View holidays, leaves, and WFH days at a glance."
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-3 h-3 rounded-full shrink-0 bg-rose-500" />
          <span className="text-muted-foreground">National</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-3 h-3 rounded-full shrink-0 bg-orange-500" />
          <span className="text-muted-foreground">Company</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-3 h-3 rounded-full shrink-0 bg-yellow-500" />
          <span className="text-muted-foreground">Optional</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-3 h-3 rounded-full shrink-0 bg-emerald-500" />
          <span className="text-muted-foreground">Approved Leave</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-3 h-3 rounded-full shrink-0 bg-blue-500" />
          <span className="text-muted-foreground">Approved WFH</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-3 h-3 rounded-full shrink-0 bg-gray-300" />
          <span className="text-muted-foreground">Pending</span>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xl">
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {weeks.flat().map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const events = eventMap[dateStr] || [];
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const weekend = isWeekend(day);
              const hasHoliday = events.some((e) => e.type === "holiday" || e.type === "optional-selected");
              const holidayEvents = events.filter((e) => e.type === "holiday" || e.type === "optional-selected");
              const otherEvents = events.filter((e) => e.type !== "holiday" && e.type !== "optional-selected");

              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[72px] sm:min-h-[100px] p-1.5 bg-card transition-colors",
                    !isCurrentMonth && "opacity-40",
                    weekend && "bg-muted/40",
                    hasHoliday && "bg-rose-50/70",
                    isToday && "ring-2 ring-primary/50 ring-inset bg-primary/[0.03]"
                  )}
                >
                  <div
                    className={cn(
                      "text-xs font-medium mb-1",
                      isToday
                        ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                        : hasHoliday
                        ? "text-rose-600 font-semibold"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {/* Holidays render as prominent colored pills */}
                    {holidayEvents.slice(0, 2).map((event, j) => (
                      <div
                        key={`h-${j}`}
                        className={cn(
                          "rounded px-1 py-0.5 text-[10px] sm:text-[11px] font-semibold leading-tight truncate",
                          event.pillColor || "bg-rose-500 text-white"
                        )}
                        title={event.label}
                      >
                        {event.label}
                      </div>
                    ))}
                    {/* Other events render as dot + text */}
                    {otherEvents.slice(0, hasHoliday ? 1 : 3).map((event, j) => (
                      <div
                        key={`e-${j}`}
                        className="flex items-center gap-1"
                        title={event.label}
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            event.color
                          )}
                        />
                        <span className="text-[11px] truncate leading-tight text-muted-foreground">
                          {event.label}
                        </span>
                      </div>
                    ))}
                    {events.length > (hasHoliday ? 3 : 3) && (
                      <span className="text-[10px] text-muted-foreground">
                        +{events.length - (hasHoliday ? 3 : 3)} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
