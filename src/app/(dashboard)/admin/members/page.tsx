"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  MessageSquare,
  Clock,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  Plane,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/away/page-header";
import { DatePicker } from "@/components/away/date-picker";
import { LoadingTable } from "@/components/away/loading-cards";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

interface LeaveBalanceData {
  leaveType: string;
  allocated: number;
  used: number;
  remaining: number;
}

interface MemberData {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  isActive: boolean;
  isApproved: boolean;
  isSlackLinked: boolean;
  slackDisplayName?: string;
  slackAvatar?: string;
  joiningDate?: string;
  managerId?: { _id: string; name: string; email: string };
  leaveBalances?: LeaveBalanceData[];
}

interface LeaveRecordData {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  isHalfDay: boolean;
  reason: string;
  status: string;
  source?: string;
  createdAt: string;
}

interface SlackMemberData {
  slackUserId: string;
  slackDisplayName: string;
  slackEmail: string;
  slackAvatar: string;
  isStorepeckerEmail: boolean;
  alreadyAdded: boolean;
}

export default function AdminMembersPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [slackSearch, setSlackSearch] = useState("");
  const [selectedSlack, setSelectedSlack] = useState<SlackMemberData | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [editLeavesMember, setEditLeavesMember] = useState<MemberData | null>(null);
  const [editBalances, setEditBalances] = useState<Array<{ leaveType: string; allocated: string; used: string }>>([]);
  const [manualAddOpen, setManualAddOpen] = useState(false);

  // View member records
  const [viewMember, setViewMember] = useState<MemberData | null>(null);
  const [memberRecords, setMemberRecords] = useState<LeaveRecordData[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Add leave for member
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  const [addLeaveDate, setAddLeaveDate] = useState<Date>();
  const [addLeaveType, setAddLeaveType] = useState("casual");
  const [addLeaveReason, setAddLeaveReason] = useState("");
  const [addLeaveHalfDay, setAddLeaveHalfDay] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualRole, setManualRole] = useState<string>("employee");
  const [manualManager, setManualManager] = useState("");
  const [manualJoiningDate, setManualJoiningDate] = useState<Date>();

  // Add form state
  const [workEmail, setWorkEmail] = useState("");
  const [addRole, setAddRole] = useState<string>("employee");
  const [addManager, setAddManager] = useState("");
  const [addJoiningDate, setAddJoiningDate] = useState<Date>();

  const { data: members, loading: loadingMembers, refetch: refetchMembers } =
    useFetch<MemberData[]>("/api/admin/members");

  const [slackMembers, setSlackMembers] = useState<SlackMemberData[] | null>(null);
  const [loadingSlack, setLoadingSlack] = useState(false);

  const addAction = useAction({
    successMessage: "Member added successfully!",
    onSuccess: () => {
      setSelectedSlack(null);
      resetAddForm();
      refetchMembers();
    },
  });

  const deactivateAction = useAction({
    successMessage: "Member deactivated",
    onSuccess: () => { setDeactivateId(null); refetchMembers(); },
  });

  const reactivateAction = useAction({
    successMessage: "Member reactivated",
    onSuccess: () => refetchMembers(),
  });

  const roleAction = useAction({
    successMessage: "Updated",
    onSuccess: () => refetchMembers(),
  });

  const manualAddAction = useAction({
    successMessage: "Member added!",
    onSuccess: () => {
      setManualAddOpen(false);
      setManualName("");
      setManualEmail("");
      setManualRole("employee");
      setManualManager("");
      setManualJoiningDate(undefined);
      refetchMembers();
    },
  });

  const handleManualAdd = () => {
    if (!manualName || !manualEmail || !manualJoiningDate) {
      toast.error("Please fill all required fields");
      return;
    }
    const allowedDomain = "storepecker.me";
    if (!manualEmail.endsWith(`@${allowedDomain}`)) {
      toast.error(`Email must end with @${allowedDomain}`);
      return;
    }
    manualAddAction.execute("/api/admin/members", {
      method: "POST",
      body: JSON.stringify({
        slackUserId: "",
        slackEmail: "",
        slackDisplayName: manualName,
        workEmail: manualEmail,
        role: manualRole,
        managerId: manualManager && manualManager !== "none" ? manualManager : undefined,
        joiningDate: format(manualJoiningDate, "yyyy-MM-dd"),
      }),
    });
  };

  const balanceAction = useAction({
    successMessage: "Leave balances updated!",
    onSuccess: () => { setEditLeavesMember(null); refetchMembers(); },
  });

  const defaultLeaveTypes = ["casual", "sick", "personal", "wfh", "optional"];
  const leaveTypeNames: Record<string, string> = {
    casual: "Casual Leave",
    sick: "Sick Leave",
    personal: "Personal Leave",
    wfh: "Work From Home",
    optional: "Optional Holiday",
    unpaid: "Unpaid Leave",
  };

  const openLeaveEditor = (member: MemberData) => {
    setEditLeavesMember(member);
    const existing = member.leaveBalances || [];
    const balances = defaultLeaveTypes.map((type) => {
      const found = existing.find((b) => b.leaveType === type);
      return {
        leaveType: type,
        allocated: found ? String(found.allocated) : "",
        used: found ? String(found.used) : "",
      };
    });
    setEditBalances(balances);
  };

  const updateBalance = (index: number, field: "allocated" | "used", value: string) => {
    setEditBalances((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const getRemaining = (b: { allocated: string; used: string }) => {
    const a = parseFloat(b.allocated) || 0;
    const u = parseFloat(b.used) || 0;
    return a - u;
  };

  const handleSaveBalances = () => {
    if (!editLeavesMember) return;
    const balances = editBalances.map((b) => ({
      leaveType: b.leaveType,
      allocated: parseFloat(b.allocated) || 0,
      used: parseFloat(b.used) || 0,
      remaining: getRemaining(b),
      carriedForward: 0,
    }));
    balanceAction.execute(`/api/admin/members/${editLeavesMember._id}`, {
      method: "PATCH",
      body: JSON.stringify({ leaveBalances: balances }),
    });
  };

  const openMemberView = async (member: MemberData) => {
    setViewMember(member);
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/leave-requests?userId=${member._id}`);
      const data = await res.json();
      setMemberRecords(Array.isArray(data) ? data : []);
    } catch {
      setMemberRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const [addingLeave, setAddingLeave] = useState(false);

  const handleAddLeaveForMember = async () => {
    if (!viewMember || !addLeaveDate || !addLeaveReason) {
      toast.error("Please fill all required fields");
      return;
    }
    setAddingLeave(true);
    try {
      const row = [
        viewMember.name,
        format(addLeaveDate, "yyyy-MM-dd"),
        addLeaveType,
        addLeaveHalfDay ? "0.5" : "1.0",
        addLeaveHalfDay ? "true" : "false",
        "approved",
        "import",
        `Admin: ${addLeaveReason}`,
        new Date().toISOString(),
      ].join(",");
      const csv = "employeeName,leaveDate,leaveType,duration,isHalfDay,status,source,originalType,submittedOn\n" + row;
      const blob = new Blob([csv], { type: "text/csv" });
      const formData = new FormData();
      formData.append("file", blob, "admin-leave.csv");

      const res = await fetch("/api/admin/import/leaves", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || data.message || "Failed to add leave");
        return;
      }

      toast.success("Leave record added!");
      setAddLeaveOpen(false);
      setAddLeaveDate(undefined);
      setAddLeaveType("casual");
      setAddLeaveReason("");
      setAddLeaveHalfDay(false);
      openMemberView(viewMember);
      refetchMembers();
    } catch {
      toast.error("Failed to add leave");
    } finally {
      setAddingLeave(false);
    }
  };

  const leaveTypeNameMap: Record<string, string> = {
    casual: "Casual",
    sick: "Sick",
    personal: "Personal",
    wfh: "WFH",
    optional: "Optional",
    unpaid: "Unpaid",
    annual: "Annual",
  };

  const statusColorMap: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-rose-100 text-rose-700",
    cancelled: "bg-gray-100 text-gray-500",
  };

  const resetAddForm = () => {
    setWorkEmail("");
    setAddRole("employee");
    setAddManager("");
    setAddJoiningDate(undefined);
  };

  const fetchSlackMembersList = async () => {
    setLoadingSlack(true);
    try {
      const res = await fetch("/api/admin/slack/members");
      const data = await res.json();
      if (res.ok) {
        setSlackMembers(data);
      } else {
        toast.error(data.error || "Failed to load Slack members");
        setSlackMembers([]);
      }
    } catch {
      toast.error("Failed to load Slack members");
      setSlackMembers([]);
    } finally {
      setLoadingSlack(false);
    }
  };

  const openAddModal = async () => {
    setAddModalOpen(true);
    setSlackSearch("");
    // Always refetch to get latest Slack workspace data
    fetchSlackMembersList();
  };

  const handleAdd = () => {
    if (!selectedSlack || !addJoiningDate) {
      toast.error("Please fill all required fields");
      return;
    }

    addAction.execute("/api/admin/members", {
      method: "POST",
      body: JSON.stringify({
        slackUserId: selectedSlack.slackUserId,
        slackEmail: selectedSlack.slackEmail,
        slackDisplayName: selectedSlack.slackDisplayName,
        slackAvatar: selectedSlack.slackAvatar,
        workEmail: selectedSlack.isStorepeckerEmail ? undefined : workEmail || undefined,
        role: addRole,
        managerId: addManager || undefined,
        joiningDate: format(addJoiningDate, "yyyy-MM-dd"),
      }),
    });
  };

  const handleDeactivate = () => {
    if (!deactivateId) return;
    deactivateAction.execute(`/api/admin/members/${deactivateId}`, {
      method: "DELETE",
    });
  };

  const handleReactivate = (id: string) => {
    reactivateAction.execute(`/api/admin/members/${id}/reactivate`, {
      method: "PATCH",
      body: JSON.stringify({}),
    });
  };

  const handleRoleChange = (id: string, role: string) => {
    roleAction.execute("/api/users", {
      method: "PATCH",
      body: JSON.stringify({ userId: id, role }),
    });
  };

  const filteredMembers = (members || []).filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = (members || []).filter((m) => m.isActive).length;
  const pendingSlack = (members || []).filter((m) => m.isActive && !m.isSlackLinked).length;
  const deactivatedCount = (members || []).filter((m) => !m.isActive).length;

  const managers = (members || []).filter(
    (m) => m.isActive && (m.role === "manager" || m.role === "admin")
  );

  const availableSlack = (slackMembers || []).filter((m) => !m.alreadyAdded);
  const filteredSlack = slackSearch
    ? availableSlack.filter(
        (m) =>
          m.slackDisplayName.toLowerCase().includes(slackSearch.toLowerCase()) ||
          m.slackEmail.toLowerCase().includes(slackSearch.toLowerCase())
      )
    : availableSlack;

  return (
    <div>
      <PageHeader title="Team Members" description="Manage team members and Slack integration.">
        <Button variant="outline" className="gap-2" onClick={() => setManualAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Manually
        </Button>
        <Button className="gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" /> Add from Slack
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{pendingSlack}</p>
              <p className="text-xs text-muted-foreground">Pending Slack</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-500">
              <UserX className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{deactivatedCount}</p>
              <p className="text-xs text-muted-foreground">Deactivated</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          {loadingMembers ? (
            <div className="p-6"><LoadingTable rows={5} /></div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground/70">No members found</p>
              <p className="text-sm mt-1">Add members from your Slack workspace.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMembers.map((member) => (
                <div
                  key={member._id}
                  className={cn(
                    "flex items-center justify-between p-4 hover:bg-muted/20 transition-colors",
                    !member.isActive && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.slackAvatar || member.image} />
                      <AvatarFallback className="text-xs">
                        {member.name?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Joining date */}
                    <DatePicker
                      date={member.joiningDate ? new Date(member.joiningDate) : undefined}
                      onSelect={(d) => {
                        if (d) {
                          roleAction.execute(`/api/admin/members/${member._id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ joiningDate: format(d, "yyyy-MM-dd") }),
                          });
                        }
                      }}
                      placeholder="Set date"
                    />

                    {/* Role */}
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member._id, v)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Manager */}
                    <Select
                      value={member.managerId?._id || "none"}
                      onValueChange={(v) => {
                        roleAction.execute(`/api/admin/members/${member._id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ managerId: v === "none" ? null : v }),
                        });
                      }}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No manager</SelectItem>
                        {managers
                          .filter((m) => m._id !== member._id)
                          .map((m) => (
                            <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {/* Slack status */}
                    {member.isSlackLinked ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] gap-1" variant="secondary">
                        <Check className="h-3 w-3" /> Linked
                      </Badge>
                    ) : member.isActive ? (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1" variant="secondary">
                        <Clock className="h-3 w-3" /> Pending
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 text-[10px]" variant="secondary">
                        Inactive
                      </Badge>
                    )}

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => openMemberView(member)}
                    >
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => openLeaveEditor(member)}
                    >
                      Leaves
                    </Button>
                    {member.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive text-xs"
                        onClick={() => setDeactivateId(member._id)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleReactivate(member._id)}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add from Slack Modal */}
      <Dialog open={addModalOpen} onOpenChange={(v) => { setAddModalOpen(v); if (!v) { setSelectedSlack(null); setSlackSearch(""); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSlack ? "Add Member" : "Select from Slack"}</DialogTitle>
            <DialogDescription>
              {selectedSlack
                ? `Configure ${selectedSlack.slackDisplayName}'s Away account`
                : "Choose a Slack workspace member to add to Away"}
            </DialogDescription>
          </DialogHeader>

          {!selectedSlack ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-9"
                    value={slackSearch}
                    onChange={(e) => setSlackSearch(e.target.value)}
                  />
                </div>
                {!loadingSlack && (
                  <Button variant="outline" size="sm" onClick={fetchSlackMembersList} className="shrink-0">
                    Refresh
                  </Button>
                )}
              </div>
              {!loadingSlack && availableSlack.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {availableSlack.length} member{availableSlack.length !== 1 ? "s" : ""} available
                  {slackSearch && ` · ${filteredSlack.length} matching`}
                </p>
              )}

              {loadingSlack ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="skeleton h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-32" />
                        <div className="skeleton h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredSlack.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {slackMembers === null || slackMembers.length === 0 ? (
                        <p>No Slack members found. Check your SLACK_BOT_TOKEN.</p>
                      ) : availableSlack.length === 0 ? (
                        <p>All Slack workspace members have been added.</p>
                      ) : (
                        <p>No members match &quot;{slackSearch}&quot;</p>
                      )}
                    </div>
                  ) : (
                    filteredSlack.map((m) => (
                      <button
                        key={m.slackUserId}
                        className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                        onClick={() => { setSelectedSlack(m); setSlackSearch(""); }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={m.slackAvatar} />
                            <AvatarFallback className="text-xs">
                              {m.slackDisplayName.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{m.slackDisplayName}</p>
                            <p className="text-xs text-muted-foreground">{m.slackEmail}</p>
                          </div>
                        </div>
                        {m.isStorepeckerEmail ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]" variant="secondary">
                            @storepecker.me
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1" variant="secondary">
                            <AlertCircle className="h-3 w-3" /> Different domain
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected member info */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedSlack.slackAvatar} />
                  <AvatarFallback>{selectedSlack.slackDisplayName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedSlack.slackDisplayName}</p>
                  <p className="text-sm text-muted-foreground">{selectedSlack.slackEmail}</p>
                </div>
              </div>

              {selectedSlack.isStorepeckerEmail ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
                  <Check className="h-4 w-4" />
                  Slack and work email match — auto linked
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Work Email <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    placeholder="name@storepecker.me"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Must be @storepecker.me domain</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role <span className="text-destructive">*</span></Label>
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Manager</Label>
                  <Select value={addManager} onValueChange={setAddManager}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No manager</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Joining Date <span className="text-destructive">*</span></Label>
                <DatePicker date={addJoiningDate} onSelect={setAddJoiningDate} placeholder="Select joining date" />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedSlack(null)}>Back</Button>
                <Button onClick={handleAdd} disabled={addAction.loading} className="gap-2">
                  {addAction.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {addAction.loading ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Manually Modal */}
      <Dialog open={manualAddOpen} onOpenChange={setManualAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member Manually</DialogTitle>
            <DialogDescription>
              Add a team member by their work email. They can link Slack later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Work Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="john@storepecker.me"
              />
              <p className="text-xs text-muted-foreground">Must be @storepecker.me</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select value={manualRole} onValueChange={setManualRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Manager</Label>
                <Select value={manualManager} onValueChange={setManualManager}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Joining Date <span className="text-destructive">*</span></Label>
              <DatePicker date={manualJoiningDate} onSelect={setManualJoiningDate} placeholder="Select date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualAddOpen(false)}>Cancel</Button>
            <Button onClick={handleManualAdd} disabled={manualAddAction.loading} className="gap-2">
              {manualAddAction.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {manualAddAction.loading ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <Dialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Member</DialogTitle>
            <DialogDescription>
              This member will no longer be able to log in. Their data will be preserved and they can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivateAction.loading}>
              {deactivateAction.loading ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Balance Editor */}
      <Dialog open={!!editLeavesMember} onOpenChange={() => setEditLeavesMember(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Leave Balances</DialogTitle>
            <DialogDescription>
              Edit leave balances for {editLeavesMember?.name}. Remaining is auto-calculated (allocated - used).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editBalances.map((balance, index) => (
              <div key={balance.leaveType} className="space-y-2">
                <Label className="text-sm font-medium">
                  {leaveTypeNames[balance.leaveType] || balance.leaveType}
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Allocated</p>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      step={0.5}
                      value={balance.allocated}
                      onChange={(e) => updateBalance(index, "allocated", e.target.value)}
                      placeholder="0"
                      className="h-9 tabular-nums"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Used</p>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      step={0.5}
                      value={balance.used}
                      onChange={(e) => updateBalance(index, "used", e.target.value)}
                      placeholder="0"
                      className="h-9 tabular-nums"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                    <div className={cn(
                      "h-9 flex items-center px-3 rounded-lg border bg-muted/50 text-sm font-medium tabular-nums",
                      getRemaining(balance) < 0 && "text-destructive"
                    )}>
                      {getRemaining(balance)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLeavesMember(null)}>Cancel</Button>
            <Button onClick={handleSaveBalances} disabled={balanceAction.loading}>
              {balanceAction.loading ? "Saving..." : "Save Balances"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Member Records — Full-width panel */}
      <Dialog open={!!viewMember} onOpenChange={() => setViewMember(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header with avatar + info */}
          <div className="p-6 pt-10 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={viewMember?.slackAvatar || viewMember?.image} />
                  <AvatarFallback className="text-lg">
                    {viewMember?.name?.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{viewMember?.name}</h2>
                  <p className="text-sm text-muted-foreground">{viewMember?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] capitalize">{viewMember?.role}</Badge>
                    {viewMember?.joiningDate && (
                      <span className="text-xs text-muted-foreground">
                        Joined {format(new Date(viewMember.joiningDate), "MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setAddLeaveOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Mark Leave
              </Button>
            </div>
          </div>

          {/* Balance summary */}
          <div className="px-6 py-3">
            <div className="flex flex-wrap gap-4">
              {(viewMember?.leaveBalances || []).map((b) => (
                <div key={b.leaveType} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground capitalize">{leaveTypeNameMap[b.leaveType] || b.leaveType}</span>
                  <span className="font-semibold tabular-nums">{b.remaining}<span className="text-muted-foreground font-normal">/{b.allocated}</span></span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Records table */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Leave History</h3>
              <span className="text-xs text-muted-foreground">{memberRecords.length} record{memberRecords.length !== 1 ? "s" : ""}</span>
            </div>

            {loadingRecords ? (
              <LoadingTable rows={5} />
            ) : memberRecords.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Plane className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-foreground/70">No leave records</p>
                <p className="text-sm mt-1">Use &quot;Mark Leave&quot; to add a record.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_120px_80px_80px_70px] sm:grid-cols-[1fr_140px_100px_90px_80px_80px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span>Type</span>
                  <span>Date</span>
                  <span className="hidden sm:block">Duration</span>
                  <span>Days</span>
                  <span>Source</span>
                  <span>Status</span>
                </div>
                {/* Table rows */}
                <div className="divide-y max-h-[360px] overflow-y-auto">
                  {memberRecords.map((record) => (
                    <div
                      key={record._id}
                      className="grid grid-cols-[1fr_120px_80px_80px_70px] sm:grid-cols-[1fr_140px_100px_90px_80px_80px] gap-2 px-4 py-3 items-center text-sm hover:bg-muted/20 transition-colors"
                    >
                      {/* Type */}
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          record.leaveType === "wfh" ? "bg-blue-50 text-blue-600"
                            : record.leaveType === "sick" ? "bg-rose-50 text-rose-600"
                            : record.leaveType === "optional" ? "bg-amber-50 text-amber-600"
                            : "bg-emerald-50 text-emerald-600"
                        )}>
                          {record.leaveType === "wfh" ? <Home className="h-3.5 w-3.5" /> : <Plane className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <span className="font-medium capitalize">
                            {leaveTypeNameMap[record.leaveType] || record.leaveType}
                          </span>
                          {record.isHalfDay && (
                            <span className="text-xs text-muted-foreground ml-1">(half)</span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <span className="text-muted-foreground tabular-nums">
                        {format(new Date(record.startDate), "dd MMM yyyy")}
                        {record.startDate !== record.endDate && (
                          <span className="block text-[11px]">→ {format(new Date(record.endDate), "dd MMM")}</span>
                        )}
                      </span>

                      {/* Duration (desktop) */}
                      <span className="text-muted-foreground hidden sm:block">
                        {record.isHalfDay ? "Half day" : "Full day"}
                      </span>

                      {/* Days */}
                      <span className="font-medium tabular-nums">{record.numberOfDays}d</span>

                      {/* Source */}
                      <span className="text-xs text-muted-foreground">
                        {record.source === "import" ? "Import" : "Manual"}
                      </span>

                      {/* Status */}
                      <Badge
                        className={cn("text-[10px] capitalize w-fit", statusColorMap[record.status] || "bg-gray-100 text-gray-500")}
                        variant="secondary"
                      >
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reason column for the last record (quick peek) */}
          {memberRecords.length > 0 && memberRecords[0].reason && (
            <div className="px-6 pb-6">
              <p className="text-xs text-muted-foreground">
                Latest: <span className="text-foreground">{memberRecords[0].reason}</span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Leave for Member */}
      <Dialog open={addLeaveOpen} onOpenChange={setAddLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Leave</DialogTitle>
            <DialogDescription>
              Add an approved leave record for {viewMember?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
              <DatePicker date={addLeaveDate} onSelect={setAddLeaveDate} placeholder="Select date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leave Type <span className="text-destructive">*</span></Label>
                <Select value={addLeaveType} onValueChange={setAddLeaveType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="wfh">WFH</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={addLeaveHalfDay ? "half" : "full"} onValueChange={(v) => setAddLeaveHalfDay(v === "half")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Day</SelectItem>
                    <SelectItem value="half">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={addLeaveReason}
                onChange={(e) => setAddLeaveReason(e.target.value)}
                placeholder="Reason for leave..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLeaveOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLeaveForMember} disabled={addingLeave} className="gap-2">
              {addingLeave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {addingLeave ? "Adding..." : "Add Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
