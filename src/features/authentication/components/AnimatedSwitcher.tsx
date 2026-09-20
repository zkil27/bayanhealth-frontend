import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedSwitcherProps {
  children: ReactNode;
  direction: "left" | "right";
}

export function AnimatedSwitcher({ children, direction }: AnimatedSwitcherProps) {
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        direction === "right" ? "animate-slide-from-right" : "animate-slide-from-left"
      )}
    >
      {children}
    </div>
  );
}