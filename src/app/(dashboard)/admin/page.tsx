"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Users,
  FileText,
  Home,
  CalendarDays,
  BarChart3,
  Plus,
  Trash2,
  Download,
  Save,
  Shield,
  UserCog,
  User as UserIcon,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { PageHeader } from "@/components/away/page-header";
import { DatePicker } from "@/components/away/date-picker";
import { LoadingTable } from "@/components/away/loading-cards";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { leaveTypeLabels } from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface UserData {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  managerId?: { _id: string; name: string; email: string };
}

interface LeavePolicyData {
  _id: string;
  leaveType: string;
  label: string;
  allocatedDays: number;
  carryForward: boolean;
  isActive: boolean;
  maxConsecutiveDays: number;
  maxDaysPerWeek: number;
  requiresApprovalBeyondQuota: boolean;
}

interface HolidayData {
  _id: string;
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

interface HolidayCalendarData {
  year: number;
  holidays: HolidayData[];
  optionalHolidayQuota: number;
}

const currentYear = new Date().getFullYear();

export default function AdminPage() {
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Data fetching
  const { data: users, loading: loadingUsers, refetch: refetchUsers } =
    useFetch<UserData[]>("/api/users");
  const { data: leavePolicies, loading: loadingPolicies, refetch: refetchPolicies } =
    useFetch<LeavePolicyData[]>("/api/leave-policy");
  const { data: holidays, refetch: refetchHolidays } =
    useFetch<HolidayCalendarData>(`/api/holidays/${selectedYear}`);

  // User management state
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editManager, setEditManager] = useState("");

  // Leave policy state
  const [newPolicyOpen, setNewPolicyOpen] = useState(false);
  const [newPolicyType, setNewPolicyType] = useState("");
  const [newPolicyDays, setNewPolicyDays] = useState("");
  const [newPolicyCarry, setNewPolicyCarry] = useState(false);

  // Holiday state
  const [newHolidayOpen, setNewHolidayOpen] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState<Date>();
  const [newHolidayType, setNewHolidayType] = useState("national");

  // WFH policy state (reads from LeavePolicy where leaveType === "wfh")
  const wfhPolicyData = (leavePolicies || []).find((p) => p.leaveType === "wfh");
  const [wfhYearly, setWfhYearly] = useState("");
  const [wfhPerWeek, setWfhPerWeek] = useState("");
  const [wfhConsecutive, setWfhConsecutive] = useState("");
  const [wfhApproval, setWfhApproval] = useState(false);
  const [wfhInited, setWfhInited] = useState(false);

  // Sync WFH form when data loads
  if (wfhPolicyData && !wfhInited) {
    setWfhYearly(String(wfhPolicyData.allocatedDays));
    setWfhPerWeek(String(wfhPolicyData.maxDaysPerWeek || 0));
    setWfhConsecutive(String(wfhPolicyData.maxConsecutiveDays || 0));
    setWfhApproval(!!wfhPolicyData.requiresApprovalBeyondQuota);
    setWfhInited(true);
  }

  // Actions
  const userAction = useAction({
    successMessage: "User updated!",
    onSuccess: () => { setEditingUser(null); refetchUsers(); },
  });
  const policyAction = useAction({
    successMessage: "Policy saved!",
    onSuccess: () => { setNewPolicyOpen(false); resetPolicyForm(); refetchPolicies(); },
  });
  const deletePolicyAction = useAction({
    successMessage: "Policy deleted",
    onSuccess: () => refetchPolicies(),
  });
  const holidayAction = useAction({
    successMessage: "Holiday saved!",
    onSuccess: () => { setNewHolidayOpen(false); resetHolidayForm(); refetchHolidays(); },
  });
  const deleteHolidayAction = useAction({
    successMessage: "Holiday removed",
    onSuccess: () => refetchHolidays(),
  });
  const wfhAction = useAction({
    successMessage: "WFH policy updated!",
    onSuccess: () => refetchPolicies(),
  });

  const resetPolicyForm = () => {
    setNewPolicyType("");
    setNewPolicyDays("");
    setNewPolicyCarry(false);
  };

  const resetHolidayForm = () => {
    setNewHolidayName("");
    setNewHolidayDate(undefined);
    setNewHolidayType("national");
  };

  const handleWfhSave = () => {
    const payload = {
      leaveType: "wfh",
      label: "Work From Home",
      allocatedDays: parseInt(wfhYearly) || 6,
      carryForward: false,
      isActive: true,
      allowHalfDay: true,
      advanceNoticeDays: 0,
      allowRetroactive: false,
      retroactiveLimitDays: 0,
      allowDuringNoticePeriod: false,
      maxConsecutiveDays: parseInt(wfhConsecutive) || 0,
      maxDaysPerWeek: parseInt(wfhPerWeek) || 0,
      requiresApprovalBeyondQuota: wfhApproval,
    };

    if (wfhPolicyData) {
      wfhAction.execute("/api/leave-policy", {
        method: "PATCH",
        body: JSON.stringify({ _id: wfhPolicyData._id, ...payload }),
      });
    } else {
      wfhAction.execute("/api/leave-policy", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
  };

  const handleUserUpdate = () => {
    if (!editingUser) return;
    userAction.execute("/api/users", {
      method: "PATCH",
      body: JSON.stringify({
        userId: editingUser._id,
        role: editRole || undefined,
        managerId: editManager || null,
      }),
    });
  };

  const handleCreatePolicy = () => {
    if (!newPolicyType || !newPolicyDays) {
      toast.error("Fill all fields");
      return;
    }
    policyAction.execute("/api/leave-policy", {
      method: "POST",
      body: JSON.stringify({
        leaveType: newPolicyType,
        label: leaveTypeLabels[newPolicyType] || newPolicyType,
        allocatedDays: parseInt(newPolicyDays),
        carryForward: newPolicyCarry,
        isActive: true,
        allowHalfDay: true,
        advanceNoticeDays: 0,
        allowRetroactive: false,
        retroactiveLimitDays: 0,
        allowDuringNoticePeriod: false,
        maxConsecutiveDays: 0,
        maxDaysPerWeek: 0,
        requiresApprovalBeyondQuota: false,
      }),
    });
  };

  const handleDeletePolicy = (id: string) => {
    deletePolicyAction.execute("/api/leave-policy", {
      method: "DELETE",
      body: JSON.stringify({ _id: id }),
    });
  };

  const handleAddHoliday = () => {
    if (!newHolidayName || !newHolidayDate) {
      toast.error("Fill all fields");
      return;
    }
    holidayAction.execute(`/api/holidays/${selectedYear}`, {
      method: "POST",
      body: JSON.stringify({
        holiday: {
          name: newHolidayName,
          date: format(newHolidayDate, "yyyy-MM-dd"),
          type: newHolidayType,
        },
      }),
    });
  };

  const handleDeleteHoliday = (holidayId: string) => {
    deleteHolidayAction.execute(`/api/holidays/${selectedYear}`, {
      method: "DELETE",
      body: JSON.stringify({ holidayId }),
    });
  };

  const handleExportCSV = () => {
    window.open("/api/reports/leave-summary", "_blank");
  };

  const managers = (users || []).filter((u) => u.role === "manager" || u.role === "admin");

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <Shield className="h-3.5 w-3.5" />,
    manager: <UserCog className="h-3.5 w-3.5" />,
    employee: <UserIcon className="h-3.5 w-3.5" />,
  };

  const roleColors: Record<string, string> = {
    admin: "bg-violet-100 text-violet-700",
    manager: "bg-blue-100 text-blue-700",
    employee: "bg-gray-100 text-gray-600",
  };

  const holidayTypeColors: Record<string, string> = {
    national: "bg-rose-100 text-rose-700",
    company: "bg-orange-100 text-orange-700",
    optional: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div>
      <PageHeader title="Admin Panel" description="Manage users, policies, and holidays." />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="leave-policy" className="gap-2">
            <FileText className="h-4 w-4" /> Leave Policy
          </TabsTrigger>
          <TabsTrigger value="wfh-policy" className="gap-2">
            <Home className="h-4 w-4" /> WFH Policy
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Holidays
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Management</CardTitle>
              <CardDescription>
                Manage roles and assign managers. {users?.length || 0} total users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <LoadingTable rows={5} />
              ) : (
                <div className="space-y-2">
                  {(users || []).map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.image} />
                          <AvatarFallback className="text-xs">
                            {user.name?.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={cn("gap-1 text-[11px] capitalize", roleColors[user.role])}
                          variant="secondary"
                        >
                          {roleIcons[user.role]}
                          {user.role}
                        </Badge>
                        {user.managerId && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            Manager: {user.managerId.name}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser(user);
                            setEditRole(user.role);
                            setEditManager(user.managerId?._id || "");
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Policy Tab */}
        <TabsContent value="leave-policy">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Leave Policies</CardTitle>
                <CardDescription>Configure leave types and allocations.</CardDescription>
              </div>
              <Dialog open={newPolicyOpen} onOpenChange={setNewPolicyOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> Add Policy
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Leave Policy</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Leave Type <span className="text-destructive">*</span></Label>
                      <Select value={newPolicyType} onValueChange={setNewPolicyType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(leaveTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Allocated Days (per year) <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        value={newPolicyDays}
                        onChange={(e) => setNewPolicyDays(e.target.value)}
                        min={0}
                        max={365}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={newPolicyCarry} onCheckedChange={setNewPolicyCarry} />
                      <Label>Allow carry forward</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewPolicyOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePolicy} disabled={policyAction.loading}>
                      {policyAction.loading ? "Saving..." : "Create Policy"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingPolicies ? (
                <LoadingTable rows={4} />
              ) : (leavePolicies || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-foreground/70">No leave policies configured</p>
                  <p className="text-sm mt-1">Add a policy to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(leavePolicies || []).map((policy) => (
                    <div
                      key={policy._id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {leaveTypeLabels[policy.leaveType] || policy.leaveType}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {policy.allocatedDays} days/year
                            </span>
                            {policy.carryForward && (
                              <Badge variant="outline" className="text-[10px]">
                                Carry forward
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                policy.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-500"
                              )}
                            >
                              {policy.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeletePolicy(policy._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WFH Policy Tab */}
        <TabsContent value="wfh-policy">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">WFH Policy</CardTitle>
              <CardDescription>
                Configure yearly WFH quota and weekly limits. WFH is tracked on a yearly basis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-6">
                <div className="space-y-2">
                  <Label>Total WFH Days Per Year <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={wfhYearly}
                    onChange={(e) => setWfhYearly(e.target.value)}
                    min={0}
                    max={365}
                    placeholder="6"
                  />
                  <p className="text-xs text-muted-foreground">Yearly WFH quota allocated to each employee</p>
                </div>
                <div className="space-y-2">
                  <Label>Max WFH Days Per Week</Label>
                  <Input
                    type="number"
                    value={wfhPerWeek}
                    onChange={(e) => setWfhPerWeek(e.target.value)}
                    min={0}
                    max={7}
                    placeholder="2"
                  />
                  <p className="text-xs text-muted-foreground">0 = no weekly limit</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Consecutive WFH Days</Label>
                  <Input
                    type="number"
                    value={wfhConsecutive}
                    onChange={(e) => setWfhConsecutive(e.target.value)}
                    min={0}
                    max={30}
                    placeholder="2"
                  />
                  <p className="text-xs text-muted-foreground">0 = no consecutive limit</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require manager approval beyond quota</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Allow requests beyond yearly quota with manager approval</p>
                  </div>
                  <Switch checked={wfhApproval} onCheckedChange={setWfhApproval} />
                </div>
                <Button onClick={handleWfhSave} disabled={wfhAction.loading} className="gap-2">
                  <Save className="h-4 w-4" />
                  {wfhAction.loading ? "Saving..." : wfhPolicyData ? "Update Policy" : "Create Policy"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-4">
              <div>
                <CardTitle className="text-lg">Holiday Calendar — {selectedYear}</CardTitle>
                <CardDescription>
                  {holidays?.holidays?.length || 0} holidays configured.
                  Optional quota: {holidays?.optionalHolidayQuota || 2}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={newHolidayOpen} onOpenChange={setNewHolidayOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-4 w-4" /> Add Holiday
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Holiday</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Holiday Name <span className="text-destructive">*</span></Label>
                        <Input
                          value={newHolidayName}
                          onChange={(e) => setNewHolidayName(e.target.value)}
                          placeholder="e.g. Republic Day"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date <span className="text-destructive">*</span></Label>
                        <DatePicker
                          date={newHolidayDate}
                          onSelect={setNewHolidayDate}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newHolidayType} onValueChange={setNewHolidayType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="national">National</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewHolidayOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddHoliday} disabled={holidayAction.loading}>
                        {holidayAction.loading ? "Adding..." : "Add Holiday"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {(holidays?.holidays || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-foreground/70">No holidays for {selectedYear}</p>
                  <p className="text-sm mt-1">Add holidays or import from the Holiday Calendar page.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(holidays?.holidays || [])
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((holiday) => (
                    <div
                      key={holiday._id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{holiday.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(holiday.date), "EEEE, MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "text-[11px] capitalize",
                            holidayTypeColors[holiday.type]
                          )}
                          variant="secondary"
                        >
                          {holiday.type}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteHoliday(holiday._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reports</CardTitle>
              <CardDescription>
                Export leave usage data for all employees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Export Leave Summary (CSV)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update role and manager for {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select value={editManager} onValueChange={setEditManager}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {managers
                    .filter((m) => m._id !== editingUser?._id)
                    .map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUserUpdate} disabled={userAction.loading}>
              {userAction.loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
