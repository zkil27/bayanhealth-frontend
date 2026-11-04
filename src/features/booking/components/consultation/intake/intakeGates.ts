/**
 * Pure intake gating rules: which page the patient may be on, and why Continue
 * is held. Kept free of React so the clinical-safety rules are unit-tested.
 *
 * Logic change (pilot feedback 2026-11-03): the safety check is now the first
 * page of a teleconsult intake, and answering "Yes" is a hard stop. A patient
 * who reports chest pain, sudden shortness of breath or severe bleeding is sent
 * to emergency care and cannot continue to book a teleconsult.
 */

import { classifyBloodPressure, classifyVital } from "../../../lib/vitalStatus";

export type RedFlagAnswer = "no" | "yes";

export interface RedFlagState {
  answer: RedFlagAnswer | undefined;
  /** Kept for interface stability. No contract field carries bleeding, and the hard stop makes it moot. */
  bleeding: boolean;
}

export type IntakeStepKey = "safety" | "about" | "history" | "concern" | "service" | "review";

interface SafetyScreenLike {
  chestPain?: boolean;
  dyspnea?: boolean;
}

/** Reads a stored screen back into the single yes/no answer. */
export function redFlagFromScreen(screen: SafetyScreenLike | undefined): RedFlagAnswer | undefined {
  if (screen?.chestPain === true || screen?.dyspnea === true) return "yes";
  if (screen?.chestPain === false && screen?.dyspnea === false) return "no";
  return undefined;
}

/** True when the safety answer stops the intake. There is no override. */
export function isSafetyHardStop(redFlag: RedFlagState): boolean {
  return redFlag.answer === "yes";
}

/** Why the safety page cannot continue, or null when it may. */
export function safetyBlockedReason(redFlag: RedFlagState): string | null {
  if (!redFlag.answer) return "Answer the safety question to continue.";
  if (isSafetyHardStop(redFlag)) return "This consultation can't continue online. Please get emergency care now.";
  return null;
}

interface VitalsLike {
  temperatureC?: unknown;
  systolicBp?: unknown;
  diastolicBp?: unknown;
  heartRateBpm?: unknown;
  spo2Percent?: unknown;
}

/**
 * Why the concern page cannot continue, or null when it may. A home reading
 * that is not believable as typed is held here rather than sent to the doctor
 * as a measurement.
 */
export function concernBlockedReason(chiefComplaint: string | undefined, vitals?: VitalsLike): string | null {
  if (!chiefComplaint?.trim()) return "Describe your main concern to continue.";
  if (vitals) {
    const bp = classifyBloodPressure(vitals.systolicBp, vitals.diastolicBp);
    if (bp.pair !== "ok" && bp.pair !== "not_recorded") return "Check your blood pressure reading to continue.";
    for (const kind of ["temperatureC", "heartRateBpm", "spo2Percent"] as const) {
      const status = classifyVital(kind, vitals[kind]);
      if (status !== "ok" && status !== "not_recorded") return "Check your home vitals to continue.";
    }
  }
  return null;
}

/**
 * A teleconsult page past the safety check is reachable only after a "No".
 * Every other service has no safety page, so every page is reachable.
 */
export function canEnterStep(key: IntakeStepKey, isTeleconsult: boolean, redFlag: RedFlagState): boolean {
  if (!isTeleconsult || key === "safety") return true;
  return redFlag.answer === "no";
}

/**
 * Clamp a resume target. A teleconsult draft whose safety answer is missing
 * or "Yes" always reopens on the safety page, so a saved positive screen shows
 * the hard stop again instead of the page the patient last reached.
 */
export function clampResumeStep(target: IntakeStepKey, isTeleconsult: boolean, redFlag: RedFlagState): IntakeStepKey {
  return canEnterStep(target, isTeleconsult, redFlag) ? target : "safety";
}
