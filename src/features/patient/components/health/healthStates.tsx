"use client";

import { HeartPulse } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Shared loading/error/no-matches states across the Health page's tabs. */

export function LoadingRows({ label }: { label: string }) {
  return (
    <div
      data-slot="patient-health-loading"
      role="status"
      aria-live="polite"
      className="flex flex-col gap-2.5"
    >
      <span className="flex items-center gap-2 text-[14px] text-(--text-muted)">
        <Spinner className="size-4" />
        {label}
      </span>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="h-20 animate-pulse rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-warm)"
        />
      ))}
    </div>
  );
}

export function LoadError({
  error,
  onRetry,
  isFetching,
}: {
  error: unknown;
  onRetry: () => void;
  isFetching: boolean;
}) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div
      data-slot="patient-health-error"
      className="flex flex-col items-center gap-3 py-6"
    >
      <Alert variant="destructive" className="max-w-md">
        <HeartPulse className="size-4" />
        <AlertTitle>Couldn&apos;t load your health records</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>
        {isFetching ? (
          <>
            <Spinner className="mr-2 size-3" />
            Retrying…
          </>
        ) : (
          "Try again"
        )}
      </Button>
    </div>
  );
}

export function NoMatches() {
  return (
    <p
      data-slot="patient-health-no-matches"
      className="py-6 text-center text-[14.5px] text-(--text-muted)"
    >
      Nothing matches that filter.
    </p>
  );
}

/** Turn `snake_case`/`kebab-case` tokens into a Title Case label. */
export function titleCase(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatOccurredAt(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return occurredAt;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Present the contract `serviceType` enum as a readable label. */
export function formatServiceType(serviceType?: string): string {
  if (!serviceType) return "Consultation";
  return titleCase(serviceType);
}
