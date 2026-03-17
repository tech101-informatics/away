"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  CalendarDays,
  ClipboardList,
  FileText,
  Settings,
  Shield,
  Users,
  LogOut,
} from "lucide-react";
import { Logo } from "./logo";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const links = [
    ...employeeLinks,
    ...(role === "manager" || role === "admin" ? managerLinks : []),
    ...(role === "admin" ? adminLinks : []),
  ];

  const renderLink = (link: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <link.icon className="h-4 w-4" />
        {link.label}
      </Link>
    );
  };

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <Logo size="sm" />
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {open && (
        <div className="absolute inset-x-0 top-[57px] z-50 bg-card border-b shadow-lg animate-fade-in">
          <nav className="p-4 space-y-1">
            {links.map((link) => renderLink(link))}

            <Separator className="my-2" />

            {/* Settings & Sign out — secondary actions at bottom */}
            <Link
              href="/settings/slack"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/settings")
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
              className="w-full justify-start text-muted-foreground mt-1 min-h-[44px] hover:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
