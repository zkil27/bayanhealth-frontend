"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** A navigation button that shows a pending state while the route loads. */
export function NavigatingLink({
  href,
  pendingLabel = "Opening…",
  className,
  children,
}: {
  href: string;
  pendingLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => startTransition(() => router.push(href))}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-left disabled:cursor-wait",
        className,
      )}
    >
      {isPending ? (
        <>
          <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
