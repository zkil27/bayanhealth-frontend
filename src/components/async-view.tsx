"use client";

import * as React from "react";
import { AlertCircleIcon, InboxIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useAsyncResource } from "@/hooks/use-async-resource";
import type { AsyncState, ReduceAsyncOptions } from "@/lib/asyncView";

/** Shape passed to a custom error renderer. */
export interface AsyncErrorInfo {
  code?: string;
  message: string;
}

interface AsyncSlots<T> {
  /** Renders the resolved, non-empty value (the `data` state). */
  children: (value: T) => React.ReactNode;
  /** Overrides the default loading slot. */
  loading?: React.ReactNode;
  /** Overrides the default empty slot. */
  empty?: React.ReactNode;
  /**
   * Overrides the default error slot. Receives the error info and a `retry`
   * callback that restarts the fetch (only meaningful in the fetcher form).
   */
  error?: (info: AsyncErrorInfo, retry: () => void) => React.ReactNode;
  /** Extra classes applied to the content region wrapper. */
  className?: string;
}

interface AsyncViewFetcherProps<T> extends AsyncSlots<T>, ReduceAsyncOptions<T> {
  /** A fetcher to run; the wrapper owns loading/timeout/error state. */
  fetcher: () => Promise<T>;
  /** Re-run the fetcher when any of these change. */
  deps?: ReadonlyArray<unknown>;
  state?: never;
  onRetry?: never;
}

interface AsyncViewStateProps<T> extends AsyncSlots<T> {
  /** A pre-computed state to render (controlled form). */
  state: AsyncState<T>;
  /** Optional retry handler surfaced to the error slot. */
  onRetry?: () => void;
  fetcher?: never;
  deps?: never;
}

export type AsyncViewProps<T> = AsyncViewFetcherProps<T> | AsyncViewStateProps<T>;

function DefaultLoading() {
  return (
    <div
      data-slot="async-view-loading"
      className="flex min-h-32 w-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-5" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

function DefaultEmpty() {
  return (
    <Empty data-slot="async-view-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing here yet</EmptyTitle>
        <EmptyDescription>There is no data to show right now.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function DefaultError({ info, retry }: { info: AsyncErrorInfo; retry?: () => void }) {
  return (
    <div data-slot="async-view-error" className="flex min-h-32 w-full flex-col items-center justify-center gap-3 p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>Couldn&apos;t load this content</AlertTitle>
        <AlertDescription>{info.message}</AlertDescription>
      </Alert>
      {retry ? (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Render a single defined state for a data-backed region.
 *
 * `AsyncView` standardises the `loading → (data | empty | error)` contract used
 * across every async region. It renders only its own content region, so an error
 * never unmounts surrounding layout or navigation — those stay interactive
 * (Requirement 7.4).
 *
 * Two forms are supported:
 * - **fetcher form**: pass a `fetcher` (and optional `deps`); the wrapper runs it
 *   through {@link useAsyncResource}, applying the 10s timeout and wiring `retry`.
 * - **controlled form**: pass a pre-computed `state` (and optional `onRetry`),
 *   useful when the parent already owns the data lifecycle.
 */
export function AsyncView<T>(props: AsyncViewProps<T>): React.ReactElement {
  if ("fetcher" in props && props.fetcher) {
    return <AsyncViewWithFetcher {...props} />;
  }
  const { state, onRetry, ...slots } = props as AsyncViewStateProps<T>;
  return (
    <AsyncViewContent state={state} retry={onRetry} className={slots.className} slots={slots} />
  );
}

function AsyncViewWithFetcher<T>(props: AsyncViewFetcherProps<T>): React.ReactElement {
  const { fetcher, deps, timeoutMs, isEmpty, ...slots } = props;
  const { state, reload } = useAsyncResource<T>(fetcher, { deps, timeoutMs, isEmpty });
  return <AsyncViewContent state={state} retry={reload} className={slots.className} slots={slots} />;
}

function AsyncViewContent<T>({
  state,
  retry,
  className,
  slots,
}: {
  state: AsyncState<T>;
  retry?: () => void;
  className?: string;
  slots: AsyncSlots<T>;
}): React.ReactElement {
  let body: React.ReactNode;
  switch (state.status) {
    case "loading":
      body = slots.loading ?? <DefaultLoading />;
      break;
    case "empty":
      body = slots.empty ?? <DefaultEmpty />;
      break;
    case "error":
      body = slots.error
        ? slots.error({ code: state.code, message: state.message }, retry ?? (() => {}))
        : (
          <DefaultError info={{ code: state.code, message: state.message }} retry={retry} />
        );
      break;
    case "data":
      body = slots.children(state.value);
      break;
  }

  return (
    <div data-slot="async-view" className={cn("w-full", className)}>
      {body}
    </div>
  );
}
