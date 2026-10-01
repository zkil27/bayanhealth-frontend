"use client";

import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface CustomBottomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Pinned below the scrolling body, e.g. a Done action that must stay reachable. */
  footer?: React.ReactNode;
  className?: string;
}

export function CustomBottomModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: CustomBottomModalProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("max-h-[90dvh]", className)}>
        <DrawerHeader>
          <DrawerTitle className="text-center font-semibold text-(--navy-700)">
            {title}
          </DrawerTitle>
          {description && (
            <DrawerDescription className="text-center text-xs text-muted-foreground mt-0.5">
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        {/*
         * The sheet's only scroll container. Children must not add their own
         * max-height/overflow, or the sheet ends up with two nested scrollers.
         */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-(--border-subtle) px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
