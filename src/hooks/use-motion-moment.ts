"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { browserDraftStorage } from "@/lib/intakeDraft";
import { hasSeenMoment, markMomentSeen } from "@/lib/motionMoments";

const noopSubscribe = () => () => {};

/** False while server-rendering and hydrating, true once mounted on the client. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Whether the success moment `key` should play its entrance now: on the
 * client, and the first time this tab has shown it. Pass `null` to turn it
 * off. The moment is marked seen after mount, so a poll, remount or reload
 * renders the mark static.
 */
export function usePlayOnce(key: string | null): boolean {
  const isClient = useIsClient();
  const [unseen] = useState(() => key !== null && !hasSeenMoment(browserDraftStorage(), key));
  useEffect(() => {
    if (key) markMomentSeen(browserDraftStorage(), key);
  }, [key]);
  return isClient && unseen;
}

/**
 * True once `value` differs from its value at mount. Selection feedback uses
 * it so answers restored from a draft (or shown again after Back) appear
 * settled, and only the patient's own taps animate.
 */
export function useChangedSinceMount<T>(value: T): boolean {
  const [initial] = useState(value);
  const [changed, setChanged] = useState(false);
  const differs = !Object.is(value, initial);
  if (differs && !changed) setChanged(true);
  return changed || differs;
}
