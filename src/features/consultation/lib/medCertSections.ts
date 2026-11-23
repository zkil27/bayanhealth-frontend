/**
 * Bed rest, Fit to work and Care plan lines for the Medical certificate
 * (clinical remarks Nov 16).
 *
 * Doctors found "Valid from / Valid through" confusing ("di alam kung ano
 * yan") and asked for three separate lines that print on the certificate
 * as written. The contract (`CdsMedicalCertificatePayload`) only has free-text
 * `restrictions` plus two required dates, so this fork stores the three lines
 * inside `restrictions` as labeled lines:
 *
 *     Bed rest: 3 days, Nov 23–25
 *     Fit to work: May return Nov 26
 *     Care plan: Paracetamol as prescribed.
 *     Return if fever persists past 3 days.
 *
 * HANDOFF: the main repo should replace this with real `bedRest`, `fitToWork`
 * and `carePlan` contract fields and drop `validFrom`/`validThrough` from the
 * physician-facing form; this module is then the only place to change.
 */

export interface MedCertSections {
  bedRest: string;
  fitToWork: string;
  carePlan: string;
}

export const MED_CERT_SECTION_LABELS: Record<keyof MedCertSections, string> = {
  bedRest: "Bed rest",
  fitToWork: "Fit to work",
  carePlan: "Care plan",
};

const LABEL_PATTERN = /^(bed rest(?: recommendation)?|fit to (?:work|return)|care plan)\s*:[ \t]?/i;

function keyOf(label: string): keyof MedCertSections {
  const lower = label.toLowerCase();
  if (lower.startsWith("bed rest")) return "bedRest";
  if (lower.startsWith("fit to")) return "fitToWork";
  return "carePlan";
}

const EMPTY: MedCertSections = { bedRest: "", fitToWork: "", carePlan: "" };

/** "2026-11-23" → "Nov 23, 2026", read as a calendar date (no timezone shift). */
export function formatCertDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Reads the three lines back out of `restrictions`.
 *
 * Text without labels (AI drafts and certificates written before this change)
 * is kept whole as the Care plan, and a date range that spans more than one day
 * becomes the Bed rest line, so nothing an older draft said is lost.
 */
export function parseMedCertRestrictions(
  restrictions: string | undefined,
  dates?: { validFrom?: string; validThrough?: string },
): MedCertSections {
  const text = restrictions ?? "";
  const lines = text.split("\n");
  const labeled = lines.some((line) => LABEL_PATTERN.test(line));

  if (!labeled) {
    const from = dates?.validFrom;
    const through = dates?.validThrough;
    const bedRest =
      from && through && from !== through
        ? `${formatCertDate(from) ?? from} to ${formatCertDate(through) ?? through}`
        : "";
    return { ...EMPTY, bedRest, carePlan: text.trim() ? text : "" };
  }

  const sections: Record<keyof MedCertSections, string[]> = { bedRest: [], fitToWork: [], carePlan: [] };
  // Any text before the first label belongs to the Care plan.
  let current: keyof MedCertSections = "carePlan";
  for (const line of lines) {
    const match = LABEL_PATTERN.exec(line);
    if (match) {
      current = keyOf(match[1]);
      sections[current].push(line.slice(match[0].length));
    } else {
      sections[current].push(line);
    }
  }
  return {
    bedRest: sections.bedRest.join("\n"),
    fitToWork: sections.fitToWork.join("\n"),
    carePlan: sections.carePlan.join("\n"),
  };
}

/** Writes the three lines into `restrictions`; `undefined` when all are blank. */
export function serializeMedCertRestrictions(sections: MedCertSections): string | undefined {
  const out = (Object.keys(MED_CERT_SECTION_LABELS) as (keyof MedCertSections)[])
    .filter((key) => sections[key].trim())
    .map((key) => `${MED_CERT_SECTION_LABELS[key]}: ${sections[key]}`);
  return out.length > 0 ? out.join("\n") : undefined;
}
