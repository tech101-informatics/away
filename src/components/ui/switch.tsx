"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="sr-only peer"
        {...props}
      />
      <div
        className={cn(
          "h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-150",
          "focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          checked ? "bg-primary" : "bg-input",
          className
        )}
      >
        <div
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-150",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </div>
    </label>
  )
);
Switch.displayName = "Switch";

export { Switch };
