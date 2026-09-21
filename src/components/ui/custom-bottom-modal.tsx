"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomBottomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function CustomBottomModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: CustomBottomModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Dimmed Scrim Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Sheet Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-50 flex max-h-[85dvh] w-full max-w-lg mx-auto flex-col rounded-t-[28px] border-t border-x border-(--border-subtle) bg-(--surface-card) shadow-[0_-10px_40px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-250 ease-out",
          className,
        )}
      >
        {/* Visual Swipe / Drag Handle Indicator */}
        <div className="mx-auto my-2.5 h-1.5 w-12 shrink-0 rounded-full bg-(--border-default)" />

        {/* Modal Header */}
        <div className="flex items-start justify-between px-5 pb-3 pt-1 border-b border-(--border-subtle)">
          <div>
            <h3 className="text-base font-bold text-(--text-heading)">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
