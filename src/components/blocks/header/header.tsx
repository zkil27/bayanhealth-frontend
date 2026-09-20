"use client";

import ModeToggle from "@/components/blocks/ModeToggle";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import AppButton from "@/components/primitives/AppButton";

import { cn } from "@/lib/utils";

export function AppHeader({ className }: { className?: string } = {}) {
  return (
    <header className={cn("sticky top-0 z-50 flex w-full justify-end border-b border-border bg-background/80 p-2 backdrop-blur-sm transition-all duration-300", className)}>
      <div className="flex items-center">
        <ModeToggle />
      </div>
    </header>
  );
}

interface AppHeaderSimple {
  fallback?: string;
  headerTitle: string;
}
export function AppHeaderSimple({ fallback = "/", headerTitle }: AppHeaderSimple) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex w-full justify-between border-b border-border bg-background/80 p-2 backdrop-blur-sm transition-all duration-300">
      <div className="flex gap-2 items-center">
        <AppButton
          onClick={handleBack}
          className="transition-opacity hover:opacity-80 p-0"
          variant="link"
        >
          <ChevronLeft className="size-6 stroke-secondary" />
        </AppButton>
        <span className="md:text-xl text-lg font-semibold">{headerTitle}</span>
      </div>
    </header>
  );
}
