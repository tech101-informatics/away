"use client";

import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { icon: "h-5 w-5", text: "text-lg" },
  md: { icon: "h-6 w-6", text: "text-xl" },
  lg: { icon: "h-8 w-8", text: "text-3xl" },
};

export function Logo({ size = "md", className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md" />
        <div className="relative bg-primary text-primary-foreground p-2 rounded-lg transition-transform duration-200 group-hover:scale-105">
          <Plane className={cn(s.icon, "-rotate-45")} />
        </div>
      </div>
      <span className={cn("font-bold tracking-tight", s.text)} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Away
      </span>
    </div>
  );
}
