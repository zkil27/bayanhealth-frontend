"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Right-docked slide-over for previewing a consultation record (prescription,
 * clinical summary, medical certificate) without leaving `/patient/health`.
 *
 * A thin, brand-token wrapper around the shared `Sheet` primitive (already
 * used the same way by `ProtocolWorkflowDrawer` on the Med Hub landing) —
 * Escape, backdrop click and the close button are handled by that primitive,
 * not re-implemented here.
 */
export function HealthDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-slot="health-drawer"
        className="w-full gap-0 overflow-y-auto border-(--border-subtle) bg-(--surface-card) text-(--text-body) sm:max-w-md"
      >
        <SheetHeader className="gap-0.5 border-b border-(--border-subtle) bg-(--surface-warm) p-5">
          <SheetTitle className="text-[16px] font-bold tracking-(--tracking-heading) text-(--text-heading)">
            {title}
          </SheetTitle>
          {subtitle ? (
            <SheetDescription className="text-[13px] text-(--text-muted)">
              {subtitle}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 p-5 text-[14px] text-(--text-body)">
          {children}
        </div>

        {footer ? (
          <div className="mt-auto flex items-center justify-end gap-2.5 border-t border-(--border-subtle) bg-(--surface-warm) p-4">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
