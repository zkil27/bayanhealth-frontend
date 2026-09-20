# BayanHealth Frontend UI Master Documentation & Design Index

Welcome to the centralized UI/UX documentation hub for `bayanhealth-frontend`. This directory contains all authoritative design specifications, component guidelines, user journey scenarios, and architecture references required to design, build, test, and polish the user interface.

---

## 🧭 Navigation & Quick Links

| Category | Description | Primary Path |
| :--- | :--- | :--- |
| **Design System & Anti-Slop** | Brand colors, anti-AI slop rules, typography, mobile/desktop ergonomics | [`/UI_UX_AGENT.md`](../UI_UX_AGENT.md) |
| **Handoff & Porting** | Surgical JSX replacement, preserving data plumbing, ready-to-use prompts | [`/UI_HANDOFF.md`](../UI_HANDOFF.md) |
| **Agent Core Instructions** | High-level operational rules and constraints for AI assistants | [`/AGENTS.md`](../AGENTS.md) |
| **UI Changelog** | Living history of UI/UX improvements, layouts, and responsive fixes | [`/CHANGELOG_UI.md`](../CHANGELOG_UI.md) |
| **Backend & Dev Outputs** | API Gateway URLs, Cognito configuration, test accounts, and `.env` setup | [`/DEV_OUTPUTS.md`](../DEV_OUTPUTS.md) |
| **Feature Specifications** | Complete PRDs, requirements, and component designs for key UI epics | [`/docs/specs/`](./specs/) |
| **Behavioral Scenarios** | Given-When-Then user flows for authentication, booking, and consultation | [`/docs/scenarios/`](./scenarios/) |
| **User Flow Diagrams** | Mermaid sequence and state diagrams for user journeys | [`/docs/diagrams/`](./diagrams/) |
| **Architecture & Video** | Video room, AI scribe UI, local dev server, API design standards | [`/docs/architecture/`](./architecture/) |
| **Product & Steering** | Product overview, capabilities, RBAC roles, tech stack decisions | [`/docs/steering/`](./steering/) |

---

## 🎨 1. Design System & Craft Principles

Before making any visual changes, read **[`UI_UX_AGENT.md`](../UI_UX_AGENT.md)**.

### The Anti-AI Slop Manifesto
BayanHealth is an accredited clinical healthcare platform serving Filipino patients and doctors. interfaces must convey medical authority, warmth, and trustworthiness:
- 🚫 **NO Native Platform Emojis** (`🤒`, `🤧`, `🚨`, `💡`, `✨`, `💊`): Always use intentional, vector-drawn `lucide-react` SVG icons.
- 🚫 **NO One-Sided Glow Gradients**: Use crisp, purposeful 1px solid borders (`border-border`).
- 🚫 **NO Neon SaaS Clichés**: No dark glow blobs, fluorescent cyan/purple gradients, or floating particle backgrounds.
- 🚫 **NO Unjustified Glassmorphism**: High-contrast, opaque or near-opaque surfaces only (`bg-card`).
- 🚫 **NO Pulsing Dots / AI Ping Animations**: Reserve motion strictly for active clinical recording or live streaming.
- 🚫 **NO Hardcoded Hex Colors**: Use semantic tokens from `src/styles/bayanhealth-tokens.css` or Tailwind custom utilities.

### Brand Token Reference
- **Bayan Teal** (`--teal-700` / `#18a58c`): Primary actions, health, forward progress.
- **Brand Navy** (`--navy-700` / `#074972`): Headings, structure, clinical credibility.
- **Brand Cream & Off-White** (`--cream-200` / `#f3eac5`, `--offwhite` / `#fefdfb`): Warm, calming surface backgrounds.
- **Gold Accent** (`--gold-600` / `#e6b332`): "Soon" badges and highlights (never primary CTAs).
- **Red Alert** (`--red-600` / `#b64545`): Emergency notices, 911 triggers, blockers.

### Platform Ergonomics
- **Patient = Mobile-First**:
  - Thumb-zone ergonomics (critical CTAs in bottom 40% of screen).
  - Minimum **48px × 48px** touch targets on all interactive elements.
  - Minimum 16px font size on inputs to avoid iOS auto-zoom.
  - Progressive disclosure with empathetic Taglish phrasing.
- **Doctor = Desktop-First**:
  - High information density (compact, scannable data tables).
  - 3-column clinical cockpit (Patient Queue → Video Stage → Clinical Notes/Prescription).
  - Rapid triage color badges (`--severity-critical`, `--severity-high`, `--severity-moderate`).

---

## 📋 2. Feature Specifications (`docs/specs/`)

Detailed design and requirement documents for major product features:

1. **[`landing-page-redesign`](./specs/landing-page-redesign/requirements.md)**:
   - Header, Hero, Feature Cards, How It Works, Trust Section, Footer.
   - Breakpoint rules, typography scale, backend independence for unauthenticated visitors.
2. **[`dark-mode-support`](./specs/dark-mode-support/requirements.md)**:
   - Full semantic token mapping, contrast standards (WCAG AA 4.5:1 / 3:1), smooth theme transitions.
3. **[`dashboard-audit-improvements`](./specs/dashboard-audit-improvements/requirements.md)**:
   - Doctor and Patient dashboard layout audits, 3-column kanban board, card styling standards (`border-l-3`), touch targets, loading skeletons.
4. **[`demo-readiness-frontend`](./specs/demo-readiness-frontend/requirements.md)**:
   - End-to-end demo flow readiness, mock data handling, zero-failure UI paths.
5. **[`consultation-media-layer`](./specs/consultation-media-layer/requirements.md)**:
   - Video consultation room UI, file uploads/previews, presigned URL media handling.
6. **[`assessment-first-cds-gating`](./specs/assessment-first-cds-gating/requirements.md)**:
   - Clinical decision support (CDS) gating UI, doctor Assessment workflow, SOAP note editor, ICD-10 suggestions, locked/unlocked artifact states.
7. **[`patient-education-corpus-v2-merge`](./specs/patient-education-corpus-v2-merge/requirements.md)**:
   - Patient education card components, bilingual (English + Filipino) content display.
8. **[`demo-gap-fixes`](./specs/demo-gap-fixes/requirements.md)**:
   - Fixes for specific user flow gaps discovered during testing.
9. **[`signatures-p0-fix`](./specs/signatures-p0-fix/design.md)**:
   - Doctor digital signature pad & canvas UI for prescriptions and medical certificates.

---

## 🚶 3. Behavioral Scenarios (`docs/scenarios/`)

End-to-end BDD (Given-When-Then) user stories specifying every user step and error case:

### Authentication
- [`Sign In.md`](./scenarios/authentication/Sign%20In.md)
- [`Sign Up.md`](./scenarios/authentication/Sign%20Up.md)
- [`Admin Manages Sign Up.md`](./scenarios/authentication/Admin%20Manages%20Sign%20Up.md)

### Booking & Triage
- [`Patient Booking.md`](./scenarios/booking/Patient%20Booking.md)
- [`Patient Triage Form.md`](./scenarios/booking/Patient%20Triage%20Form.md)
- [`Doctor Booking and Intake Queue.md`](./scenarios/booking/Doctor%20Booking%20and%20Intake%20Queue.md)
- [`Admin Booking Verification.md`](./scenarios/booking/Admin%20Booking%20Verification.md)

### Consultation
- [`Pre-Consultation.md`](./scenarios/consultation/Pre-Consultation.md)
- [`During Consultation.md`](./scenarios/consultation/During%20Consultation.md)
- [`Post-Consultation.md`](./scenarios/consultation/Post-Consultation.md)

### Doctor Onboarding
- [`Doctor Onboarding.md`](./scenarios/doctor/Doctor%20Onboarding.md)

---

## 🏗️ 4. Architecture & Video Integration (`docs/architecture/`)

- **[`TELECONSULT_VIDEO_AND_AI_SCRIBE.md`](./architecture/TELECONSULT_VIDEO_AND_AI_SCRIBE.md)**: Complete guide to the consultation video room architecture, Daily.co integration, audio streams, and ambient AI scribe interface.
- **[`DEMO_SCRIPT.md`](./architecture/DEMO_SCRIPT.md)**: Step-by-step walkthrough script for demonstrating the full patient and doctor platform flow.
- **[`LOCAL_FRONTEND_DEV_SERVER.md`](./architecture/LOCAL_FRONTEND_DEV_SERVER.md)**: Instructions for running the frontend locally with mock APIs and development flags.
- **[`API_DESIGN_STANDARDS.md`](./architecture/API_DESIGN_STANDARDS.md)**: Naming conventions, response envelopes (`{ data, meta }`), and error payloads (`{ error: { code, message } }`) needed for UI error handling.
- **[`PATIENT_EDUCATION_CORPUS_SCHEMA.md`](./architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md)**: Data schema for bilingual patient health education cards.
- **[`DECISIONS.md`](./architecture/DECISIONS.md)**: Full Architectural Decision Records (ADRs) log.
- **[`PROPOSED-care-roadmap-liveness.md`](./architecture/PROPOSED-care-roadmap-liveness.md)**: Product gaps and proposed contracts for the patient Care Recovery Roadmap.

---

## 🧠 5. Product & System Steering (`docs/steering/`)

- **[`product.md`](./steering/product.md)**: Product overview, core telemedicine capabilities, RBAC roles (`patient`, `doctor`, `admin`, `moderator`).
- **[`tech.md`](./steering/tech.md)**: Technical stack, frontend libraries (Next.js, Tailwind v4, shadcn, Lucide, TipTap, Zustand, TanStack Query).
- **[`structure.md`](./steering/structure.md)**: Project structure, DynamoDB patterns, and contract rules.
- **[`kiro-behavior.md`](./steering/kiro-behavior.md)**: Autonomous agent behaviors and guardrails.

---

## 🔄 6. UI Porting & Synchronization (`UI_HANDOFF.md`)

When updating components or porting visual updates:
1. **The Golden Rule**: *Replace the Visual Shell & Styling (JSX & Tailwind); Preserve Data Plumbing & Business Logic (Hooks & Props).*
2. **Never delete** React Hook Form bindings (`{...register("field")}`), TanStack Query hooks, Zustand stores, or `data-testid` attributes.
3. Consult **[`CHANGELOG_UI.md`](../CHANGELOG_UI.md)** to see recent component redesigns and log every new UI modification.
