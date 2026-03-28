"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
});

function Tabs({ defaultValue, value, onValueChange, className, children, ...props }: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const v = value !== undefined ? value : internalValue;
  const onChange = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value: v, onValueChange: onChange }}>
      <div className={className} {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex h-10 items-center gap-0 rounded-lg bg-muted p-1 text-muted-foreground overflow-x-auto no-scrollbar w-full sm:inline-flex sm:w-auto",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ value, className, ...props }: { value: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { value: selected, onValueChange } = React.useContext(TabsContext);
  const isActive = selected === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-background text-foreground shadow-sm" : "",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ value, className, ...props }: { value: string } & React.HTMLAttributes<HTMLDivElement>) {
  const { value: selected } = React.useContext(TabsContext);
  if (selected !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("mt-2 ring-offset-background focus-visible:outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
