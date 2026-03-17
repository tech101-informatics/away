"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  ClipboardList,
  FileText,
  LogOut,
  Settings,
  Shield,
  Upload,
  Users,
} from "lucide-react";
import { Logo } from "./logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const employeeLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/policies", label: "Leave Policy", icon: FileText },
];

const managerLinks = [
  { href: "/manager", label: "Team Requests", icon: ClipboardList },
];

const adminLinks = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
  { href: "/admin/members", label: "Team Members", icon: Users },
  { href: "/admin/calendar", label: "Holiday Calendar", icon: CalendarDays },
  { href: "/admin/import", label: "Import Leaves", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const renderLink = (link: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = link.href === "/admin"
      ? pathname === "/admin"
      : pathname === link.href || pathname.startsWith(link.href + "/");
    return (
      <Link
        key={link.href}
        href={link.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(221,83%,53%,0.15)]"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <link.icon className="h-4 w-4" />
        {link.label}
      </Link>
    );
  };

  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-card h-screen sticky top-0">
      <div className="p-6">
        <Logo size="md" />
        <p className="text-xs text-muted-foreground mt-1 ml-12">Time off, sorted.</p>
      </div>

      <Separator />

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Navigation</p>
        {employeeLinks.map((link) => renderLink(link))}

        {(role === "manager" || role === "admin") && (
          <>
            <p className="px-3 mt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Team</p>
            {managerLinks.map((link) => renderLink(link))}
          </>
        )}

        {role === "admin" && (
          <>
            <p className="px-3 mt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Admin</p>
            {adminLinks.map((link) => renderLink(link))}
          </>
        )}
      </nav>

      <Separator />

      <div className="p-4 space-y-1">
        {session?.user && (
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.user.image || ""} />
              <AvatarFallback className="text-xs">
                {session.user.name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
        )}
        <Link
          href="/settings/slack"
          className={cn(
            "flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all duration-200",
            isSettingsActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full min-h-[40px] justify-start text-muted-foreground hover:text-destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
