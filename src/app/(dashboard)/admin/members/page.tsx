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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/away/page-header";
import { DatePicker } from "@/components/away/date-picker";
import { LoadingTable } from "@/components/away/loading-cards";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

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
    successMessage: "Role updated",
    onSuccess: () => refetchMembers(),
  });

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
    </div>
  );
}
