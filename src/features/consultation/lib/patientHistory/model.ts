import {
  ageFromDateOfBirth,
  isNegativeAllergy,
  usableAllergyLabel,
  type BookingIntakeForm,
} from "@/features/doctor/lib/api/bookingIntake";

import {
  ALCOHOL_LABELS,
  conditionLabel,
  relativeLabel,
  SEX_OPTION_LABELS,
  TOBACCO_LABELS,
} from "./labels";
import {
  HISTORY_SECTION_IDS,
  type DraftSectionState,
  type HistoryDraft,
  type HistorySectionId,
  type HistoryVersion,
  type PatientHistoryData,
  type VersionSectionState,
} from "./types";

export function emptyHistory(): PatientHistoryData {
  return {
    allergies: { drug: "", noneKnown: false, latex: "" },
    demographics: {
      dateOfBirth: "",
      sex: "",
      address: "",
      nationality: "",
      occupation: "",
      maritalStatus: "",
    },
    medical: {
      conditions: [],
      noneReported: false,
      cancerType: "",
      other: "",
      maintenanceMeds: "",
      seriousIllness: "",
    },
    surgical: { entries: [], noneReported: false },
    family: { conditions: {}, noneReported: false, other: "" },
    obgyn: {
      gravida: "",
      term: "",
      preterm: "",
      abortion: "",
      living: "",
      lastMenstrualPeriod: "",
      intervalDays: "",
      durationDays: "",
      contraception: "",
    },
    social: {
      tobacco: "",
      packsPerDay: "",
      tobaccoYears: "",
      alcohol: "",
      substances: "",
      sexuallyActive: "",
      partners: "",
      sexualContraception: "",
      livesAlone: "",
    },
  };
}

/** Deep copy through JSON: the record is plain data by construction. */
export function cloneHistory(data: PatientHistoryData): PatientHistoryData {
  return JSON.parse(JSON.stringify(data)) as PatientHistoryData;
}

/**
 * Fill what today's intake contract can carry. Everything else stays empty and
 * reads "Not recorded" until the doctor fills it in the call.
 */
export function historyFromIntake(form: BookingIntakeForm | null | undefined): PatientHistoryData {
  const data = emptyHistory();
  const details = form?.sections.details;
  if (!details) return data;

  const allergyText = details.allergies?.trim() ?? "";
  data.allergies.drug = usableAllergyLabel(allergyText) ?? "";
  data.allergies.noneKnown = allergyText !== "" && isNegativeAllergy(allergyText);

  data.demographics.dateOfBirth = details.demographics?.dateOfBirth ?? "";
  data.demographics.sex = details.demographics?.sex ?? "";

  const smh = details.structuredMedicalHistory;
  if (smh) {
    data.medical.conditions = smh.knownConditions.filter((c) => c !== "other");
    data.medical.noneReported = smh.noneReported;
    data.medical.other = smh.other?.trim() ?? "";
    // The intake's only history free text is the "surgery or hospital stay in
    // the last 2 years" answer (MedicalHistoryStep), so it seeds Surgical.
    const stay = smh.details?.trim();
    if (stay) {
      data.surgical.entries = [{ id: "intake", procedure: stay, year: "", complication: "" }];
    }
  }
  data.medical.maintenanceMeds =
    smh?.currentMedications?.trim() || details.medications?.trim() || "";
  if (!smh && details.medicalHistory?.trim()) data.medical.other = details.medicalHistory.trim();

  const repro = details.reproductiveHealth;
  if (repro?.lastMenstrualPeriod) data.obgyn.lastMenstrualPeriod = repro.lastMenstrualPeriod;

  return data;
}

/** Pack-years = packs per day × years smoked, to one decimal. Undefined until both are numbers. */
export function packYears(packsPerDay: string, years: string): number | undefined {
  const packs = Number.parseFloat(packsPerDay);
  const yrs = Number.parseFloat(years);
  if (!Number.isFinite(packs) || !Number.isFinite(yrs) || packs <= 0 || yrs <= 0) return undefined;
  return Math.round(packs * yrs * 10) / 10;
}

/** Whether the female-history section applies. Hidden for male patients only. */
export function showsObGyn(data: PatientHistoryData): boolean {
  return data.demographics.sex !== "male";
}

export function visibleSections(data: PatientHistoryData): HistorySectionId[] {
  return HISTORY_SECTION_IDS.filter((id) => id !== "obgyn" || showsObGyn(data));
}

export interface HistoryRow {
  /** Stable key for diffing; dynamic rows carry their entry id. */
  key: string;
  label: string;
  /** "" when not answered. */
  value: string;
}

export type RowAudience = "doctor" | "patient";

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}

function yesNo(value: "yes" | "no" | ""): string {
  return value === "yes" ? "Yes" : value === "no" ? "No" : "";
}

function join(parts: Array<string | undefined | false>, sep = " · "): string {
  return parts.filter((p): p is string => !!p && p.trim() !== "").join(sep);
}

/**
 * Every answerable line of a section as label/value text. The read views show
 * the non-empty rows; the diff compares all of them by key.
 */
export function sectionRows(
  data: PatientHistoryData,
  id: HistorySectionId,
  audience: RowAudience = "doctor",
): HistoryRow[] {
  const patient = audience === "patient";
  switch (id) {
    case "allergies": {
      const a = data.allergies;
      return [
        {
          key: "drug",
          label: patient ? "Medicines and other allergies" : "Drug / other allergies",
          value: a.noneKnown ? "No known allergies" : a.drug.trim(),
        },
        { key: "latex", label: "Latex", value: yesNo(a.latex) },
      ];
    }
    case "demographics": {
      const d = data.demographics;
      const age = ageFromDateOfBirth(d.dateOfBirth || undefined);
      return [
        {
          key: "dob",
          label: "Date of birth",
          value: d.dateOfBirth ? join([formatDate(d.dateOfBirth), age !== undefined ? `${age} y` : ""], " · ") : "",
        },
        { key: "sex", label: patient ? "Sex at birth" : "Sex", value: d.sex ? SEX_OPTION_LABELS[d.sex] : "" },
        { key: "address", label: "Address", value: d.address.trim() },
        { key: "nationality", label: "Nationality", value: d.nationality.trim() },
        { key: "occupation", label: "Occupation", value: d.occupation.trim() },
        { key: "marital", label: "Marital status", value: d.maritalStatus.trim() },
      ];
    }
    case "medical": {
      const m = data.medical;
      return [
        {
          key: "conditions",
          label: patient ? "Conditions" : "Conditions",
          value: m.noneReported
            ? "None reported"
            : m.conditions.map(conditionLabel).join(", "),
        },
        { key: "cancer", label: "Cancer type", value: m.cancerType.trim() },
        { key: "other", label: "Other", value: m.other.trim() },
        {
          key: "meds",
          label: patient ? "Medicines you take every day" : "Maintenance medicines",
          value: m.maintenanceMeds.trim(),
        },
        {
          key: "serious",
          label: patient ? "Serious injuries or illnesses" : "Serious injuries / illnesses",
          value: m.seriousIllness.trim(),
        },
      ];
    }
    case "surgical": {
      const s = data.surgical;
      if (s.noneReported) return [{ key: "none", label: patient ? "Operations" : "Surgery", value: "None reported" }];
      return s.entries.map((entry) => ({
        key: `surg:${entry.id}`,
        label: entry.procedure.trim() || "Procedure",
        value: join([
          entry.year.trim(),
          entry.complication.trim() ? `Complication: ${entry.complication.trim()}` : "",
        ]) || (patient ? "Recorded" : "No details"),
      }));
    }
    case "family": {
      const f = data.family;
      if (f.noneReported) return [{ key: "none", label: "Family history", value: "None reported" }];
      const rows: HistoryRow[] = Object.entries(f.conditions)
        .filter(([, relatives]) => relatives.length > 0)
        .map(([condition, relatives]) => ({
          key: `fam:${condition}`,
          label: conditionLabel(condition),
          value: relatives.map(relativeLabel).join(", "),
        }));
      rows.push({ key: "other", label: "Other", value: f.other.trim() });
      return rows;
    }
    case "obgyn": {
      const o = data.obgyn;
      const tpal = [o.term, o.preterm, o.abortion, o.living];
      const anyTpal = tpal.some((v) => v.trim() !== "");
      const dash = (v: string) => v.trim() || "–";
      const score = patient
        ? join([
            o.gravida.trim() ? `${o.gravida.trim()} pregnanc${o.gravida.trim() === "1" ? "y" : "ies"}` : "",
            o.living.trim() ? `${o.living.trim()} living child${o.living.trim() === "1" ? "" : "ren"}` : "",
          ], ", ")
        : join([
            o.gravida.trim() ? `G${o.gravida.trim()}` : "",
            anyTpal
              ? `P${dash(String(
                  (Number.parseInt(o.term, 10) || 0) + (Number.parseInt(o.preterm, 10) || 0),
                ))} (${tpal.map(dash).join("-")})`
              : "",
          ], " ");
      return [
        { key: "score", label: patient ? "Pregnancies and children" : "G/P (T-P-A-L)", value: score },
        { key: "lmp", label: patient ? "Last period started" : "LMP", value: formatDate(o.lastMenstrualPeriod) },
        {
          key: "cycle",
          label: patient ? "Cycle" : "Interval / duration",
          value: join([
            o.intervalDays.trim() ? `every ${o.intervalDays.trim()} days` : "",
            o.durationDays.trim() ? `lasts ${o.durationDays.trim()} days` : "",
          ], ", "),
        },
        { key: "contraception", label: "Contraception", value: o.contraception.trim() },
      ];
    }
    case "social": {
      const s = data.social;
      const py = packYears(s.packsPerDay, s.tobaccoYears);
      return [
        {
          key: "tobacco",
          label: patient ? "Smoking" : "Tobacco",
          value: s.tobacco
            ? join([
                TOBACCO_LABELS[s.tobacco],
                s.tobacco !== "never" && s.packsPerDay.trim() ? `${s.packsPerDay.trim()} pack/day` : "",
                s.tobacco !== "never" && s.tobaccoYears.trim() ? `${s.tobaccoYears.trim()} y` : "",
                !patient && s.tobacco !== "never" && py !== undefined ? `${py} pack-years` : "",
              ])
            : "",
        },
        { key: "alcohol", label: "Alcohol", value: s.alcohol ? ALCOHOL_LABELS[s.alcohol] : "" },
        { key: "substances", label: "Other substances", value: s.substances.trim() },
        {
          key: "sexual",
          label: "Sexual history",
          value: join([
            s.sexuallyActive === "yes" ? "Active" : s.sexuallyActive === "no" ? "Not active" : "",
            s.partners.trim() ? `${s.partners.trim()} partner(s)` : "",
            s.sexualContraception.trim(),
          ]),
        },
        { key: "alone", label: "Lives alone", value: yesNo(s.livesAlone) },
      ];
    }
  }
}

export function isSectionEmpty(data: PatientHistoryData, id: HistorySectionId): boolean {
  return sectionRows(data, id).every((row) => row.value === "");
}

/** Section equality by its displayed facts, so whitespace-only edits do not count as changes. */
export function sectionsEqual(
  a: PatientHistoryData,
  b: PatientHistoryData,
  id: HistorySectionId,
): boolean {
  const left = sectionRows(a, id);
  const right = sectionRows(b, id);
  if (left.length !== right.length) return false;
  return left.every((row, i) => row.key === right[i].key && row.value === right[i].value);
}

/** Start a working draft: from the latest version when there is one, otherwise from the intake. */
export function startDraft(
  bookingId: string,
  latest: HistoryVersion | undefined,
  intake: BookingIntakeForm | null | undefined,
): HistoryDraft {
  return {
    bookingId,
    baseVersion: latest?.version ?? null,
    data: latest ? cloneHistory(latest.data) : historyFromIntake(intake),
    reviewed: [],
    edited: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Where one section of the draft stands. See {@link DraftSectionState}. */
export function draftSectionState(
  draft: HistoryDraft,
  base: HistoryVersion | undefined,
  id: HistorySectionId,
): DraftSectionState {
  const reviewed = draft.reviewed.includes(id);
  const edited = draft.edited.includes(id);
  const changed = base ? !sectionsEqual(draft.data, base.data, id) : edited;

  if (isSectionEmpty(draft.data, id) && !reviewed) return "not_recorded";
  if (changed && (edited || reviewed)) return "updated";
  if (reviewed || edited) return "reviewed";
  if (!base) return "from_intake";
  return "carried";
}

/** Freeze the draft's section states for a saved version. */
export function versionSectionStates(
  draft: HistoryDraft,
  base: HistoryVersion | undefined,
): Record<HistorySectionId, VersionSectionState> {
  const out = {} as Record<HistorySectionId, VersionSectionState>;
  for (const id of HISTORY_SECTION_IDS) {
    const state = draftSectionState(draft, base, id);
    out[id] =
      state === "from_intake" ? "patient_reported" : state === "not_recorded" ? "not_recorded" : state;
  }
  return out;
}

/**
 * What today's intake says that the latest version does not, per section, so
 * a returning patient's new allergy or condition is never buried under the
 * carried-forward chart.
 */
export function intakeNotes(
  latest: HistoryVersion | undefined,
  intake: BookingIntakeForm | null | undefined,
): Partial<Record<HistorySectionId, string>> {
  if (!latest || !intake) return {};
  const today = historyFromIntake(intake);
  const notes: Partial<Record<HistorySectionId, string>> = {};

  const drug = today.allergies.drug.trim();
  if (drug && !latest.data.allergies.drug.toLowerCase().includes(drug.toLowerCase())) {
    notes.allergies = `Intake today lists: ${drug}`;
  }
  const newConditions = today.medical.conditions.filter(
    (c) => !latest.data.medical.conditions.includes(c),
  );
  const meds = today.medical.maintenanceMeds.trim();
  const medsDiffer = meds !== "" && meds !== latest.data.medical.maintenanceMeds.trim();
  if (newConditions.length > 0 || medsDiffer) {
    notes.medical = join([
      newConditions.length > 0 ? `New on intake: ${newConditions.map(conditionLabel).join(", ")}` : "",
      medsDiffer ? `Medicines on intake: ${meds}` : "",
    ], ". ");
  }
  const stay = today.surgical.entries[0]?.procedure.trim();
  if (stay && !latest.data.surgical.entries.some((e) => e.procedure.includes(stay))) {
    notes.surgical = `Intake today: ${stay}`;
  }
  const lmp = today.obgyn.lastMenstrualPeriod;
  if (lmp && lmp !== latest.data.obgyn.lastMenstrualPeriod) {
    notes.obgyn = `LMP on intake today: ${formatDate(lmp)}`;
  }
  return notes;
}

export { formatDate as formatHistoryDate };
