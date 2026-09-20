import {
  AppleIcon,
  TrafficCone,
  Backpack,
  BriefcaseBusiness,
  MountainSnow,
  School,
  Video,
} from "lucide-react";
import { Service, Language } from "../types/booking.types";
export const SERVICES: Service[] = [
  {
    label: "Regular Consultation",
    value: "teleconsult",
    icon: Video,
    description:
      "Direct in-app video or chat consultation with licensed physicians.",
  },
  {
    label: "Sick Leave",
    value: "sick-leave",
    icon: TrafficCone,
    description:
      "Medical certificate for illness-related absence from work or school.",
  },
  {
    label: "Fit to Travel",
    value: "fit-for-travel",
    icon: Backpack,
    description: "Medical clearance for local or overseas travel.",
  },
  {
    label: "Fit to Work",
    value: "fit-for-work",
    icon: BriefcaseBusiness,
    description:
      "Pre-employment • Annual Physical • Return to Work • OJT Requirement",
  },
  {
    label: "Fit to Climb",
    value: "fit-for-climb",
    icon: MountainSnow,
    description: "Medical assessment for mountain climbing activities.",
  },
  {
    label: "Fit for School",
    value: "fit-for-school",
    icon: School,
    description:
      "Medical clearance for academic institutions (admission, sports, field trips, etc.).",
  },
];

export const SERVICE_PLACEHOLDER = {
  label: "Choose Service",
  value: "",
  icon: AppleIcon,
};

// Only the two languages the platform can actually staff consultations in.
// Regional languages were removed rather than offered and silently ignored.
export const LANGUAGES: Language[] = [
  { value: "tagalog", label: "Tagalog" },
  { value: "english", label: "English" },
];

/**
 * Positive "nothing to report" answer for the multi-select intake fields
 * (allergies, dietary restrictions).
 *
 * Clinically this is NOT the same as leaving the field blank: blank means "not
 * answered", while this value means the patient asserted there is nothing. It
 * is mutually exclusive with every other option and is carried through to the
 * doctor as an explicit negative (see `lib/intakeMapper.ts`).
 */
export const NONE_OPTION = "None";

// Doctor gender preference for the on-demand booking screen (O1). Single-select:
// "any" is the default, explicit "no preference" answer.
export const GENDER_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
];

/**
 * Standardised teleconsult emergency disclaimer.
 *
 * One string, used verbatim everywhere the patient area needs it (home,
 * booking directory, on-demand intake), so the wording cannot drift between
 * screens. It replaces the "Urgent Care (24/7) — Need Immediate Assistance?
 * For medical emergencies requiring immediate attention" card that used to sit
 * on `/patient/booking`: that card offered exactly the care this disclaimer tells
 * patients the platform does not provide, and the two were live on adjacent
 * screens of the same flow.
 */
export const EMERGENCY_DISCLAIMER =
  "Not for emergencies — if you are experiencing severe symptoms, call 911 or go to the nearest ER.";

/**
 * The consultation fee quoted to the patient before they commit, in minor
 * units, and its currency.
 *
 * Mirrors the backend's flat per-booking price: `DEFAULT_AMOUNT_CENTS` /
 * `DEFAULT_CURRENCY` in `backend/src/lib/payments.ts`, which
 * `handlers/bookings.ts` stamps onto every created booking regardless of
 * service. Pricing stays server-owned (ADR-20260726-01) and `PaymentStep` still
 * renders the authoritative `amountCents`/`currency` the booking comes back
 * with — this constant exists only so the intake screen can state the price
 * up front instead of "Shown before you pay". If the backend ever prices per
 * service, this must become a read rather than a mirrored constant.
 */
export const CONSULTATION_FEE_CENTS = 50_000;
export const CONSULTATION_FEE_CURRENCY = "PHP";

/**
 * Typical time between submitting an on-demand request and a doctor accepting
 * it. Stated as a range and labelled "typically" because it is an expectation
 * set for the patient, not a guarantee the platform can enforce — the pool is
 * first-doctor-to-accept.
 */
export const ON_DEMAND_WAIT_ESTIMATE = "Typically connects in ~5–15 mins";

export const DOCTOR_STATUS_MAP: Record<string, string> = {
  available: "Doctor is available Now.",
  busy: "Doctor is busy. You will be queued in this booking.",
  unavailable: "Doctor is unavailable. Scheduled a booking?",
};
