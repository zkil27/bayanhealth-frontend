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
        <div className="overflow-y-auto px-4 pb-4 pt-1">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
