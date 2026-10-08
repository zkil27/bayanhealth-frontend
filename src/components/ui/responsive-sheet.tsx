"use client";

import type { ComponentType, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { cn } from "@/lib/utils";

/**
 * A confirmation or short task: a centered dialog on a desktop, a bottom
 * sheet on a phone (doctor-mobile PLAN.md rule 2, "sheets, not popovers").
 *
 * On a phone the actions sit at the bottom of the sheet, under the thumb,
 * stacked full width at 48px with the primary one first; the body scrolls
 * between the title and them. Desktop lays the same actions out in one row,
 * primary on the right. Same content and callbacks either way, so a caller
 * writes the confirmation once.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  iconClassName,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconClassName?: string;
  children?: ReactNode;
  /** Actions, primary first. */
  footer?: ReactNode;
  className?: string;
}) {
  const isPhone = useIsBreakpoint("max", 1024);

  const titleContent = (
    <>
      {Icon ? (
        <Icon
          className={cn("size-5 shrink-0 text-(--navy-700) dark:text-(--navy-300)", iconClassName)}
          aria-hidden
        />
      ) : null}
      {title}
    </>
  );

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn("max-h-[92dvh] bg-(--surface-card)", className)}>
          <DrawerHeader className="gap-1 px-4 pt-2 pb-3 text-left">
            <DrawerTitle className="flex items-center gap-2 text-lg font-bold text-(--text-heading)">
              {titleContent}
            </DrawerTitle>
            {description ? (
              <DrawerDescription className="text-sm leading-relaxed text-(--text-muted)">
                {description}
              </DrawerDescription>
            ) : null}
          </DrawerHeader>
          {children ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">{children}</div>
          ) : null}
          {footer ? (
            <div className="flex shrink-0 flex-col gap-2 border-t border-(--border-subtle) px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] [&>*]:h-12 [&>*]:w-full [&>*]:text-base">
              {footer}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("gap-4 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-6 sm:max-w-md", className)}
      >
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-(--text-heading)">
            {titleContent}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-sm leading-relaxed text-(--text-muted)">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        {footer ? (
          <div className="-mx-6 -mb-6 flex flex-row-reverse flex-wrap items-center gap-2 rounded-b-2xl border-t border-(--border-subtle) bg-(--surface-warm-soft) px-6 py-3">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
