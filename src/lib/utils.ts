import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Human-readable distance from now, in either direction.
 *
 * The future half is not a nicety. This renders appointment times on the doctor's
 * board, where a **future** instant is the normal case, and the previous
 * implementation only subtracted: `Date.now() - timestamp` went negative, fell
 * through `seconds < 5`, and every upcoming booking was labelled **"Just now"**.
 * A board of appointments scheduled weeks out all claimed to have arrived this
 * second, which is how five stale cards came to look like five brand-new requests.
 *
 * An unparseable timestamp yields `null` so the caller can omit the line rather
 * than print "NaN days ago".
 */
export function getRelativeTimeStringFromTimestamp(
  timestamp: number,
  nowMs: number = Date.now(),
): string | null {
  if (!Number.isFinite(timestamp)) return null;

  const deltaSeconds = Math.round((timestamp - nowMs) / 1000);
  const isFuture = deltaSeconds > 0;
  const seconds = Math.abs(deltaSeconds);

  if (seconds < 5) return "Just now";

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (isFuture) {
    if (seconds < 60) return `in ${seconds} seconds`;
    if (minutes === 1) return "in 1 min";
    if (minutes < 60) return `in ${minutes} mins`;
    if (hours === 1) return "in 1 hour";
    if (hours < 24) return `in ${hours} hours`;
    if (days === 1) return "Tomorrow";
    return `in ${days} days`;
  }

  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} mins ago`;
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/**
 * Initials from a person's name, for an avatar fallback where no photo exists.
 *
 * Strips a leading `Dr.` / `Dr` so "Dr. Marco Paolo Perpetua" reads "MP", takes
 * the first and last name parts, and ignores parts with no letter in them. When
 * the name yields nothing usable it returns `fallback` — `"—"` by default, an
 * honest "unknown" rather than an invented monogram; callers that always have a
 * real name (a fixed roster) can pass a brand fallback like `"BH"`.
 *
 * This is the one implementation; it replaced six near-identical local copies.
 */
export function initialsOf(name: string, fallback = "—"): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part));
  const picks =
    parts.length > 1 ? [parts[0]!, parts[parts.length - 1]!] : parts;
  return picks.map((part) => part[0]!.toUpperCase()).join("") || fallback;
}

/**
 * A doctor's display name with exactly one "Dr." prefix.
 *
 * Doctor profiles (`fullName` in `doctor-kyc.ts`) are patient-entered at KYC
 * time and already carry the honorific for some doctors ("Dr. Real Name") and
 * not others ("Ben Cruz") — there is no normalization at write time. Call
 * sites that unconditionally prepended `Dr. ${fullName}` therefore rendered
 * "Dr. Dr. Real Name" for the first group. This is the one place that adds
 * the prefix, so every caller goes through it instead of assuming either
 * shape.
 */
export function formatDoctorName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "your doctor";
  return /^Dr\.?\s+/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

export const YESTERDAY = (() => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
})();

export const TWO_YEARS_FROM_NOW = (() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  return date;
})();

/**
 * Derive a human-readable display name from a user's email local part.
 * Role-neutral equivalent of `deriveDoctorName` for use in any dashboard context.
 * `sarah.rodriguez@x.com` -> `Sarah Rodriguez`; falls back to the raw email.
 */
export function deriveDisplayName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const words = localPart
    .split(/[._-]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.length > 0 ? words.join(" ") : email;
}
