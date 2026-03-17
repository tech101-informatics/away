"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function DropdownMenu({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function DropdownMenuTrigger({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function DropdownMenuContent({ children }: { children: React.ReactNode }) { return <div className="hidden">{children}</div>; }
function DropdownMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("text-sm", className)} {...props} />; }
function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("text-sm font-semibold", className)} {...props} />; }
function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("h-px bg-muted", className)} {...props} />; }
function DropdownMenuGroup({ children }: { children: React.ReactNode }) { return <>{children}</>; }

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup };
