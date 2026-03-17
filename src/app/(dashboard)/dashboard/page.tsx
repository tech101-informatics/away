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
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
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
  } = useFetch<RequestData[]>("/api/leave-requests");
  const {
    data: wfhRequests,
    loading: loadingWfh,
    refetch: refetchWfhReqs,
  } = useFetch<RequestData[]>("/api/wfh-requests");

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

  const handleWfhSubmit = () => {
    if (!wfhDate || !wfhReason) {
      toast.error("Please fill all required fields");
      return;
    }
    wfhAction.execute("/api/wfh-requests", {
      method: "POST",
      body: JSON.stringify({
        date: format(wfhDate, "yyyy-MM-dd"),
        reason: wfhReason,
        isHalfDay: wfhHalfDay,
        halfDayPeriod: wfhHalfDay ? wfhHalfDayPeriod : undefined,
      }),
    });
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
    ...(leaveRequests || []).map((r) => ({ ...r, requestType: "leave" as const })),
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
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
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
                <Select value={leaveType} onValueChange={(v) => { setLeaveType(v); setIsHalfDay(false); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(leaveTypeLabels).map(([value, label]) => {
                      const bal = balances.find((b) => b.leaveType === value);
                      return (
                        <SelectItem key={value} value={value}>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLeaveSubmit} disabled={leaveAction.loading}>
                {leaveAction.loading ? "Submitting..." : isHalfDay ? "Submit Half Day" : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={wfhDialogOpen} onOpenChange={setWfhDialogOpen}>
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

              {/* Date */}
              <div className="space-y-2">
                <Label>Date <span className="text-destructive">*</span></Label>
                <DatePicker
                  date={wfhDate}
                  onSelect={setWfhDate}
                  placeholder="Select date"
                  disabled={isWeekendDay}
                />
              </div>

              <Separator />

              {/* Half day toggle */}
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setWfhDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleWfhSubmit} disabled={wfhAction.loading}>
                {wfhAction.loading ? "Submitting..." : wfhHalfDay ? "Submit Half Day WFH" : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

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
                      <Badge className="bg-primary/10 text-primary border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Selected
                      </Badge>
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
                    {request.status === "pending" && (
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
