# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Patients** (mobile-first): Filipino patients booking teleconsults, often sick, anxious, or on low bandwidth.
- **Doctors** (desktop-first today, mobile in planning): licensed Philippine physicians doing on-demand and scheduled teleconsults. Confirmed 2026-10-08: mobile doctor users skew younger (residents, young GPs), but every doctor flow must still work for a doctor with medium-to-little tech comfort. They are often on the go, between rounds or clinics, using one hand, on mid-range phones and patchy mobile data.
- **Admins / moderators**: KYC review, bookings, user management.

## Product Purpose

BayanHealth connects patients with doctors for remote video, audio, or chat consultations. It covers the whole care loop: booking and intake, triage, the consult, and assessment-first post-consult documentation (Plan, Rx, final ICD, medical certificate, lab/imaging requests, patient education). The doctor signs and releases these outputs to the patient.

Success for doctors: triage, consult, and documentation are fast and safe, and the doctor never misses an urgent patient.

## Positioning

- **Assessment-first CDS gate.** The AI may organize only Subjective/Objective context. Plan, Rx, ICD, certificates, requests, and education stay locked until the physician confirms an Assessment, and the server enforces this.
- **Built for Philippine practice.** PRC/PTR/S2 prescription fields, med certs, bilingual patient education.

## Operating Context

- Doctor lifecycle: KYC onboarding → set availability → go on duty (on-demand) and/or take scheduled bookings → review triage → accept → start consult → video (Google Meet, planned and backend-mediated) or BayanHealth chat fallback → end consult → Review → Assess → Deliver → sign → release.
- A video-provider join, leave, or end never completes a consult clinically. Only the BayanHealth lifecycle does.

## Capabilities and Constraints

- This repository is a **UI/UX-only fork** (see `AGENTS.md`, `UI_UX_AGENT.md`). No business-logic, API, contract, or backend changes. Every UI change is logged in `CHANGELOG_UI_V2.md` and mirrored upstream (see `UI_HANDOFF.md`).
- Stack: Next.js 16 App Router, React 19, Tailwind v4, shadcn (base-nova) + Radix, vaul drawers, lucide-react, TipTap, TanStack Query, Zustand.
- Doctor mobile delivery confirmed as **responsive web only** (no PWA, no native shell, no push notifications in this fork).
- Doctor copy: clinical **English**, with warm **Taglish** allowed only in helper and empty-state microcopy.
- Undecided: how mobile e-signature applies to S2 (dangerous drug) prescriptions under PH rules.

## Brand Commitments

- Brand Navy `--navy-700` (authority), Bayan Teal `--teal-700` (primary action), warm cream/off-white surfaces, Gold for "Soon" only, Red for emergency/critical only.
- Lucide SVG icons; no platform emojis, no AI sparkle badges, no pulsing dots, no neon/glass SaaS styling.

## Evidence on Hand

- Demo personas and cases in `docs/DOCTOR_UI_DEMO_GUIDE.md` (demo data, not real patients or testimonials).
- No real doctor usability data yet. Do not fabricate adoption numbers or testimonials.

## Product Principles

1. The physician decides; the software never implies a clinical conclusion the doctor did not confirm.
2. Never let an urgent patient wait unseen.
3. Clinical safety (allergies, red flags, irreversible actions) outranks speed.
4. Design for the least tech-comfortable licensed doctor; let fluent users go faster through the same screens, not separate ones.

## Accessibility & Inclusion

WCAG 2.1 AA minimum; 48px touch targets; 16px minimum input text; `prefers-reduced-motion` respected; color is never the only signal for severity.
