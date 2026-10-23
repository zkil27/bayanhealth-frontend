import type { LucideIcon } from "lucide-react";

import {
  BookOpen,
  FileText,
  Languages,
  Lock,
  MapPin,
  Pill,
  Share2,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";

import { PRIVACY_HREF, REFUND_HREF } from "./legal/legalContent";
import { MEDICAL_HUB_HREF } from "./medicalHubContent";

/**
 * Landing page content.
 *
 * Written in English. "bayan" stays in the headline as the brand's own word;
 * "LGU", "PRC", "barangay" stay because they are the terms the audience uses.
 *
 * Everything here is marketing copy about what the product does. Nothing on this
 * page reads live data, so there is nothing here that can go stale against the
 * backend.
 */

// --- Interfaces ---

export interface NavLink {
  label: string;
  href: string;
}

export interface AudienceCard {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: { label: string; href: string };
  /**
   * Which path is the page's lead.
   *
   * Exactly one card is primary. It is drawn larger and carries the solid
   * waitlist button ({@link WAITLIST_CTA}) with its own `cta` as a quiet text
   * link beside it. The secondary card carries only its text link, so the two
   * paths never present two equally loud buttons.
   */
  ctaVariant: "primary" | "secondary";
  /** {@link CareTrack} ids listed inside this card, in order. */
  trackIds: string[];
  /** Path under `public/` for the card's photograph. */
  imageSrc: string;
  /** Alt text for the card's photograph. */
  imageAlt: string;
  /** The hairline border colour that ties the card to its path. */
  accent: "green" | "blue";
}

export interface StepItem {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface TrustItem {
  icon: LucideIcon;
  label: string;
}

export interface FooterColumn {
  heading: string;
  links: NavLink[];
}

// --- Shared destinations ---

/** Where every "Consult a doctor" call to action goes. */
export const CONSULT_HREF = "/patient/booking";

/**
 * Where the organisation funnel goes.
 *
 * This pointed at `/signUp` while no partnerships channel existed. It now has
 * one: `/para-sa-organisasyon` states the offer and captures the lead through
 * the same waitlist form, with the segment fixed to the partner option. Still a
 * single constant so every organisation call to action moves together.
 */
export const ORGANISATION_CONTACT_HREF = "/para-sa-organisasyon";

/** The waitlist section on the landing page. */
export const WAITLIST_HREF = "/#waitlist";

/**
 * Where the marketing surfaces that are announced but not built yet point.
 *
 * Case Studies is in the nav because the story it tells is part of the pitch;
 * the page behind it is not written. A single holding route is honest about
 * that in a way a dead `#` anchor or a 404 is not, and it is one constant so
 * each surface can be repointed at its real page as it ships.
 */
export const COMING_SOON_HREF = "/coming-soon";

// --- Safety notice -----------------------------------------------------------

/**
 * Emergency disclaimer.
 *
 * Shown twice by design — once directly under the hero's call to action and
 * once in the footer — because it is the one piece of copy on this page whose
 * absence could cause harm. A telehealth landing page that reads as "see a
 * doctor now" must say, at the point of action, what it is not for.
 */
export const EMERGENCY_NOTICE =
  "For immediate medical threats, call 911 or visit the nearest emergency room.";

// --- Static content ----------------------------------------------------------

/**
 * The page's one conversion goal while BayanHealth is pre-launch.
 *
 * Every solid call to action on the landing page wears this exact label and
 * goes to the waitlist form, so a visitor never has to work out whether
 * "Consult a Doctor", "Start a consultation", and "Join Our Waitlist" are three
 * different things. Booking and the Med Hub stay reachable as quiet text links.
 * When booking goes live, repoint this one constant.
 */
export const WAITLIST_CTA = {
  label: "Join the waitlist",
  href: WAITLIST_HREF,
} as const;

/**
 * Header navigation.
 *
 * The Med Hub route and Case Studies (which has no page yet, so it points at
 * `/coming-soon` rather than a dead anchor). The waitlist is not a nav link:
 * it is the header's solid button ({@link WAITLIST_CTA}), and listing it twice
 * made the bar read as two competing actions. On phones these links move into
 * the header's menu sheet.
 *
 * "Med Hub" rather than the page's own "Medical Resource Hub": the nav has room
 * for a label, not a title.
 */
export const NAV_LINKS: NavLink[] = [
  { label: "Med Hub", href: MEDICAL_HUB_HREF },
  { label: "Case Studies", href: COMING_SOON_HREF },
];

/** Extra in-page anchors offered only in the phone menu, where scrolling is the long way round. */
export const MOBILE_MENU_ANCHORS: NavLink[] = [
  { label: "How it works", href: "/#paano-ito-gumagana" },
  { label: "Common questions", href: "/#faq" },
];

export const HERO_CONTENT = {
  headline: "Powering healthcare for every Bayan.",
  /** The stretch of {@link HERO_CONTENT.headline} set in solid brand teal. */
  headlineAccent: "every Bayan",
  script: "Accessible care, guided by purpose.",
  body: "BayanHealth is now connecting patients, clinicians, and health systems — built for scale, designed for the Filipino context.",
  /**
   * The hero visual crossfades through these. Order is the display order;
   * `imageAlt` describes the set for assistive technology.
   */
  images: [
    "/landing/consult.png",
    "/landing/call-center.png",
    "/landing/elderly-2.png",
  ],
  imageAlt:
    "Filipino patients and clinicians connecting through a BayanHealth consultation.",
} as const;

/** The three promises shown as chips under the hero. */
export const HERO_ASSURANCES: TrustItem[] = [
  { icon: ShieldCheck, label: "Verified PRC Doctors" },
  { icon: Languages, label: "Filipino & English Support" },
  { icon: FileText, label: "Digital Summary & Care" },
];

export const AUDIENCE_CONTENT = {
  heading: "Where would you like to start?",
  subheading: "Book a consultation, or read up first.",
} as const;

export const AUDIENCES: AudienceCard[] = [
  {
    // The header nav deep-links here as "#para-sa-pamilya"; keep the id in sync
    // with NAV_LINKS if it changes.
    id: "para-sa-pamilya",
    icon: Users,
    title: "For you & your family",
    description:
      "Talk to a licensed doctor by video, voice, or chat. Get a clear assessment, a prescription and referral when needed, and a care summary you can act on — without leaving home.",
    cta: { label: "Start a consultation", href: CONSULT_HREF },
    ctaVariant: "primary",
    trackIds: ["general-consultation", "specialist-referral"],
    imageSrc: "/landing/family.png",
    imageAlt: "A Filipino family at home together during a video consultation.",
    accent: "green",
  },
  {
    // Kept as "para-sa-organisasyon" because the header nav still anchors here.
    // The card now points at the Med Hub rather than the organisation funnel.
    id: "para-sa-organisasyon",
    icon: BookOpen,
    title: "Learn before you consult",
    description:
      "Free, doctor-reviewed guidance on common symptoms and conditions. Read up first, then book a consultation when you need one.",
    cta: { label: "Open the Med Hub", href: MEDICAL_HUB_HREF },
    ctaVariant: "secondary",
    trackIds: ["clinical-guidelines"],
    imageSrc: "/landing/consult-2.jpg",
    imageAlt: "A clinician reviewing guidance before a consultation.",
    accent: "blue",
  },
];

export const JOURNEY_CONTENT = {
  heading: "Your care doesn't end at the consult.",
  subheading:
    "We guide you to the next step and follow up, so your care continues after the call.",
} as const;

export const STEPS: StepItem[] = [
  {
    number: 1,
    icon: Video,
    title: "Consult",
    description: "Talk to a licensed doctor by video, voice, or chat.",
  },
  {
    number: 2,
    icon: FileText,
    title: "Care summary",
    description:
      "A clear, doctor-approved summary of your visit — in plain language.",
  },
  {
    number: 3,
    icon: Pill,
    title: "Prescription & referral",
    description:
      "E-prescription, lab requests, and referrals when clinically appropriate.",
  },
  {
    number: 4,
    icon: MapPin,
    title: "Ongoing follow-up",
    description:
      "We send reminders and route you to the nearest pharmacy, lab, or clinic.",
  },
];

export const TRUST_INDICATORS: TrustItem[] = [
  { icon: Lock, label: "End-to-end encrypted consultations" },
  {
    icon: ShieldCheck,
    label: "Only you and your doctor can see your clinical record",
  },
  { icon: Stethoscope, label: "Care that reaches your barangay" },
];

export const FOOTER_CONTENT = {
  tagline:
    "Accessible, guided healthcare for Filipino families — built with trust, clarity, and compassion.",
} as const;

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "For families",
    links: [
      { label: "Consult a Doctor", href: CONSULT_HREF },
      { label: "How it works", href: "/#paano-ito-gumagana" },
      { label: "Care continuity", href: "/#paano-ito-gumagana" },
    ],
  },
  {
    heading: "For organizations",
    links: [
      { label: "Map your care gaps", href: "/#para-sa-organisasyon" },
      { label: "Talk to our team", href: ORGANISATION_CONTACT_HREF },
      { label: "Become a partner", href: ORGANISATION_CONTACT_HREF },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Med Hub", href: MEDICAL_HUB_HREF },
      { label: "Case Studies", href: COMING_SOON_HREF },
      { label: "Join the waitlist", href: WAITLIST_HREF },
    ],
  },
];

/**
 * Legal links shown in the footer's bottom bar, beside the emergency notice and
 * the copyright line. Kept out of {@link FOOTER_COLUMNS} on purpose: these are
 * the standing policy pages every visitor should be able to find, not another
 * marketing column.
 */
export const FOOTER_LEGAL_LINKS: NavLink[] = [
  { label: "Privacy Policy", href: PRIVACY_HREF },
  { label: "Refund Policy", href: REFUND_HREF },
];

// --- Coming soon -------------------------------------------------------------

/**
 * Copy for the holding page behind {@link COMING_SOON_HREF}.
 *
 * It names what is missing and then offers the two things that do exist, so the
 * page is a redirection rather than a dead end. The heading is supplied by the
 * route, because one holding page serves every announced-but-unbuilt surface.
 */
export const COMING_SOON_CONTENT = {
  eyebrow: "Coming soon",
  body: "We're still building this section. In the meantime, the Medical Resource Hub has our clinical guidelines — or consult a licensed doctor now.",
  primaryCta: { label: "Consult a Doctor", href: CONSULT_HREF },
  secondaryCta: { label: "Open the Med Hub", href: MEDICAL_HUB_HREF },
  homeCta: { label: "Back to home", href: "/" },
} as const;

// --- Waitlist ----------------------------------------------------------------

/**
 * The three audiences the waitlist segments by.
 *
 * `value` is the wire enum accepted by `POST /api/waitlist`; `label` is what the
 * visitor reads. They are deliberately different: the endpoint's contract should
 * not shift because a marketing label is reworded.
 */
export const WAITLIST_SEGMENTS = [
  { value: "PATIENT", label: "Patient / Family" },
  { value: "DOCTOR", label: "Licensed Physician" },
  { value: "ORGANIZATION", label: "LGU / Employer Partner" },
] as const;

export type WaitlistSegment = (typeof WAITLIST_SEGMENTS)[number]["value"];

export const WAITLIST_CONTENT = {
  heading: "Join our waitlist",
  body: "Be the first to experience quality care within reach. Join our early access list.",
  emailLabel: "Email address",
  emailPlaceholder: "juan@example.ph",
  nameLabel: "Full name",
  namePlaceholder: "Juan dela Cruz",
  segmentLabel: "I am a...",
  organisationLabel: "Organization name",
  organisationPlaceholder: "LGU, employer, or school",
  submitLabel: "Reserve my spot",
  submittingLabel: "Submitting...",
  successHeading: "Thanks for your interest!",
  successBody:
    "We've added your email to the BayanHealth early access list. We'll be in touch soon.",
  errorBody: "We couldn't submit your information. Please try again.",
  rateLimitedBody:
    "Too many attempts. Please wait a moment before trying again.",
  retryLabel: "Try again",
} as const;

// --- Med Hub conversion banner -----------------------------------------------

/** The two exits from the Medical Resource Hub. */
export const MED_HUB_CONVERSION = {
  heading: "Ready to get started?",
  body: "These are the protocols every BayanHealth consultation follows.",
  patientCta: { label: "Consult a Doctor Now", href: CONSULT_HREF },
  partnerCta: {
    label: "Partner With Us / Request a Demo",
    href: ORGANISATION_CONTACT_HREF,
  },
} as const;

// --- Care tracks -----------------------------------------------------------

/**
 * The three ways in, listed inside the two audience cards (see
 * {@link AudienceCard.trackIds}) rather than as a second row of cards that
 * repeated the same choice.
 *
 * Each track carries a lucide icon that pictures what it is — a stethoscope for
 * a consult, a share glyph for a referral, an open book for the reading hub.
 * Exactly one track is the default (General Consultation): the page's whole
 * argument is that care starts there, so it wears the "Start here" tag.
 */
export interface CareTrack {
  id: string;
  /** Icon that pictures the track. */
  icon: LucideIcon;
  title: string;
  description: string;
  /** The quiet reassurance line under the description. */
  note: string;
  /** The one track the page steers everyone to first. */
  isDefault?: boolean;
}

export const CARE_TRACKS: CareTrack[] = [
  {
    id: "general-consultation",
    icon: Stethoscope,
    title: "General consultation",
    description:
      "Common symptoms, quick answers, and clear next steps — all in one consult.",
    note: "Most patients start here and get what they need.",
    isDefault: true,
  },
  {
    id: "specialist-referral",
    icon: Share2,
    title: "Specialist referral",
    description:
      "If a specialist is needed, we guide and match you after the first consult.",
    note: "No guesswork. Fees shown before booking.",
  },
  {
    id: "clinical-guidelines",
    icon: BookOpen,
    title: "Clinical guidelines",
    description:
      "Free health guidance for you and quick reads before you consult.",
    note: "Learn first, consult when needed.",
  },
];

// --- Testimonials ----------------------------------------------------------

/**
 * Illustrative consultation stories.
 *
 * These are scenarios the product is built for, not quotes from named patients
 * on file — the same honesty line the rest of this page holds (see
 * {@link LandingMedia} and {@link ORGANISATION_PAGE_CONTENT}). `attribution` is
 * a first name and city or "Anonymous"; `context` names the kind of consult.
 */
export interface Testimonial {
  quote: string;
  attribution: string;
  context: string;
}

export const TESTIMONIALS_CONTENT = {
  heading: "Stories from Filipino families",
  // Says plainly what these are. The previous "Real consultations. Real
  // relief." claimed patient testimony the product does not have yet.
  subheading:
    "Illustrative stories, based on the kinds of consultations BayanHealth is built for.",
  /** The tag on every story card, so no single quote reads as a real patient on its own. */
  label: "Illustrative",
  cta: { label: "Start your consultation", href: CONSULT_HREF },
} as const;

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "My child had a fever late at night. We didn't know if it was serious. We talked to a doctor in minutes and got clear steps right away.",
    attribution: "Maria L., Quezon City",
    context: "Pediatric consultation",
  },
  {
    quote:
      "I was worried about my blood pressure but didn't want to go to the ER. The doctor explained everything clearly and adjusted my meds.",
    attribution: "Ramon D., Cebu",
    context: "General consultation",
  },
  {
    quote:
      "I just needed someone to talk to. The session felt private, calm, and respectful. It helped more than I expected.",
    attribution: "Anonymous",
    context: "Mental health support",
  },
];

// --- Doctors -----------------------------------------------------------------

/**
 * The physicians shown in the "Care led by Filipino doctors" carousel.
 *
 * Names, bios, and headshots are real team information supplied by the business.
 * `imageSrc` points at a portrait under `public/`; the card falls back to
 * initials if it fails to load.
 */
export interface Doctor {
  name: string;
  /** Shown under the name, e.g. "General Physician". */
  credential: string;
  /** One line of context — role, focus, or distinction. */
  bio: string;
  /** Path under `public/` for the headshot. */
  imageSrc: string;
}

export const DOCTORS_CONTENT = {
  heading: "Care led by Filipino doctors",
  subheading: "Licensed, experienced, and rooted in the same communities we serve.",
} as const;

export const DOCTORS: Doctor[] = [
  {
    name: "Dr. Marco Paolo Perpetua",
    credential: "General Physician",
    bio: "Founder & Lead Physician · Advocate for accessible, tech-enabled care",
    imageSrc: "/landing/doc-marco.png",
  },
  {
    name: "Dr. Kenneth Jed Robenta",
    credential: "General Physician",
    bio: "Medical educator and health advocate on digital platforms",
    imageSrc: "/landing/doc-jed.png",
  },
  {
    name: "Dr. Florenz Gabriel Perpetua",
    credential: "General Physician",
    bio: "Cum Laude · Top Intern · Leadership in Training Awardee",
    imageSrc: "/landing/doc-gabriel.png",
  },
];

// --- FAQ -----------------------------------------------------------------------

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_CONTENT = {
  heading: "Common questions",
  subheading: "Quick answers before you start.",
  imageSrc: "/landing/consult-3.jpg",
  imageAlt: "A patient on a BayanHealth telehealth consultation.",
} as const;

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How fast can I talk to a doctor?",
    // Phrased as a target, not a measurement: the page is pre-launch, so
    // there is no connection-time data to quote yet.
    answer:
      "Once we launch, we aim to connect you with a doctor in under 10 minutes, depending on availability.",
  },
  {
    question: "Is telehealth safe and private?",
    answer:
      "Yes. Consultations are encrypted and handled in compliance with data privacy regulations.",
  },
  {
    question: "Can I see a specialist?",
    answer:
      "Yes. You usually start with a General Consultation, and we guide you to a specialist if needed.",
  },
  {
    question: "How much are the consultations?",
    answer:
      "Our consultations are priced at ₱500.00 exclusive of tax.",
  },
  {
    question: "What conditions can you help with?",
    answer:
      "Common symptoms like fever, cough, colds, stomach pain, skin issues, and mental health concerns.",
  },
];

// --- Organisation page -------------------------------------------------------

/**
 * Copy for `/para-sa-organisasyon`.
 *
 * The claims here are deliberately about reach and process, not outcomes: the
 * product has no pilot data to quote, and a partnerships page that invented a
 * headcount or a saving would be exactly the class of fabricated claim this
 * codebase already had to remove once.
 */
export const ORGANISATION_PAGE_CONTENT = {
  eyebrow: "For organizations",
  heading: "Bring a doctor closer to your community.",
  body: "Employers, LGUs, schools, and communities — map your care gaps and give every member access to a licensed doctor, wherever they are.",
  points: [
    {
      title: "Consult from anywhere",
      description:
        "Video, voice, or chat with a PRC-licensed doctor — no travel, no queues.",
    },
    {
      title: "A care summary every visit",
      description:
        "A doctor-approved summary in Filipino and English, so the next step is clear.",
    },
    {
      title: "CPG-aligned",
      description:
        "Every consultation follows the clinical practice guidelines of the DOH, PhilHealth, PAFP, and WHO.",
    },
  ],
  formHeading: "Talk to our team",
  formBody:
    "Leave your details and our team will get back to you for a demo.",
} as const;
