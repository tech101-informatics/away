"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  disabled: boolean;
  registerLabel: (value: string, label: string) => void;
  getLabel: (value: string) => string | undefined;
}

const SelectContext = React.createContext<SelectContextValue>({
  value: "",
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
  disabled: false,
  registerLabel: () => {},
  getLabel: () => undefined,
});

function Select({ value, onValueChange, disabled, children }: { value?: string; onValueChange?: (value: string) => void; disabled?: boolean; children: React.ReactNode }) {
  const [internalValue, setInternalValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const labelsRef = React.useRef<Map<string, string>>(new Map());
  // Force re-render when labels register
  const [, setLabelVersion] = React.useState(0);

  const v = value !== undefined ? value : internalValue;
  const onChange = onValueChange || setInternalValue;

  const registerLabel = React.useCallback((itemValue: string, label: string) => {
    if (labelsRef.current.get(itemValue) !== label) {
      labelsRef.current.set(itemValue, label);
      setLabelVersion((prev) => prev + 1);
    }
  }, []);

  const getLabel = React.useCallback((itemValue: string) => {
    return labelsRef.current.get(itemValue);
  }, []);

  return (
    <SelectContext.Provider value={{ value: v, onValueChange: onChange, open, setOpen, triggerRef, disabled: !!disabled, registerLabel, getLabel }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerRef, disabled } = React.useContext(SelectContext);
  return (
    <button
      ref={triggerRef as React.Ref<HTMLButtonElement>}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      aria-expanded={open}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 shrink-0 transition-transform", open && "rotate-180")} />
    </button>
  );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, getLabel } = React.useContext(SelectContext);
  const displayLabel = value ? getLabel(value) : undefined;

  return (
    <span className={cn(!value && "text-muted-foreground")}>
      {displayLabel || value || placeholder}
    </span>
  );
}

function SelectContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen, triggerRef } = React.useContext(SelectContext);
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = Math.max(rect.width, 140);
      let left = rect.left;
      // Prevent overflow on right edge
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      left = Math.max(8, left);
      setPos({
        top: rect.bottom + 4,
        left,
        width: rect.width,
      });
    }
  }, [open, triggerRef]);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, setOpen, triggerRef]);

  return (
    <>
      {/* Hidden render to register labels even when closed */}
      <div hidden>{children}</div>

      {mounted && open && createPortal(
        <div
          ref={ref}
          style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 140), zIndex: 50 }}
          className={cn(
            "max-h-64 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            className
          )}
          role="listbox"
          {...props}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

function SelectItem({ value: itemValue, label: explicitLabel, children, className, disabled, ...props }: { value: string; label?: string; children: React.ReactNode; className?: string; disabled?: boolean }) {
  const { value, onValueChange, setOpen, registerLabel } = React.useContext(SelectContext);
  const isSelected = value === itemValue;

  // Extract text content from children for label registration
  const textContent = React.useMemo(() => {
    if (explicitLabel) return explicitLabel;
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === "string") return node;
      if (typeof node === "number") return String(node);
      if (Array.isArray(node)) return node.map(extractText).join("");
      if (React.isValidElement(node) && node.props.children) {
        return extractText(node.props.children);
      }
      return "";
    };
    return extractText(children);
  }, [children, explicitLabel]);

  React.useEffect(() => {
    registerLabel(itemValue, textContent);
  }, [itemValue, textContent, registerLabel]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      disabled={disabled}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none text-left group",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={() => {
        onValueChange(itemValue);
        setOpen(false);
      }}
      {...props}
    >
      <span className={cn("absolute left-2 flex h-3.5 w-3.5 items-center justify-center group-hover:text-primary", isSelected ? 'text-primary': 'text-gray-200')}>
         <Check className="h-4 w-4" />
      </span>
      {children}
    </button>
  );
}

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <div role="group">{children}</div>;
}

function SelectLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />;
}

function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };
