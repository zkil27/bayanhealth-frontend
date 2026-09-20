import { api, ApiError } from "@/lib/api";

/**
 * Patient-readable released patient education (ADR-20260806-04).
 *
 * `GET /v1/cds/consultations/{consultationId}/patient-education/released` is the
 * only CDS route a patient may call. Release already set `patientVisible: true`
 * on the artifact; until this existed, nothing read it, so a released article had
 * no reader.
 */

/** One section of the article, tagged with the language it is written in. */
export interface PatientEducationSection {
  heading: string;
  content: string;
  language?: "english" | "filipino";
}

/** The article payload, mirroring `CdsPatientEducationPayload`. */
export interface PatientEducationPayload {
  title: string;
  titleFilipino?: string;
  language: "english" | "taglish" | "bilingual";
  icd10Code?: string;
  /** Guideline source, reviewer, and review date. Mandatory for corpus-backed articles. */
  citation?: string;
  corpusVersion?: string;
  sections: PatientEducationSection[];
  warningSigns: string[];
}

export interface ReleasedPatientEducation {
  consultationId: string;
  releasedAt: string;
  payload: PatientEducationPayload;
}

/**
 * Read the released article for a consultation.
 *
 * Returns null on 404, which the backend uses for every negative outcome —
 * unknown consultation, non-participant caller, and "nothing released yet" are
 * deliberately indistinguishable. The caller therefore renders "not available
 * yet" rather than an error, because the overwhelmingly common case is a
 * consultation whose physician has not released education.
 */
export async function fetchReleasedPatientEducation(
  idToken: string,
  consultationId: string,
): Promise<ReleasedPatientEducation | null> {
  if (!idToken || !consultationId) return null;
  try {
    const res = await api.get<ReleasedPatientEducation>(
      `/v1/cds/consultations/${encodeURIComponent(consultationId)}/patient-education/released`,
      idToken,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Group sections by heading, preserving order, so EN/FIL pairs render together. */
export function groupSectionsByHeading(
  sections: PatientEducationSection[],
): { heading: string; english?: string; filipino?: string; untagged: string[] }[] {
  const order: string[] = [];
  const grouped = new Map<
    string,
    { heading: string; english?: string; filipino?: string; untagged: string[] }
  >();

  for (const section of sections) {
    if (!grouped.has(section.heading)) {
      grouped.set(section.heading, { heading: section.heading, untagged: [] });
      order.push(section.heading);
    }
    const entry = grouped.get(section.heading)!;
    if (section.language === "english") entry.english = section.content;
    else if (section.language === "filipino") entry.filipino = section.content;
    // An untagged section predates the bilingual corpus shape; keep it rather
    // than guessing which language it is in.
    else entry.untagged.push(section.content);
  }

  return order.map((heading) => grouped.get(heading)!);
}
