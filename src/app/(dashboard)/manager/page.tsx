"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Check,
  X,
  Clock,
  Plane,
  Home,
  MessageSquare,
  Users,
  Building2,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/away/page-header";
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

function ExpandableText({ text, limit = 120 }: { text: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > limit;

  if (!isLong) return <span>{text}</span>;

  return (
    <span>
      {expanded ? text : text.slice(0, limit) + "..."}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="ml-1 text-primary text-xs font-medium hover:underline"
      >
        {expanded ? "less" : "more"}
      </button>
    </span>
  );
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface LeaveRequestData {
  _id: string;
  employeeId: Employee;
  managerId: { _id: string; name: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: string;
  managerComment?: string;
  createdAt: string;
}

interface WFHRequestData {
  _id: string;
  employeeId: Employee;
  managerId: { _id: string; name: string };
  date: string;
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

export default function ManagerPage() {
  const [actionDialog, setActionDialog] = useState<{
    type: "leave" | "wfh";
    id: string;
    action: "approved" | "rejected";
    employeeName: string;
  } | null>(null);
  const [comment, setComment] = useState("");

  const {
    data: leaveRequests,
    loading: loadingLeave,
    refetch: refetchLeave,
  } = useFetch<LeaveRequestData[]>("/api/leave-requests");

  const {
    data: wfhRequests,
    loading: loadingWfh,
    refetch: refetchWfh,
  } = useFetch<WFHRequestData[]>("/api/wfh-requests");

  const { data: teamToday } = useFetch<TeamTodayData>("/api/team/today");

  const managerAction = useAction({
    onSuccess: () => {
      setActionDialog(null);
      setComment("");
      refetchLeave();
      refetchWfh();
    },
  });

  const handleAction = () => {
    if (!actionDialog) return;
    const url =
      actionDialog.type === "leave"
        ? `/api/leave-requests/${actionDialog.id}`
        : `/api/wfh-requests/${actionDialog.id}`;

    managerAction.execute(url, {
      method: "PATCH",
      body: JSON.stringify({
        status: actionDialog.action,
        managerComment: comment || undefined,
      }),
    });
  };

  const pendingLeave = (leaveRequests || []).filter((r) => r.status === "pending");
  const pastLeave = (leaveRequests || []).filter((r) => r.status !== "pending");
  const pendingWfh = (wfhRequests || []).filter((r) => r.status === "pending");
  const pastWfh = (wfhRequests || []).filter((r) => r.status !== "pending");

  const pendingCount = pendingLeave.length + pendingWfh.length;

  // Find who else is on leave/WFH on a given date range
  const approvedLeaves = (leaveRequests || []).filter((r) => r.status === "approved");
  const approvedWfh = (wfhRequests || []).filter((r) => r.status === "approved");

  const getOthersOnLeave = (startDate: string, endDate: string, excludeId: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return approvedLeaves
      .filter((r) => {
        if (r.employeeId?._id === excludeId) return false;
        const rStart = new Date(r.startDate).getTime();
        const rEnd = new Date(r.endDate).getTime();
        return rStart <= end && rEnd >= start;
      })
      .map((r) => ({ name: r.employeeId?.name, type: r.leaveType }));
  };

  const getOthersOnWfh = (date: string, excludeId: string) => {
    const d = format(new Date(date), "yyyy-MM-dd");
    return approvedWfh
      .filter((r) => {
        if (r.employeeId?._id === excludeId) return false;
        return format(new Date(r.date), "yyyy-MM-dd") === d;
      })
      .map((r) => ({ name: r.employeeId?.name }));
  };

  return (
    <div>
      <PageHeader
        title="Team Requests"
        description="Review and manage leave and WFH requests from your team."
      >
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 text-sm px-3 py-1">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {pendingCount} pending
          </Badge>
        )}
      </PageHeader>

      {/* Team Status Today */}
      {teamToday && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{teamToday.totalActive}</p>
                <p className="text-xs text-muted-foreground">Total team</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{teamToday.inOffice}</p>
                <p className="text-xs text-muted-foreground">In office</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Plane className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{teamToday.onLeave.length}</p>
                <p className="text-xs text-muted-foreground">On leave</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Home className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{teamToday.onWFH.length}</p>
                <p className="text-xs text-muted-foreground">WFH today</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Who's Away */}
      {teamToday && (teamToday.onLeave.length > 0 || teamToday.onWFH.length > 0) && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Who&apos;s away today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {teamToday.onLeave.map((person) => (
                <div key={person._id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={person.image} />
                    <AvatarFallback className="text-[10px]">{person.name?.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{person.name?.split(" ")[0]}</span>
                  <span className="text-xs text-amber-600 capitalize">{person.leaveType}{person.isHalfDay ? " (half)" : ""}</span>
                </div>
              ))}
              {teamToday.onWFH.map((person) => (
                <div key={person._id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={person.image} />
                    <AvatarFallback className="text-[10px]">{person.name?.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{person.name?.split(" ")[0]}</span>
                  <span className="text-xs text-blue-600">WFH{person.isHalfDay ? " (half)" : ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leave" className="space-y-4 md:space-y-6">
        <TabsList>
          <TabsTrigger value="leave" className="gap-2">
            <Plane className="h-4 w-4" />
            Leave Requests
            {pendingLeave.length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                {pendingLeave.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="wfh" className="gap-2">
            <Home className="h-4 w-4" />
            WFH Requests
            {pendingWfh.length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                {pendingWfh.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave">
          {loadingLeave ? (
            <LoadingTable rows={4} />
          ) : (
            <div className="space-y-4 md:space-y-6">
              {/* Pending */}
              {pendingLeave.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Pending Approval
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingLeave.map((req) => (
                      <div
                        key={req._id}
                        className="p-4 rounded-lg border bg-amber-50/80 border-amber-200/60 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 mt-0.5 shrink-0">
                            <AvatarImage src={req.employeeId?.image} />
                            <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                              {req.employeeId?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium">{req.employeeId?.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <Badge
                                className={cn(
                                  "text-[11px]",
                                  leaveTypeColors[req.leaveType]
                                )}
                                variant="secondary"
                              >
                                {leaveTypeLabels[req.leaveType]}
                              </Badge>
                              <span className="text-xs sm:text-sm font-medium text-foreground">
                                {formatDateRange(
                                  format(new Date(req.startDate), "yyyy-MM-dd"),
                                  format(new Date(req.endDate), "yyyy-MM-dd")
                                )}
                              </span>
                              <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                                ({req.numberOfDays}d)
                              </span>
                            </div>
                            {req.reason && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 flex items-start gap-1">
                                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <ExpandableText text={req.reason} />
                              </p>
                            )}
                            {(() => {
                              const others = getOthersOnLeave(req.startDate, req.endDate, req.employeeId?._id);
                              if (others.length === 0) return null;
                              return (
                                <p className="text-[11px] text-amber-700 mt-1.5">
                                  Also off: {others.map((o) => o.name?.split(" ")[0]).join(", ")}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex gap-2 sm:justify-end">
                          <Button
                            size="sm"
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() =>
                              setActionDialog({
                                type: "leave",
                                id: req._id,
                                action: "approved",
                                employeeName: req.employeeId?.name,
                              })
                            }
                          >
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() =>
                              setActionDialog({
                                type: "leave",
                                id: req._id,
                                action: "rejected",
                                employeeName: req.employeeId?.name,
                              })
                            }
                          >
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">History</CardTitle>
                  <CardDescription>Past leave requests from your team</CardDescription>
                </CardHeader>
                <CardContent>
                  {pastLeave.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="font-medium text-foreground/70">No past requests</p>
                      <p className="text-sm mt-1">Resolved requests will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pastLeave.slice(0, 20).map((req) => (
                        <div
                          key={req._id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={req.employeeId?.image} />
                              <AvatarFallback className="text-xs">
                                {req.employeeId?.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {req.employeeId?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {leaveTypeLabels[req.leaveType]} &middot;{" "}
                                {formatDateRange(
                                  format(new Date(req.startDate), "yyyy-MM-dd"),
                                  format(new Date(req.endDate), "yyyy-MM-dd")
                                )}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              "text-[11px] capitalize",
                              statusColors[req.status]
                            )}
                            variant="secondary"
                          >
                            {req.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="wfh">
          {loadingWfh ? (
            <LoadingTable rows={4} />
          ) : (
            <div className="space-y-4 md:space-y-6">
              {pendingWfh.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Pending Approval
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingWfh.map((req) => (
                      <div
                        key={req._id}
                        className="p-4 rounded-lg border bg-amber-50/80 border-amber-200/60 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 mt-0.5 shrink-0">
                            <AvatarImage src={req.employeeId?.image} />
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                              {req.employeeId?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium">{req.employeeId?.name}</p>
                            <p className="text-xs sm:text-sm font-medium text-foreground mt-1">
                              {format(new Date(req.date), "EEE, MMM d, yyyy")}
                            </p>
                            {req.reason && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 flex items-start gap-1">
                                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <ExpandableText text={req.reason} />
                              </p>
                            )}
                            {(() => {
                              const othersLeave = getOthersOnLeave(req.date, req.date, req.employeeId?._id);
                              const othersWfh = getOthersOnWfh(req.date, req.employeeId?._id);
                              const all = [...othersLeave.map((o) => `${o.name?.split(" ")[0]} (leave)`), ...othersWfh.map((o) => `${o.name?.split(" ")[0]} (WFH)`)];
                              if (all.length === 0) return null;
                              return (
                                <p className="text-[11px] text-amber-700 mt-1.5">
                                  Also off: {all.join(", ")}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex gap-2 sm:justify-end">
                          <Button
                            size="sm"
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() =>
                              setActionDialog({
                                type: "wfh",
                                id: req._id,
                                action: "approved",
                                employeeName: req.employeeId?.name,
                              })
                            }
                          >
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() =>
                              setActionDialog({
                                type: "wfh",
                                id: req._id,
                                action: "rejected",
                                employeeName: req.employeeId?.name,
                              })
                            }
                          >
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">History</CardTitle>
                  <CardDescription>Past WFH requests from your team</CardDescription>
                </CardHeader>
                <CardContent>
                  {pastWfh.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="font-medium text-foreground/70">No past requests</p>
                      <p className="text-sm mt-1">Resolved requests will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pastWfh.slice(0, 20).map((req) => (
                        <div
                          key={req._id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={req.employeeId?.image} />
                              <AvatarFallback className="text-xs">
                                {req.employeeId?.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {req.employeeId?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                WFH &middot;{" "}
                                {format(new Date(req.date), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              "text-[11px] capitalize",
                              statusColors[req.status]
                            )}
                            variant="secondary"
                          >
                            {req.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setComment(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "approved" ? "Approve" : "Reject"} Request
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === "approved"
                ? `Approve ${actionDialog?.employeeName}'s request?`
                : `Reject ${actionDialog?.employeeName}'s request?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{actionDialog?.action === "rejected" ? "Reason for rejection" : "Comment"} <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setActionDialog(null); setComment(""); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={managerAction.loading}
              className={
                actionDialog?.action === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }
            >
              {managerAction.loading
                ? "Processing..."
                : actionDialog?.action === "approved"
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
