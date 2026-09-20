/**
 * The facts a doctor needs *before* opening a consultation.
 *
 * The appointment popover used to answer "when, what status, which channel" and
 * nothing else — every clinical question ("who is this, why are they coming, is
 * anything red-flagged?") still cost a navigation into the consultation or the
 * day drawer. That is the wrong trade on a calendar: the popover is the surface
 * a doctor opens *while scanning*, so it has to carry enough to decide whether
 * to act, and only then hand off.
 *
 * Everything here is pure and takes `now` explicitly, so the wording can be
 * tested without pinning a timezone or a clock.
 */

import { PLATFORM_UTC_OFFSET_MINUTES } from "./calendarEntries";
import type { BookingIntakeForm } from "../../lib/api/bookingIntake";

/**
 * The absolute instant a calendar entry starts at.
 *
 * Entries carry wall-clock `date` + minutes-since-midnight, which are only an
 * instant once an offset is stated. The platform offset is the same one the
 * grid places bookings with (`calendarEntries.ts`); using the browser's zone
 * here would make "starts in 20 min" wrong by hours for anyone outside Manila.
 */
export function entryInstantMs(date: string, minutes: number): number | null {
  const midnight = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(midnight)) return null;
  return midnight + (minutes - PLATFORM_UTC_OFFSET_MINUTES) * 60_000;
}

/** `30 min`, `1 hr`, `1 hr 30 min` — how long the appointment is booked for. */
export function formatDurationMinutes(total: number): string | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const minutes = Math.round(total);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** A rounded, readable gap. Used for both directions in time. */
function humanGap(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

/**
 * How urgent this block is, which is what drives its emphasis on screen.
 *
 * `soon` exists so the one case that needs the doctor *now* — an appointment
 * inside the next hour — is visually separable from one next Tuesday without
 * the doctor doing arithmetic on a clock face.
 */
export type TimingTone = "now" | "soon" | "upcoming" | "past";

export interface AppointmentTiming {
  label: string;
  tone: TimingTone;
}

/** How far away the appointment is, in words. */
export const SOON_THRESHOLD_MINUTES = 60;

export function appointmentTiming(
  startMs: number,
  endMs: number,
  nowMs: number,
): AppointmentTiming | null {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;

  if (nowMs >= endMs) return { label: `Ended ${humanGap(nowMs - endMs)} ago`, tone: "past" };
  if (nowMs >= startMs) return { label: "Happening now", tone: "now" };

  const ahead = startMs - nowMs;
  return {
    label: `Starts in ${humanGap(ahead)}`,
    tone: ahead <= SOON_THRESHOLD_MINUTES * 60_000 ? "soon" : "upcoming",
  };
}

/**
 * The consultation fee, in the currency the booking was priced in.
 *
 * Returns null rather than a guess when either half is missing — a fee shown
 * without its currency is worse than no fee on a screen where the doctor is
 * being paid. `Intl` throws on a currency code it does not know, so a bad code
 * degrades to a plain amount instead of blanking the popover.
 */
export function formatMoney(amountCents?: number, currency?: string): string | null {
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) return null;
  const amount = amountCents / 100;
  if (!currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** The intake, reduced to what fits beside a calendar block. */
export interface IntakeBriefing {
  /** `draft` | `submitted` | `acknowledged`, when the form states one. */
  status?: string;
  /**
   * The patient's saved display name.
   *
   * Kept out of {@link IntakeBriefing.isEmpty}: a patient who saved a name but
   * has not yet filled in the form still has an identity worth showing at the
   * top of the card, and folding it into "is there content" would suppress the
   * one thing this popover most needs to lead with.
   */
  patientName: string | null;
  chiefComplaint: string | null;
  patientVerbatim: string | null;
  /** Positive red-flag answers, already worded for display. */
  redFlags: string[];
  /**
   * Whether the screening questions were answered at all.
   *
   * Kept separate from an empty `redFlags` on purpose: "asked, all negative"
   * and "never asked" are different clinical facts, and collapsing them is the
   * exact failure the structured screen exists to prevent.
   */
  screened: boolean;
  allergies: string | null;
  medications: string | null;
  /** True when the form carries nothing worth showing. */
  isEmpty: boolean;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Reduce an intake form to the popover's briefing.
 *
 * Defensive about shape rather than trusting the type: this is read straight
 * off the wire, and a malformed section must render as "not answered" instead
 * of taking the calendar down with it.
 */
export function summariseIntake(form: BookingIntakeForm | null): IntakeBriefing | null {
  if (!form || typeof form !== "object") return null;

  const sections = form.sections ?? {};
  const purpose = sections.purpose ?? {};
  const details = sections.details ?? {};
  const screen = details.safetyScreen ?? {};

  const redFlags: string[] = [];
  if (screen.chestPain === true) redFlags.push("Chest pain");
  if (screen.dyspnea === true) redFlags.push("Shortness of breath");
  if (typeof screen.feverDays === "number" && screen.feverDays > 0) {
    redFlags.push(`Fever ${screen.feverDays} day${screen.feverDays === 1 ? "" : "s"}`);
  }

  const screened =
    typeof screen.chestPain === "boolean" ||
    typeof screen.dyspnea === "boolean" ||
    typeof screen.feverDays === "number";

  const chiefComplaint = text(purpose.chiefComplaint);
  const patientVerbatim = text(purpose.patientVerbatim);
  const allergies = text(details.allergies);
  const medications = text(details.medications);

  return {
    ...(typeof form.status === "string" ? { status: form.status } : {}),
    patientName: text(form.patientName),
    chiefComplaint,
    patientVerbatim,
    redFlags,
    screened,
    allergies,
    medications,
    isEmpty:
      !chiefComplaint && !patientVerbatim && !allergies && !medications && !screened,
  };
}
