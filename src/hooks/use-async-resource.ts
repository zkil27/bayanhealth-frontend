"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ASYNC_TIMEOUT_MS,
  reduceAsyncState,
  type AsyncOutcome,
  type AsyncState,
  type ReduceAsyncOptions,
} from "@/lib/asyncView";
import { ApiError } from "@/lib/api";

export interface UseAsyncResourceOptions<T> extends ReduceAsyncOptions<T> {
  /**
   * Dependency list controlling when the fetcher re-runs, mirroring the
   * semantics of a `useEffect` dependency array. Defaults to `[]` (run once).
   */
  deps?: ReadonlyArray<unknown>;
}

export interface UseAsyncResourceResult<T> {
  /** The single defined state derived from the data dependency and timeout. */
  state: AsyncState<T>;
  /** Re-run the fetcher from a fresh `loading` state (restarts the timeout). */
  reload: () => void;
}

/**
 * Run an async fetcher and expose its lifecycle as a single {@link AsyncState}.
 *
 * The hook owns the timing concerns the pure {@link reduceAsyncState} reducer
 * cannot: it starts the request, arms a 10s timeout that flips a still-pending
 * dependency into the `error` state, and ignores stale resolutions after a
 * reload or unmount. The mapping from (outcome, timed-out) to a concrete state
 * is delegated entirely to the reducer so behaviour stays consistent with the
 * non-hook callers.
 *
 * @param fetcher - Produces the resource; rejections become the `error` state.
 * @param options - Timeout override, emptiness predicate, and re-run `deps`.
 */
export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncResourceOptions<T> = {},
): UseAsyncResourceResult<T> {
  const timeoutMs = options.timeoutMs ?? ASYNC_TIMEOUT_MS;
  const { isEmpty, deps = [] } = options;

  const [outcome, setOutcome] = useState<AsyncOutcome<T>>({ kind: "pending" });
  const [timedOut, setTimedOut] = useState(false);

  // Identifies the active request so stale resolutions can be discarded.
  const runIdRef = useRef(0);
  // Latest fetcher kept in a ref so `reload` need not depend on its identity.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const start = useCallback(() => {
    const runId = ++runIdRef.current;
    setOutcome({ kind: "pending" });
    setTimedOut(false);

    const timer = setTimeout(() => {
      if (runId === runIdRef.current) setTimedOut(true);
    }, timeoutMs);

    fetcherRef
      .current()
      .then((value) => {
        if (runId === runIdRef.current) setOutcome({ kind: "resolved", value });
      })
      .catch((err: unknown) => {
        if (runId !== runIdRef.current) return;
        if (err instanceof ApiError) {
          setOutcome({ kind: "error", code: err.code, message: err.message });
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setOutcome({ kind: "error", message });
        }
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      clearTimeout(timer);
    };
  }, [timeoutMs]);

  const reload = useCallback(() => {
    start();
  }, [start]);

  useEffect(() => {
    const cleanup = start();
    return () => {
      // Invalidate the in-flight run so its resolution is ignored.
      runIdRef.current++;
      cleanup?.();
    };
    // `start` is stable for a given timeout; `deps` drives intentional re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, ...deps]);

  // `timedOut` only matters while pending; the reducer ignores elapsed time once
  // the outcome has resolved or errored, so passing the timeout boundary is safe.
  const state = reduceAsyncState(outcome, timedOut ? timeoutMs : 0, {
    timeoutMs,
    isEmpty,
  });

  return { state, reload };
}
