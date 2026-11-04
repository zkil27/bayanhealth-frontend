/**
 * Classify a home vital reading so no screen shows a misleading number
 * (pilot feedback: show "Too low" or "Invalid" instead).
 *
 * The bounds are the same accepted ranges as `vitalsSchema` and `IntakeVitals`
 * in the contract. They say whether a reading is believable as typed, not
 * whether it is clinically normal: interpreting a believable reading stays
 * with the doctor.
 */

export type VitalKind = "temperatureC" | "systolicBp" | "diastolicBp" | "heartRateBpm" | "spo2Percent";

export type VitalStatus = "ok" | "too_low" | "too_high" | "invalid" | "not_recorded";

export const VITAL_BOUNDS: Record<VitalKind, { min: number; max: number; integer: boolean; unit: string }> = {
  temperatureC: { min: 30, max: 45, integer: false, unit: "°C" },
  systolicBp: { min: 40, max: 300, integer: true, unit: "mmHg" },
  diastolicBp: { min: 20, max: 200, integer: true, unit: "mmHg" },
  heartRateBpm: { min: 20, max: 300, integer: true, unit: "bpm" },
  spo2Percent: { min: 50, max: 100, integer: true, unit: "%" },
};

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    if (value.trim() === "") return undefined;
    return Number(value);
  }
  return typeof value === "number" ? value : Number.NaN;
};

/** Status of one reading on its own. */
export function classifyVital(kind: VitalKind, value: unknown): VitalStatus {
  const n = toNumber(value);
  if (n === undefined) return "not_recorded";
  if (!Number.isFinite(n)) return "invalid";
  const bounds = VITAL_BOUNDS[kind];
  if (bounds.integer && !Number.isInteger(n)) return "invalid";
  if (n < bounds.min) return "too_low";
  if (n > bounds.max) return "too_high";
  return "ok";
}

/**
 * Blood pressure as a pair. Each number is classified on its own first; two
 * believable numbers are still invalid when the top one is not higher, which
 * is how a swapped or mistyped reading shows up.
 */
export function classifyBloodPressure(
  systolic: unknown,
  diastolic: unknown,
): { systolic: VitalStatus; diastolic: VitalStatus; pair: VitalStatus } {
  const sys = classifyVital("systolicBp", systolic);
  const dia = classifyVital("diastolicBp", diastolic);
  let pair: VitalStatus;
  if (sys === "not_recorded" && dia === "not_recorded") pair = "not_recorded";
  else if (sys === "not_recorded" || dia === "not_recorded") pair = "invalid";
  else if (sys !== "ok") pair = sys;
  else if (dia !== "ok") pair = dia;
  else pair = (toNumber(systolic) as number) > (toNumber(diastolic) as number) ? "ok" : "invalid";
  return { systolic: sys, diastolic: dia, pair };
}

/** Short status word for read-back screens (doctor summaries, review ledger). */
export function vitalStatusLabel(status: VitalStatus): string | null {
  switch (status) {
    case "too_low":
      return "Too low";
    case "too_high":
      return "Too high";
    case "invalid":
      return "Invalid";
    case "not_recorded":
      return "Not recorded";
    default:
      return null;
  }
}

/** The patient's inline message: what is wrong and what to do. */
export function vitalPatientMessage(kind: VitalKind | "bloodPressure", status: VitalStatus): string | null {
  if (status === "too_low") return "Too low. Check the reading and enter it again.";
  if (status === "too_high") return "Too high. Check the reading and enter it again.";
  if (status !== "invalid") return null;
  if (kind === "bloodPressure") return "Invalid. Enter both numbers, with the top number higher than the bottom.";
  return VITAL_BOUNDS[kind].integer ? "Invalid. Use whole numbers only." : "Invalid. Enter a number, like 37.5.";
}

/**
 * A reading as text for a read-back screen. A reading that is not `ok` shows
 * its status word instead of the number, so a mistyped value is never
 * presented as a measurement.
 */
export function formatVital(kind: VitalKind, value: unknown): string {
  const status = classifyVital(kind, value);
  if (status === "ok") return `${toNumber(value)} ${VITAL_BOUNDS[kind].unit}`.replace(" %", "%");
  return vitalStatusLabel(status) ?? "Not recorded";
}

/** Blood pressure as text for a read-back screen; see {@link formatVital}. */
export function formatBloodPressure(systolic: unknown, diastolic: unknown): string {
  const { pair } = classifyBloodPressure(systolic, diastolic);
  if (pair === "ok") return `${toNumber(systolic)}/${toNumber(diastolic)} mmHg`;
  return vitalStatusLabel(pair) ?? "Not recorded";
}
