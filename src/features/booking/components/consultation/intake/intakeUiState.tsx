"use client";

import { createContext, useCallback, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

/**
 * Screen-only intake state that is not a form field: which chips are lit on
 * the pain questions, whether an "Other" box is open, and so on.
 *
 * It used to live in each component's `useState`, so going Back and returning
 * (the page unmounts) showed every chip blank while the saved answer remained,
 * and the next tap overwrote that answer. Lifting it to the intake keeps it
 * across pages, and the intake draft (`useIntakeDraft`) keeps it across a
 * reload. Without a provider the hook behaves exactly like `useState`.
 */
export type IntakeUiState = Record<string, unknown>;

interface IntakeUiStore {
  state: IntakeUiState;
  set: (key: string, value: unknown) => void;
  /** Drops every key that starts with `prefix`, e.g. when a section is skipped. */
  clear: (prefix: string) => void;
}

const IntakeUiContext = createContext<IntakeUiStore | null>(null);

export function IntakeUiStateProvider({
  value,
  onChange,
  children,
}: {
  value: IntakeUiState;
  onChange: Dispatch<SetStateAction<IntakeUiState>>;
  children: ReactNode;
}) {
  const set = useCallback((key: string, next: unknown) => onChange((previous) => ({ ...previous, [key]: next })), [onChange]);
  const clear = useCallback(
    (prefix: string) =>
      onChange((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith(prefix)))),
    [onChange],
  );
  return <IntakeUiContext.Provider value={{ state: value, set, clear }}>{children}</IntakeUiContext.Provider>;
}

/** Clears screen-only state under a prefix; a no-op without a provider. */
export function useClearIntakeUiState(): (prefix: string) => void {
  const store = useContext(IntakeUiContext);
  return store?.clear ?? (() => undefined);
}

export function useIntakeUiState<T>(key: string, initial: T | (() => T)): [T, (next: T) => void] {
  const store = useContext(IntakeUiContext);
  const [local, setLocal] = useState<T>(initial);
  if (!store) return [local, setLocal];
  const value = key in store.state ? (store.state[key] as T) : typeof initial === "function" ? (initial as () => T)() : initial;
  return [value, (next: T) => store.set(key, next)];
}
