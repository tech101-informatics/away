"use client";

import {
  CalendarDays,
  Home,
  Palmtree,
  Stethoscope,
  Gift,
  Check,
  X,
  Info,
  RotateCcw,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/away/page-header";
import { LoadingTable } from "@/components/away/loading-cards";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";

interface PolicyData {
  _id: string;
  leaveType: string;
  label: string;
  allocatedDays: number;
  carryForward: boolean;
  isActive: boolean;
  allowHalfDay: boolean;
  advanceNoticeDays: number;
  allowRetroactive: boolean;
  retroactiveLimitDays: number;
  allowDuringNoticePeriod: boolean;
  maxConsecutiveDays: number;
  maxDaysPerWeek: number;
  requiresApprovalBeyondQuota: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  casual: <Palmtree className="h-5 w-5" />,
  sick: <Stethoscope className="h-5 w-5" />,
  wfh: <Home className="h-5 w-5" />,
  optional: <Gift className="h-5 w-5" />,
};

const typeColors: Record<string, { text: string; bg: string }> = {
  casual: { text: "text-emerald-600", bg: "bg-emerald-50" },
  sick: { text: "text-rose-600", bg: "bg-rose-50" },
  wfh: { text: "text-blue-600", bg: "bg-blue-50" },
  optional: { text: "text-amber-600", bg: "bg-amber-50" },
};

function buildRules(p: PolicyData): Array<{ label: string; enabled: boolean }> {
  const rules: Array<{ label: string; enabled: boolean }> = [];
  rules.push({ label: "Half-day allowed", enabled: p.allowHalfDay });
  rules.push({ label: "Carry forward to next year", enabled: p.carryForward });
  if (p.advanceNoticeDays > 0) {
    rules.push({ label: `${p.advanceNoticeDays} day advance notice required`, enabled: true });
  } else {
    rules.push({ label: "Same day apply allowed", enabled: true });
  }
  if (p.allowRetroactive) {
    rules.push({ label: `Retroactive apply (up to ${p.retroactiveLimitDays || 7} days)`, enabled: true });
  } else {
    rules.push({ label: "Retroactive apply", enabled: false });
  }
  if (p.maxConsecutiveDays > 0) {
    rules.push({ label: `Max ${p.maxConsecutiveDays} consecutive days`, enabled: true });
  }
  if (p.maxDaysPerWeek > 0) {
    rules.push({ label: `Max ${p.maxDaysPerWeek} days per week`, enabled: true });
  }
  if (p.requiresApprovalBeyondQuota) {
    rules.push({ label: "Manager approval if quota exceeded", enabled: true });
  }
  rules.push({ label: "Allowed during notice period", enabled: p.allowDuringNoticePeriod });
  return rules;
}

const generalRules = [
  {
    icon: <RotateCcw className="h-4 w-4" />,
    title: "Annual Reset",
    description: "All leave balances reset on January 1st every year. No carry forward for any leave type.",
  },
  {
    icon: <CalendarDays className="h-4 w-4" />,
    title: "New Joiners",
    description: "Leave balances are pro-rated based on remaining months in the year. Rounded up to the nearest 0.5 day.",
  },
  {
    icon: <AlertTriangle className="h-4 w-4" />,
    title: "Excess Leave",
    description: "If you exceed your balance, extra days are automatically converted to unpaid leave. Your request still goes through.",
  },
  {
    icon: <X className="h-4 w-4" />,
    title: "Notice Period",
    description: "Employees on notice period cannot apply for any type of leave.",
  },
  {
    icon: <CalendarDays className="h-4 w-4" />,
    title: "Weekends & Holidays",
    description: "Saturdays, Sundays, and public holidays are automatically excluded from your leave date range.",
  },
  {
    icon: <Clock className="h-4 w-4" />,
    title: "Optional Holidays",
    description: "Select up to 2 optional holidays per year. Selections must be made by January 31st and are locked after that.",
  },
];

export default function PoliciesPage() {
  const { data: policies, loading } = useFetch<PolicyData[]>("/api/leave-policy");

  const activePolicies = (policies || []).filter((p) => p.isActive);

  return (
    <div>
      <PageHeader
        title="Leave & WFH Policy"
        description="Company-wide leave rules, quotas, and how they work."
      />

      {/* Policy cards */}
      {loading ? (
        <LoadingTable rows={4} />
      ) : activePolicies.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground/70">No leave policies configured yet</p>
            <p className="text-sm mt-1">Contact your admin to set up leave policies.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 stagger-children">
          {activePolicies.map((policy) => {
            const colors = typeColors[policy.leaveType] || { text: "text-gray-600", bg: "bg-gray-50" };
            const icon = typeIcons[policy.leaveType] || <CalendarDays className="h-5 w-5" />;
            const rules = buildRules(policy);

            return (
              <Card key={policy._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl", colors.bg, colors.text)}>
                      {icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{policy.label}</CardTitle>
                      <CardDescription className="mt-0.5">
                        <span className="text-lg font-bold tabular-nums text-foreground">
                          {policy.allocatedDays}
                        </span>{" "}
                        days per year
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {rules.map((rule) => (
                      <div key={rule.label} className="flex items-center gap-2 text-sm">
                        {rule.enabled ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={cn(
                          rule.enabled ? "text-foreground" : "text-muted-foreground line-through"
                        )}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* General Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">General Rules</CardTitle>
          </div>
          <CardDescription>
            These rules apply to all employees across all leave types.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {generalRules.map((rule) => (
              <div
                key={rule.title}
                className="flex items-start gap-3 p-4 rounded-xl bg-muted/40"
              >
                <div className="text-muted-foreground mt-0.5 shrink-0">
                  {rule.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{rule.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {rule.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
