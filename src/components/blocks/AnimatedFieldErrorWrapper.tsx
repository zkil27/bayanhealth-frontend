"use client";

import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/field";
import { FieldError as FieldErrorType } from "react-hook-form";

interface AnimatedFieldErrorProps {
  error?: FieldErrorType;
  className?: string;
  animation?: "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right";
  duration?: 100 | 200 | 300 | 500 | 700 | 1000;
}

const animationClasses = {
  fade: "animate-in fade-in",
  "slide-up": "animate-in fade-in slide-in-from-bottom-2",
  "slide-down": "animate-in fade-in slide-in-from-top-2",
  "slide-left": "animate-in fade-in slide-in-from-right-2",
  "slide-right": "animate-in fade-in slide-in-from-left-2",
};

export function AnimatedFieldError({
  error,
  className,
  animation = "slide-up",
  duration = 300,
}: AnimatedFieldErrorProps) {
  if (!error) return null;

  return (
    <FieldError
      className={cn(
        "text-orange-600",
        animationClasses[animation],
        `duration-${duration}`,
        className,
      )}
      errors={[error]}
    />
  );
}
