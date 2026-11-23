import type { CdsDiagnosticRequestPayload } from "@/types/cds-contract";

/**
 * One "Test" field for a diagnostic request item (clinical remarks Nov 16:
 * "Test name" and "Study name" read as the same thing).
 *
 * The contract keeps both: `testName` for lab / urinalysis / other and
 * `studyName` for imaging. The single field reads and writes the one the
 * modality calls for, falling back to the other so older drafts still show.
 */
type DiagnosticItem = CdsDiagnosticRequestPayload["items"][number];
type DiagnosticModality = CdsDiagnosticRequestPayload["modality"];

/** Which contract field the single Test input writes for a modality. */
function testFieldFor(modality: DiagnosticModality): { own: "studyName" | "testName"; other: "studyName" | "testName" } {
  return modality === "imaging" ? { own: "studyName", other: "testName" } : { own: "testName", other: "studyName" };
}

/** The value the one Test field shows: the modality's own field, else the other one. */
export function diagnosticTestValue(item: DiagnosticItem, modality: DiagnosticModality): string {
  const { own, other } = testFieldFor(modality);
  return item[own] || item[other] || "";
}

/** Writes the Test value; a value that was shown from the other field moves over. */
export function withDiagnosticTest(item: DiagnosticItem, modality: DiagnosticModality, value: string): DiagnosticItem {
  const { own, other } = testFieldFor(modality);
  return { ...item, [own]: value, ...(item[own] ? {} : { [other]: undefined }) };
}

/** On a modality change, moves the Test value into the field the new modality uses. */
export function moveTestToModality(item: DiagnosticItem, modality: DiagnosticModality): DiagnosticItem {
  const { own, other } = testFieldFor(modality);
  if (item[own] || !item[other]) return item;
  return { ...item, [own]: item[other], [other]: undefined };
}
