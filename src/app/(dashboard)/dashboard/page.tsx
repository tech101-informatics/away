"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Plane,
  Plus,
  Home,
  CalendarDays,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import { PageHeader } from "@/components/away/page-header";
import { DatePicker } from "@/components/away/date-picker";
import { LoadingTable } from "@/components/away/loading-cards";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import {
  leaveTypeLabels,
  leaveTypeColors,
  statusColors,
  formatDateRange,
  calculateWorkingDays,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface LeaveBalance {
  leaveType: string;
  allocated: number;
  used: number;
  remaining: number;
}

interface UserData {
  _id: string;
  leaveBalances: LeaveBalance[];
  managerId?: { _id: string; name: string };
}

interface HolidayCalendarData {
  holidays: Array<{
    _id: string;
    name: string;
    date: string;
    type: string;
    isOptional: boolean;
  }>;
  optionalHolidayQuota: number;
}

interface OptionalHolidayData {
  selectedHolidays: Array<{
    holidayId: string;
    date: string;
    name: string;
  }>;
}

interface RequestData {
  _id: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  numberOfDays?: number;
  reason: string;
  status: string;
  managerComment?: string;
  createdAt: string;
}

interface TeamTodayData {
  totalActive: number;
  inOffice: number;
  onLeave: Array<{ _id: string; name: string; image?: string; leaveType?: string; isHalfDay?: boolean }>;
  onWFH: Array<{ _id: string; name: string; image?: string; isHalfDay?: boolean }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdminOrManager = role === "admin" || role === "manager";
  const currentYear = new Date().getFullYear();

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [wfhDialogOpen, setWfhDialogOpen] = useState(false);

  // Leave form state
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveReason, setLeaveReason] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<string>("morning");

  // WFH form state
  const [wfhDate, setWfhDate] = useState<Date>();
  const [wfhEndDate, setWfhEndDate] = useState<Date>();
  const [wfhMultiDay, setWfhMultiDay] = useState(false);
  const [wfhReason, setWfhReason] = useState("");
  const [wfhHalfDay, setWfhHalfDay] = useState(false);
  const [wfhHalfDayPeriod, setWfhHalfDayPeriod] = useState<string>("morning");

  // Data fetching
  const { data: userData, refetch: refetchUser } = useFetch<UserData>(
    `/api/users?self=true`
  );
  const { data: holidays } = useFetch<HolidayCalendarData>(
    `/api/holidays/${currentYear}`
  );
  const { data: optionalSelections, refetch: refetchOptional } =
    useFetch<OptionalHolidayData>(`/api/optional-holidays?year=${currentYear}`);
  const {
    data: leaveRequests,
    loading: loadingLeave,
    refetch: refetchLeaveReqs,
  } = useFetch<RequestData[]>("/api/leave-requests?self=true");
  const {
    data: wfhRequests,
    loading: loadingWfh,
    refetch: refetchWfhReqs,
  } = useFetch<RequestData[]>("/api/wfh-requests?self=true");

  const { data: teamToday } = useFetch<TeamTodayData>(
    isAdminOrManager ? "/api/team/today" : ""
  );

  // Actions
  const leaveAction = useAction({
    successMessage: "Leave request submitted!",
    onSuccess: () => {
      setLeaveDialogOpen(false);
      resetLeaveForm();
      refetchLeaveReqs();
      refetchUser();
    },
  });

  const wfhAction = useAction({
    successMessage: "WFH request submitted!",
    onSuccess: () => {
      setWfhDialogOpen(false);
      resetWfhForm();
      refetchWfhReqs();
    },
  });

  const optionalAction = useAction({
    successMessage: "Optional holiday selected!",
    onSuccess: () => {
      refetchOptional();
    },
  });

  const cancelAction = useAction({
    successMessage: "Request cancelled",
    onSuccess: () => {
      refetchLeaveReqs();
      refetchWfhReqs();
      refetchUser();
    },
  });

  const resetLeaveForm = () => {
    setLeaveType("");
    setStartDate(undefined);
    setEndDate(undefined);
    setLeaveReason("");
    setIsHalfDay(false);
    setHalfDayPeriod("morning");
  };

  const resetWfhForm = () => {
    setWfhDate(undefined);
    setWfhEndDate(undefined);
    setWfhMultiDay(false);
    setWfhReason("");
    setWfhHalfDay(false);
    setWfhHalfDayPeriod("morning");
  };

  const handleLeaveSubmit = () => {
    if (!leaveType || !startDate || !leaveReason) {
      toast.error("Please fill all required fields");
      return;
    }
    const effectiveEnd = isHalfDay ? startDate : endDate;
    if (!effectiveEnd) {
      toast.error("Please select an end date");
      return;
    }
    leaveAction.execute("/api/leave-requests", {
      method: "POST",
      body: JSON.stringify({
        leaveType,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(effectiveEnd, "yyyy-MM-dd"),
        reason: leaveReason,
        isHalfDay,
        halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
      }),
    });
  };

  const handleWfhSubmit = async () => {
    if (!wfhDate || !wfhReason) {
      toast.error("Please fill all required fields");
      return;
    }

    if (wfhMultiDay && wfhEndDate) {
      // Submit one request per working day in range
      const days: Date[] = [];
      const current = new Date(wfhDate);
      while (current <= wfhEndDate) {
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          days.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      if (days.length === 0) {
        toast.error("No working days in selected range");
        return;
      }

      let submitted = 0;
      for (const day of days) {
        const result = await wfhAction.execute("/api/wfh-requests", {
          method: "POST",
          body: JSON.stringify({
            date: format(day, "yyyy-MM-dd"),
            reason: wfhReason,
            isHalfDay: false,
          }),
        });
        if (result) submitted++;
      }

      if (submitted > 0) {
        toast.success(`${submitted} WFH request${submitted > 1 ? "s" : ""} submitted`);
        setWfhDialogOpen(false);
        resetWfhForm();
        refetchWfhReqs();
      }
    } else {
      wfhAction.execute("/api/wfh-requests", {
        method: "POST",
        body: JSON.stringify({
          date: format(wfhDate, "yyyy-MM-dd"),
          reason: wfhReason,
          isHalfDay: wfhHalfDay,
          halfDayPeriod: wfhHalfDay ? wfhHalfDayPeriod : undefined,
        }),
      });
    }
  };

  const handleOptionalSelect = (holiday: { _id: string; name: string; date: string }) => {
    optionalAction.execute("/api/optional-holidays", {
      method: "POST",
      body: JSON.stringify({
        holidayId: holiday._id,
        date: holiday.date,
        name: holiday.name,
        year: currentYear,
      }),
    });
  };

  const handleOptionalDeselect = (holidayId: string) => {
    optionalAction.execute("/api/optional-holidays", {
      method: "DELETE",
      body: JSON.stringify({
        holidayId,
        year: currentYear,
      }),
    });
  };

  const handleCancel = (type: "leave" | "wfh", id: string) => {
    const url = type === "leave" ? `/api/leave-requests/${id}` : `/api/wfh-requests/${id}`;
    cancelAction.execute(url, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
  };

  const balances = userData?.leaveBalances || [];
  const optionalHolidays = holidays?.holidays?.filter((h) => h.isOptional) || [];
  const selectedIds = new Set(
    optionalSelections?.selectedHolidays?.map((h) => h.holidayId) || []
  );
  const quota = holidays?.optionalHolidayQuota || 2;
  const selectionsCount = optionalSelections?.selectedHolidays?.length || 0;

  const allRequests = [
    ...(leaveRequests || []).filter((r) => (r as unknown as Record<string, unknown>).source !== "import").map((r) => ({ ...r, requestType: "leave" as const })),
    ...(wfhRequests || []).map((r) => ({ ...r, requestType: "wfh" as const })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const isWeekendDay = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] || ""}!`}
        description="Here's your leave overview and quick actions."
      >
        <Dialog open={leaveDialogOpen} onOpenChange={(v) => { setLeaveDialogOpen(v); if (!v) leaveAction.clearErrors(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request to your manager.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              {/* Leave type + balance display */}
              <div className="space-y-2">
                <Label>Leave Type <span className="text-destructive">*</span></Label>
                <Select value={leaveType} onValueChange={(v) => { setLeaveType(v); setIsHalfDay(false); leaveAction.clearErrors(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(leaveTypeLabels).filter(([value]) => value !== "optional").map(([value, label]) => {
                      const bal = balances.find((b) => b.leaveType === value);
                      return (
                        <SelectItem key={value} value={value} label={label}>
                          <span className="flex items-center justify-between w-full gap-4">
                            <span>{label}</span>
                            {bal && (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {bal.remaining}/{bal.allocated}d
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {/* Balance info bar */}
                {leaveType && (() => {
                  const bal = balances.find((b) => b.leaveType === leaveType);
                  if (!bal) return null;
                  const pct = bal.allocated > 0 ? (bal.used / bal.allocated) * 100 : 0;
                  return (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Available balance</span>
                          <span className="text-sm font-bold tabular-nums text-primary">
                            {bal.remaining} <span className="text-xs font-normal text-muted-foreground">of {bal.allocated} days</span>
                          </span>
                        </div>
                        <div className="w-full bg-background rounded-full h-1.5">
                          <div
                            className={cn(
                              "rounded-full h-1.5 transition-all duration-300",
                              pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-amber-500" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <Separator />

              {/* Half day toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Half day leave</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Apply for morning or afternoon only</p>
                </div>
                <Switch
                  checked={isHalfDay}
                  onCheckedChange={(v) => {
                    setIsHalfDay(v);
                    if (v && startDate) setEndDate(startDate);
                  }}
                />
              </div>

              {/* Half day period selector */}
              {isHalfDay && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfDayPeriod("morning")}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors",
                      halfDayPeriod === "morning"
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Morning (1st half)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalfDayPeriod("afternoon")}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors",
                      halfDayPeriod === "afternoon"
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Afternoon (2nd half)
                  </button>
                </div>
              )}

              {/* Dates */}
              {isHalfDay ? (
                <div className="space-y-2">
                  <Label>Date <span className="text-destructive">*</span></Label>
                  <DatePicker
                    date={startDate}
                    onSelect={(d) => { setStartDate(d); setEndDate(d); }}
                    placeholder="Select date"
                    disabled={isWeekendDay}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date <span className="text-destructive">*</span></Label>
                    <DatePicker
                      date={startDate}
                      onSelect={setStartDate}
                      placeholder="Start"
                      disabled={isWeekendDay}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date <span className="text-destructive">*</span></Label>
                    <DatePicker
                      date={endDate}
                      onSelect={setEndDate}
                      placeholder="End"
                      disabled={(d) => isWeekendDay(d) || (startDate ? d < startDate : false)}
                    />
                  </div>
                </div>
              )}

              {/* Day count preview */}
              {!isHalfDay && startDate && endDate && (
                (() => {
                  const days = calculateWorkingDays(
                    format(startDate, "yyyy-MM-dd"),
                    format(endDate, "yyyy-MM-dd")
                  );
                  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const weekends = totalDays - days;
                  return (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 text-sm">
                      <span className="font-semibold text-primary tabular-nums">{days} working day{days !== 1 ? "s" : ""}</span>
                      {weekends > 0 && (
                        <span className="text-muted-foreground text-xs">({weekends} weekend{weekends !== 1 ? "s" : ""} excluded)</span>
                      )}
                    </div>
                  );
                })()
              )}
              {isHalfDay && startDate && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 text-sm">
                  <span className="font-semibold text-primary tabular-nums">0.5 day</span>
                  <span className="text-muted-foreground text-xs">({halfDayPeriod === "morning" ? "1st half" : "2nd half"})</span>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Brief reason for your leave..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
            {/* Error display */}
            {leaveAction.error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1 mb-2">
                <p className="text-sm font-medium text-destructive">{leaveAction.error}</p>
                {leaveAction.errors.length > 1 && (
                  <ul className="text-xs text-destructive/80 list-disc pl-4 space-y-0.5">
                    {leaveAction.errors.slice(1).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setLeaveDialogOpen(false); leaveAction.clearErrors(); }}>
                Cancel
              </Button>
              <Button onClick={handleLeaveSubmit} disabled={leaveAction.loading}>
                {leaveAction.loading ? "Submitting..." : isHalfDay ? "Submit Half Day" : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={wfhDialogOpen} onOpenChange={(v) => { setWfhDialogOpen(v); if (!v) wfhAction.clearErrors(); }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" /> Request WFH
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Work From Home</DialogTitle>
              <DialogDescription>
                Submit a WFH request for a specific day.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              {/* WFH balance display */}
              {(() => {
                const wfhBal = balances.find((b) => b.leaveType === "wfh");
                return wfhBal ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">WFH balance</span>
                        <span className="text-sm font-bold tabular-nums text-blue-600">
                          {wfhBal.remaining} <span className="text-xs font-normal text-muted-foreground">of {wfhBal.allocated} days</span>
                        </span>
                      </div>
                      <div className="w-full bg-background rounded-full h-1.5">
                        <div
                          className="bg-blue-500 rounded-full h-1.5 transition-all duration-300"
                          style={{ width: `${Math.min((wfhBal.used / wfhBal.allocated) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Multi-day toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Multiple days</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Request WFH for a date range</p>
                </div>
                <Switch checked={wfhMultiDay} onCheckedChange={(v) => { setWfhMultiDay(v); if (v) { setWfhHalfDay(false); } }} />
              </div>

              {/* Date(s) */}
              {wfhMultiDay ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date <span className="text-destructive">*</span></Label>
                    <DatePicker
                      date={wfhDate}
                      onSelect={setWfhDate}
                      placeholder="Start"
                      disabled={isWeekendDay}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date <span className="text-destructive">*</span></Label>
                    <DatePicker
                      date={wfhEndDate}
                      onSelect={setWfhEndDate}
                      placeholder="End"
                      disabled={(d) => isWeekendDay(d) || (wfhDate ? d < wfhDate : false)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Date <span className="text-destructive">*</span></Label>
                  <DatePicker
                    date={wfhDate}
                    onSelect={setWfhDate}
                    placeholder="Select date"
                    disabled={isWeekendDay}
                  />
                </div>
              )}

              {/* Day count preview for multi-day */}
              {wfhMultiDay && wfhDate && wfhEndDate && (
                (() => {
                  const days = calculateWorkingDays(
                    format(wfhDate, "yyyy-MM-dd"),
                    format(wfhEndDate, "yyyy-MM-dd")
                  );
                  return (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50/50 text-sm">
                      <span className="font-semibold text-blue-600 tabular-nums">{days} working day{days !== 1 ? "s" : ""}</span>
                      <span className="text-xs text-muted-foreground">({days} WFH request{days !== 1 ? "s" : ""} will be created)</span>
                    </div>
                  );
                })()
              )}

              <Separator />

              {/* Half day toggle (single day only) */}
              {!wfhMultiDay && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Half day WFH</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Work from home for half the day only</p>
                    </div>
                    <Switch checked={wfhHalfDay} onCheckedChange={setWfhHalfDay} />
                  </div>
                  {wfhHalfDay && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWfhHalfDayPeriod("morning")}
                        className={cn(
                          "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors",
                          wfhHalfDayPeriod === "morning"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        Morning (1st half)
                      </button>
                      <button
                        type="button"
                        onClick={() => setWfhHalfDayPeriod("afternoon")}
                        className={cn(
                          "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors",
                          wfhHalfDayPeriod === "afternoon"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        Afternoon (2nd half)
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Brief reason for WFH..."
                  value={wfhReason}
                  onChange={(e) => setWfhReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
            {/* Error display */}
            {wfhAction.error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1 mb-2">
                <p className="text-sm font-medium text-destructive">{wfhAction.error}</p>
                {wfhAction.errors.length > 1 && (
                  <ul className="text-xs text-destructive/80 list-disc pl-4 space-y-0.5">
                    {wfhAction.errors.slice(1).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setWfhDialogOpen(false); wfhAction.clearErrors(); }}>
                Cancel
              </Button>
              <Button onClick={handleWfhSubmit} disabled={wfhAction.loading}>
                {wfhAction.loading ? "Submitting..." : wfhHalfDay ? "Submit Half Day WFH" : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Team Status — admin/manager only */}
      {isAdminOrManager && teamToday && (
        <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Card className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{teamToday.totalActive}</p>
                  <p className="text-[11px] text-muted-foreground">Total</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{teamToday.inOffice}</p>
                  <p className="text-[11px] text-muted-foreground">In office</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Plane className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{teamToday.onLeave.length}</p>
                  <p className="text-[11px] text-muted-foreground">On leave</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Home className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{teamToday.onWFH.length}</p>
                  <p className="text-[11px] text-muted-foreground">WFH</p>
                </div>
              </div>
            </Card>
          </div>
          {(teamToday.onLeave.length > 0 || teamToday.onWFH.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {teamToday.onLeave.map((p) => (
                <div key={p._id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-xs">
                  <span className="font-medium">{p.name?.split(" ")[0]}</span>
                  <span className="text-amber-600 capitalize">{p.leaveType}</span>
                </div>
              ))}
              {teamToday.onWFH.map((p) => (
                <div key={p._id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-xs">
                  <span className="font-medium">{p.name?.split(" ")[0]}</span>
                  <span className="text-blue-600">WFH</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leave Balance Cards */}
      {balances.length === 0 && !loadingLeave ? (
        <Card className="mb-8">
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No leave balances configured yet.</p>
              <p className="text-sm">Contact your admin to set up leave policies.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
          {balances.map((balance) => {
            const pct = balance.allocated > 0
              ? ((balance.used / balance.allocated) * 100)
              : 0;
            return (
              <Card key={balance.leaveType} className="card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      className={cn(
                        "font-medium text-[11px]",
                        leaveTypeColors[balance.leaveType]
                      )}
                      variant="secondary"
                    >
                      {leaveTypeLabels[balance.leaveType] || balance.leaveType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-bold tracking-tight tabular-nums">
                      {balance.remaining}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {balance.allocated} days
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div
                      className={cn(
                        "rounded-full h-2 transition-all duration-500",
                        pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {balance.used} days used
                  </p>
                </CardContent>
              </Card>
            );
          })}

        </div>
      )}

      {/* Optional Holidays */}
      {optionalHolidays.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Optional Holidays</CardTitle>
                <CardDescription>
                  Select up to {quota} optional holidays for {currentYear}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {selectionsCount} / {quota} selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optionalHolidays.map((holiday) => {
                const isSelected = selectedIds.has(holiday._id);
                const canSelect = selectionsCount < quota;
                return (
                  <div
                    key={holiday._id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{holiday.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(holiday.date), "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Selected
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          disabled={optionalAction.loading}
                          onClick={() => handleOptionalDeselect(holiday._id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canSelect || optionalAction.loading}
                        onClick={() => handleOptionalSelect(holiday)}
                      >
                        Select
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Requests</CardTitle>
          <CardDescription>Your recent leave and WFH requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLeave && loadingWfh ? (
            <LoadingTable rows={3} />
          ) : allRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground/70">No requests yet</p>
              <p className="text-sm mt-1">Your leave and WFH requests will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRequests.slice(0, 10).map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        request.requestType === "leave"
                          ? "bg-indigo-50 text-indigo-600"
                          : "bg-blue-50 text-blue-600"
                      )}
                    >
                      {request.requestType === "leave" ? (
                        <Plane className="h-4 w-4" />
                      ) : (
                        <Home className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {request.requestType === "leave"
                          ? `${leaveTypeLabels[request.leaveType || ""] || request.leaveType} — ${request.numberOfDays} day${(request.numberOfDays || 0) > 1 ? "s" : ""}`
                          : "Work From Home"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {request.requestType === "leave" && request.startDate && request.endDate
                          ? formatDateRange(
                              format(new Date(request.startDate), "yyyy-MM-dd"),
                              format(new Date(request.endDate), "yyyy-MM-dd")
                            )
                          : request.date
                          ? format(new Date(request.date), "MMM d, yyyy")
                          : ""}
                      </p>
                      {request.status === "rejected" && request.managerComment && (
                        <p className="text-xs text-destructive mt-0.5">
                          Reason: {request.managerComment}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[11px] font-medium capitalize",
                        statusColors[request.status]
                      )}
                      variant="secondary"
                    >
                      {request.status}
                    </Badge>
                    {(request.status === "pending" || request.status === "approved") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          handleCancel(request.requestType, request._id)
                        }
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
