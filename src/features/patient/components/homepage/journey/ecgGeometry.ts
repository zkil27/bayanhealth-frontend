/**
 * Static geometry for the ECG journey chart — Layer 1.
 *
 * Everything is expressed in one 0–100 × 0–100 space. The SVG draws the path in
 * that space with `preserveAspectRatio="none"`, and the HTML nodes, guide lines
 * and labels are positioned with `left: x%; top: y%` in the same box, so a
 * node's centre sits on the line at every container width and height without
 * measuring anything.
 *
 * Milestone checkpoints are the steps' own coordinates, written into the path
 * verbatim. Everything between them — the lead-in beat, the rises, the
 * decorative second peak, the tail — is waveform only: it is a vertex in `d`
 * and nothing else, so it can never be mistaken for a step.
 *
 * Nothing here is random or time-dependent: the same checkpoints always yield
 * the same `d`, which keeps the chart stable across re-renders and testable.
 */

export interface ChartPoint {
  x: number;
  y: number;
}

/** Where a step with no configured height would sit. */
export const DEFAULT_Y = 50;

/** Which side of its node a label goes on, so it stays clear of the stroke. */
export function labelSide(y: number): "above" | "below" {
  return y < DEFAULT_Y ? "below" : "above";
}

/**
 * Lead-in before the first milestone, as `[dx, dy]` from its centre: calm, with
 * one very subtle beat, ending exactly at the node.
 */
const LEAD_IN: ReadonlyArray<readonly [number, number]> = [
  [-13, 0],
  [-8, 0],
  [-6, -4],
  [-4, 0],
];

/** Calm tail after the last milestone, as `[dx, dy]` from its centre. */
const TAIL: ReadonlyArray<readonly [number, number]> = [
  [6, 0],
  [11, 0],
];

/**
 * One waveform shape per transition, as `[t, blend, offset]` points:
 * `x = from.x + t·(to.x − from.x)`, `y = lerp(from.y, to.y, blend) + offset`.
 * Cycled by segment index.
 */
type WavePoint = readonly [t: number, blend: number, offset: number];
const SEGMENT_WAVES: ReadonlyArray<ReadonlyArray<WavePoint>> = [
  // Intake → Consultation: hold, one deliberate rise to the peak, a small
  // settle, then up onto Consultation.
  [[8 / 24, 0, 0], [13 / 24, 1, 0], [18 / 24, 1, 12]],
  // Consultation → Prescription: hold at the peak, controlled descent.
  [[8 / 23, 0, 0], [15 / 23, 1, 0]],
  // Prescription → Follow-up: hold, the decorative second peak, descent onto
  // Follow-up. The peak is a path vertex only — no node, guide or label.
  [[5 / 19, 0, 0], [10 / 19, 1, -26], [14 / 19, 1, -12]],
];

/** Every vertex of the trace, in order. Milestone checkpoints appear verbatim. */
export function buildEcgPoints(checkpoints: readonly ChartPoint[]): ChartPoint[] {
  if (checkpoints.length === 0) return [];
  const first = checkpoints[0];
  const last = checkpoints[checkpoints.length - 1];

  const out: ChartPoint[] = LEAD_IN.map(([dx, dy]) => point(first.x + dx, first.y + dy));
  out.push(first);

  for (let i = 0; i < checkpoints.length - 1; i += 1) {
    const from = checkpoints[i];
    const to = checkpoints[i + 1];
    for (const [t, blend, offset] of SEGMENT_WAVES[i % SEGMENT_WAVES.length]) {
      out.push(point(from.x + t * (to.x - from.x), from.y + blend * (to.y - from.y) + offset));
    }
    out.push(to);
  }

  for (const [dx, dy] of TAIL) out.push(point(last.x + dx, last.y + dy));
  return out;
}

export function buildEcgPath(checkpoints: readonly ChartPoint[]): string {
  return buildEcgPoints(checkpoints)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
}

function point(x: number, y: number): ChartPoint {
  return { x: round(clamp(x)), y: round(clamp(y)) };
}

function clamp(value: number): number {
  return Math.min(98, Math.max(2, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
