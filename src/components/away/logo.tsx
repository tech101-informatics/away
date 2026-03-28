"use client";

import { cn } from "@/lib/utils";
import Icon from "../icon";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { icon: 28, text: "text-lg" },
  md: { icon: 34, text: "text-xl" },
  lg: { icon: 42, text: "text-3xl" },
};

export function Logo({ size = "md", className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center", className)}>
      <Icon  className="w-7 h-7 text-primary"/>
      <span
        className={cn("font-extrabold tracking-tight", s.text)}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Away
      </span>
    </div>
  );
}
