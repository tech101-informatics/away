"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
});

function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative">{children}</div>
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({ asChild, children, ...props }: { asChild?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerRef } = React.useContext(PopoverContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ref: triggerRef as React.Ref<unknown>,
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e);
        setOpen(!open);
      },
    });
  }

  return (
    <button ref={triggerRef as React.Ref<HTMLButtonElement>} type="button" onClick={() => setOpen(!open)} {...props}>
      {children}
    </button>
  );
}

function PopoverContent({ className, align = "start", sideOffset = 4, children, ...props }: {
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen, triggerRef } = React.useContext(PopoverContext);
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  // Position: measure space above/below trigger, flip if needed
  React.useEffect(() => {
    if (!open || !triggerRef.current) return;

    const position = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Estimate popover height (calendar is ~340px, fallback 300)
      const contentEl = ref.current;
      const popoverHeight = contentEl ? contentEl.offsetHeight : 340;

      const spaceBelow = viewportHeight - triggerRect.bottom - sideOffset;
      const spaceAbove = triggerRect.top - sideOffset;

      let top: number;
      if (spaceBelow >= popoverHeight || spaceBelow >= spaceAbove) {
        // Open below
        top = triggerRect.bottom + sideOffset;
      } else {
        // Open above
        top = triggerRect.top - sideOffset - popoverHeight;
      }

      // Clamp to viewport
      top = Math.max(8, Math.min(top, viewportHeight - popoverHeight - 8));

      let left = triggerRect.left;
      if (align === "end") left = triggerRect.right;
      else if (align === "center") left = triggerRect.left + triggerRect.width / 2;

      // Prevent horizontal overflow
      const viewportWidth = window.innerWidth;
      if (contentEl) {
        const popoverWidth = contentEl.offsetWidth;
        if (left + popoverWidth > viewportWidth - 8) {
          left = viewportWidth - popoverWidth - 8;
        }
      }
      left = Math.max(8, left);

      setPos({ top, left });
    };

    // Position on next frame so ref.current has dimensions
    requestAnimationFrame(position);
    // Reposition on scroll/resize
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [open, triggerRef, align, sideOffset]);

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

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 50 }}
      className={cn(
        "w-auto rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
}

export { Popover, PopoverTrigger, PopoverContent };
