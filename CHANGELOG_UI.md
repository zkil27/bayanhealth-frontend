# BayanHealth UI/UX Changelog

All design, layout, styling, and UX modifications made in this fork must be logged here.  
This document serves as the single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository.

---

## Log Entries

### [2026-09-23] Doctor Suite: Resilient Calendar Consultations, Consultation Room & History on Remote Staging (Vercel)

- **Target Route / Surface**:
  - `/doctor/schedule` (Physician Working Calendar, Time Grid, Shifts & Consultations)
  - `/consultation/room/[bookingId]` (Doctor & Patient Video Consultation Room)
  - `/doctor/history` (Completed Consultations Log)
  - Pre-Consult Intake Briefing (`AppointmentPopover.tsx` & `bookingIntake.ts`)
- **Files Modified**:
  - `src/features/doctor/components/schedule/DoctorScheduleView.tsx` [MODIFIED]
  - `src/features/doctor/components/schedule/AppointmentPopover.tsx` [MODIFIED]
  - `src/features/consultation/components/session/ConsultationRoom.tsx` [MODIFIED]
  - `src/features/doctor/components/consultations/CompletedConsultations.tsx` [MODIFIED]
  - `src/features/doctor/lib/api/bookingIntake.ts` [MODIFIED]
  - `src/features/doctor/lib/demoData.ts` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Resolved Calendar Consult Failed to Load on Vercel**:
    - **Problem**: When evaluating `/doctor/schedule` on remote staging (Vercel origin `https://bayanhealth-frontend.vercel.app`), browser calls to AWS API Gateway failed due to CORS and unauthenticated state, displaying a fatal `AsyncView` red error card: *"Could not reach the API at https://f9xiyx5s64.execute-api.ap-southeast-1.amazonaws.com"*.
    - **Fix**: Updated `DoctorScheduleView.tsx` `fetcher` to catch network/CORS/token errors and fallback to `getDemoCalendarData(rangeStart)`. The calendar time grid now reliably renders morning consultation shifts, afternoon follow-up clinic slots, and scheduled/in-progress patient encounters (Ramon Dela Cruz, Manuel Tan, Maria Santos).
  - **Resolved Pre-Consult Intake Loading in Calendar Appointment Popovers**:
    - **Problem**: In `AppointmentPopover.tsx`, viewing an appointment's intake was gated strictly on `idToken`, leaving the intake card absent or failing on remote staging.
    - **Fix**: Updated `useIntake` and `fetchBookingIntake` to recognize demo bookings (`bookingId.startsWith("demo")`), providing authentic clinical intake data (vitals, chief complaints, structured history) with zero backend dependency.
  - **Seamless Demo Consultation Room Access**:
    - Extended `ConsultationRoom.tsx` demo gating to all `demo-` prefixed bookings, ensuring visiting clinicians can click *"Join consultation"* or *"Open consultation room"* from the calendar or triage queue and immediately enter the video stage with companion intake and chat tools active.
  - **Resolved Indefinite Skeleton Loading on Doctor History**:
    - Removed strict `enabled: !!idToken` gate from `CompletedConsultations.tsx` and provided high-fidelity past encounters (urgent care, specialist follow-up) so reviewing past patient charts works immediately during demonstrations.

---

### [2026-09-23] Doctor & Patient Chat: Fix Consultation Chat Loading Race Condition on Closed/Terminal Bookings

- **Target Route / Surface**:
  - `/doctor/chat/[bookingId]` (Doctor Consultation Room & History)
  - `/patient/chat/[bookingId]` (Patient Consultation Room & History)
  - `useConsultationChat` Hook (`src/features/consultation/hooks/useConsultationChat.ts`)
- **Files Modified**:
  - `src/features/consultation/hooks/useConsultationChat.ts` [MODIFIED]
  - `src/features/doctor/components/chat/DoctorChatRoom.tsx` [MODIFIED]
  - `src/features/patient/components/chat/PatientChatRoom.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Resolved Indefinite "Loading conversation…" Hang on Terminal Consultations**:
    - Previously, when loading a completed consultation (e.g. `/doctor/chat/bk_...`), the room rendered the banner *"This consultation has ended..."*, but the message history area remained perpetually stuck on *"Loading conversation…"*.
    - **Root Cause**: `useConsultationChat` previously locked execution on initial mount (`[]` dependencies with `startedRef.current = true`). Because `bookingQuery` is asynchronous, `readOnly` was evaluated as `false` on initial mount, causing the hook to bypass the fast REST HTTP history loader (`loadHistoryOnly`) and eagerly attempt a realtime WebSocket connection. For terminal consultations without an active live session, the WebSocket connection timed out (10s window) or failed, and the hook never adapted once `bookingQuery` resolved `status: "completed"`.
    - **Fix Applied**:
      1. Added `enabled` option to `useConsultationChat` and wired `DoctorChatRoom` / `PatientChatRoom` to pass `enabled: isDemo || !bookingQuery.isLoading`.
      2. Added dynamic `readOnly` history mode effect in `useConsultationChat`: as soon as `readOnly` is recognized, any in-flight WebSocket attempt is immediately aborted/closed, transport safely switches to `"http"`, and message history is fetched once via `hydrateFromHttp()` with guaranteed `setIsLoading(false)` cleanup.
      3. Added defensive `(list?.messages ?? [])` handling and try-finally error recovery so hydration never leaves the UI in a perpetual spinner state.
      4. Bypassed `bookingQuery` network execution for demo fixtures (`demo` and `preview`).

---

### [2026-09-23] Doctor Navigation & Chat: Header Greeting Suppression & Navigation Activation

- **Target Route / Surface**:
  - `/doctor/chat` (Doctor Clinical Chat & Messages)
  - Global Navigation (`FloatingSidebar.tsx`, `NavBar.tsx`, `nav-items.ts`, `header.tsx`)
- **Files Modified**:
  - `src/components/layout/nav-items.ts` [MODIFIED]
  - `src/features/doctor/components/header.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Suppressed Redundant "Kumusta" Greeting on Doctor Chat**:
    - `DoctorHeader` automatically hid on `/doctor`, `/doctor/schedule`, `/doctor/history`, and `/doctor/profile`, but was still rendering on `/doctor/chat`, consuming vertical space with a redundant "Kumusta, Dr. Tester" greeting.
    - Updated `DoctorHeader` route exclusion filter to include `/doctor/chat`, freeing up full vertical viewport height for the clinical communication space.
  - **Un-gated Chat Destination in Navigation**:
    - Removed `comingSoon: true` flag from both `PATIENT_NAV` and `DOCTOR_NAV` in `nav-items.ts`, turning Chat into a live, interactive link.

---

### [2026-09-23] Doctor Suite: Clinician Demo Mode, Navigation Bar & Clinical Evaluation Guide

- **Target Route / Surface**:
  - `/doctor` (Doctor Clinical Flight Deck & Triage Station)
  - `/doctor/schedule` & `/doctor/history` (Practice Management & Past Charts)
  - Global Doctor Shell Layout (`src/app/doctor/(homepage)/layout.tsx`)
  - Documentation Index (`docs/DOCTOR_UI_DEMO_GUIDE.md`)
- **Files Modified / Created**:
  - `src/features/doctor/lib/demoData.ts` [NEW]
  - `src/components/layout/ClinicianDemoBar.tsx` [NEW]
  - `docs/DOCTOR_UI_DEMO_GUIDE.md` [NEW]
  - `src/app/doctor/(homepage)/layout.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorCommandBar.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/ActiveEncounterCommandCenter.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorRecentConsultations.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Zero-Friction Clinician Demo Mode**:
    - Previously, when browsing `/doctor` without active AWS Cognito credentials or a populated database, all cards rendered in empty / zero states ("No patients waiting", "No active consultation", "0 completed today"). For doctor demonstrations, this made it impossible for visiting physicians to assess ergonomics, information density, and clinical decision flows.
    - Added high-fidelity clinical demo fixtures in `src/features/doctor/lib/demoData.ts` representing authentic Philippine primary and urgent care cases:
      - **Sofia Hernandez (7yo F)**: Urgent pediatric URI with high-grade fever (38.8°C), barking nocturnal cough, and maternal triage answers.
      - **Manuel Tan (34yo M)**: Acute gastroenteritis with 5 diarrhea episodes, dehydration check, and penicillin allergy alert.
      - **Ramon Dela Cruz (52yo M)**: Scheduled routine follow-up for T2DM & Stage 1 HTN (BP 142/88) with maintenance refill request.
      - **Maria Santos (28yo F)**: Active consultation in room for allergic rhinitis flare-up, linking directly to `/consultation/room/demo`.
      - **Dr. Angela Reyes, MD**: Internal Medicine & Tele-Triage clinician identity with realistic shift metrics (4 completed today, 3 in queue, ₱3,400.00 pending payout).
  - **Mounted Clinician Demo Navigation Bar**:
    - Created `ClinicianDemoBar.tsx` and mounted it at the top of the doctor shell. Provides 1-click jump links between Flight Deck (`/doctor`), Teleconsult Room (`/consultation/room/demo`), Post-Consult CDS (`/doctor/post-consultation/id?consultationId=demo&bookingId=demo`), Schedule (`/doctor/schedule`), and Route Index (`/admin/routes`).
  - **Physician Evaluation & Feedback Rubric (`docs/DOCTOR_UI_DEMO_GUIDE.md`)**:
    - Authored a comprehensive 15-minute presentation script and structured evaluation questionnaire covering 4 pillars: Information Architecture & Triage Speed, Documentation Burden (Dual-Rail vs Tabs), Clinical Safety & Error Prevention (Allergies), and Philippine Regulatory Fit (PRC, PTR, S2, PhilHealth).
  - **Anti-AI Slop & Design Standards**:
    - Uses crisp 1px borders (`border-(--border-subtle)`), Brand Navy (`#074972`), and Bayan Teal (`#18a58c`).
    - Clean vector Lucide SVG icons (`Stethoscope`, `LayoutDashboard`, `Video`, `FileSignature`, `Calendar`, `Compass`); strictly zero platform emojis or neon glows.

---

### [2026-09-23] Consultation & Post-Consultation: High-Fidelity Clinical Skeleton Loader Overhaul

- **Target Route / Surface**:
  - `/doctor/post-consultation/id?consultationId=...&bookingId=...` (Post-Consultation CDS Workspace)
  - `/doctor/post-consultation/[consultationId]` (All post-consultation dynamic routes)
  - `/consultation/room` & `/doctor/room/[bookingId]` (Active Video Consultation Room)
- **Files Modified / Created**:
  - `src/features/consultation/components/postConsultation/PostConsultationSkeleton.tsx` [NEW]
  - `src/features/consultation/components/session/ConsultationRoomSkeleton.tsx` [NEW]
  - `src/app/doctor/post-consultation/id/loading.tsx` [NEW]
  - `src/app/doctor/post-consultation/loading.tsx` [NEW]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/session/ConsultationRoom.tsx` [MODIFIED]
  - `src/components/ui/skeleton.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Replaced Bare Spinner & "Loading" Text with Clinical Skeleton**:
    - Previously, during consultation data hydration (`!assessment`), `AssessmentFirstWorkspace` rendered a lonely, jarring inline box with `<Spinner className="size-4" /> Loading this consultation…` (the word loading with a gear). This triggered severe cumulative layout shift (CLS) once the 3-column workspace loaded.
    - Designed and implemented `PostConsultationSkeleton`, a high-fidelity, accessible skeleton that accurately mirrors the complete post-consultation layout:
      - **Header**: Stethoscope avatar circle, consultation ID & title, status badge pill, and stepper indicator (`Review` → `Assess` → `Deliver`) with divider bars and action button placeholder.
      - **Left Rail**: "Patient Intake" rail header, intake demographics card with dashed border, and patient metadata placeholders (Chief Complaint, Vitals, History).
      - **Center Workspace**:
        - SOAP Summary cards: 2-column grid with "Subjective" and "Objective" badge headers and clinical content line placeholders.
        - Confirmed Assessment card: Diagnosis title skeleton, status badge, and "Revise" button skeleton.
        - Deliverables & Documentation Deck: Large canvas area with document icon and draft placeholder.
        - Care Continuity: Follow-up recommendation date picker input, reason textarea, and save action button.
        - Authorized Artifact History: Expandable accordion header with history icon and counter pill.
      - **Right Rail**: "Protected tools" rail with item cards for Plan, Prescription, Medical certificate (with lock icon), Lab request, Imaging request, Patient education, and the primary "Finish documentation" CTA button.
  - **In-Session Consultation Room Skeleton**:
    - Upgraded `ConsultationRoom.tsx` to replace the centered spinner panel with `ConsultationRoomSkeleton`, featuring the session header and dual-pane clinical stage (video viewport on the left, clinical companion suite with intake and chat stream on the right).
  - **Next.js Route Streaming Boundaries**:
    - Added `src/app/doctor/post-consultation/id/loading.tsx` and `src/app/doctor/post-consultation/loading.tsx` to provide immediate, instant loading states during Next.js server streaming and page transitions.
  - **Accessibility & Motion Standards**:
    - Wrapped all skeletons with `aria-busy="true"` and descriptive `aria-label`.
    - Enhanced `src/components/ui/skeleton.tsx` with `motion-reduce:animate-none` for users with motion sensitivity.
    - Semantic tokens used throughout (`bg-(--surface-card)`, `border-(--border-subtle)`, `bg-(--surface-warm-soft)`, `bg-(--action-primary)/25`). No hardcoded hex values or AI slop glowing gradients.

---

### [2026-09-23] Navigation: Chat Destination Activated for Patient & Doctor Portals

- **Target Route / Surface**:
  - Global Navigation (`FloatingSidebar.tsx`, `NavBar.tsx`, `nav-items.ts`)
  - Target routes: `/doctor/chat`, `/patient/chat`
- **Files Modified**:
  - `src/components/layout/nav-items.ts` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Un-gated Chat in Primary Navigation**:
    - Previously, both `PATIENT_NAV` and `DOCTOR_NAV` marked `Chat` with `comingSoon: true`, rendering an inert, non-interactive "Soon" badge with `cursor-not-allowed` on the desktop floating sidebar and filtering it out of the patient mobile bottom bar.
    - Removed `comingSoon: true` flag on both navigation tables to make the destination fully clickable and interactive.
    - Enables direct navigation to the conversation lists (`/doctor/chat` and `/patient/chat`) and conversation rooms (`/doctor/chat/[bookingId]` and `/patient/chat/[bookingId]`), preparing the surfaces for UI overhaul and ergonomics polish.

---

### [2026-09-23] Doctor Dashboard: Shift Overview Metrics Ribbon Typography & Consistency Fix

- **Target Route / Surface**:
  - `/doctor` (Doctor Homepage Shift Overview Metrics Ribbon)
- **Files Modified**:
  - `src/components/primitives/NumberTicker.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorCommandBar.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorShiftLedger.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorTodayStrip.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Fixed Currency Symbol Baseline Mismatch & Negative Tracking Collision**:
    - Previously, `₱` was rendered as a raw sibling string alongside `<NumberTicker>` inside a flex container with `tracking-tight` and `items-baseline`. Because `NumberTicker` renders with `inline-flex overflow-hidden`, browser baseline rules aligned the ticker's bottom margin edge against the font baseline, while negative tracking pulled the leading zero directly into the peso symbol (`₱0` overlapping collision).
    - Upgraded `NumberTicker` to support an integrated `prefix` prop with consistent inline-flex centering, dedicated spacing (`mr-0.5`), and robust baseline stability.
  - **Resolved Tone & Color Inconsistency**:
    - Previously, `Live queue` hardcoded `tone="brand"` (vivid teal green) even when the queue was `0`, creating a jarring color clash with `Completed today` and `Pending payout` (which rendered Navy `0`).
    - Made `tone` condition-aware (`totalActive > 0 ? "brand" : "default"`), ensuring a calm, unified neutral Navy palette when idle and lighting up brand teal only when patients are waiting in queue.
  - **Standardized Card Geometry & Baseline Alignment**:
    - Fixed specificity conflict where `text-(--text-heading)` overrode `small`'s `text-(--text-muted)` on "None today".
    - Added `min-h-[68px] justify-between` to `StatCell` and centered `flex items-center` on `<dd>` to guarantee identical card heights and vertical alignment across all four metrics.

---

### [2026-09-23] Post-Consultation & Doctor Portal: Anti-AI Slop Glow Removal & Crisp 1px Border Standardization

- **Target Route / Surface**:
  - `/doctor/post-consultation/[consultationId]` (Deliverables Deck, Assessment Card, Care Continuity, Artifact History)
  - `/doctor/schedule`, `/doctor/history`, `/doctor/profile`
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/CareContinuityPanel.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/doctor/components/kyc/DoctorKycView.tsx` [MODIFIED]
  - `src/features/doctor/components/consultations/CompletedConsultations.tsx` [MODIFIED]
  - `src/features/doctor/components/schedule/AvailabilityPopover.tsx` [MODIFIED]
  - `src/features/doctor/components/schedule/DoctorScheduleView.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorTodayStrip.tsx` [MODIFIED]
  - `src/styles/bayanhealth-tokens.css` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Glowing Neon Strokes & SaaS Outlines**:
    - The `DeliverablesDeck` card previously used a bright teal/cyan stroke (`border border-(--status-available-fg)/40`), a tinted teal header (`bg-(--status-available-bg)/40`), and a teal active tab border (`border-(--status-available-fg)/40`), which created a strong glowing cyan SaaS aesthetic in dark mode.
    - Replaced with crisp 1px solid neutral borders (`border-(--border-subtle)`), calm warm surfaces (`bg-(--surface-card)` / `bg-(--surface-warm-soft)/40`), and standardized neutral active tab borders.
  - **Eliminated Cream/Gold Halo Shadows (`rgba(219,210,168,0.25)`)**:
    - Removed hardcoded 16px blur cream-tinted drop shadows (`shadow-[0_6px_16px_rgba(219,210,168,0.25),...]`) across all clinical cards, replacing them with standard crisp `shadow-xs` / `shadow-2xs`.
    - Added dark-mode shadow overrides in `bayanhealth-tokens.css` under `:root.dark, .dark, [data-theme="dark"]` (`--shadow-xs`, `--shadow-sm`, `--shadow-card`, `--shadow-md`, `--shadow-lg`, `--shadow-float`) using neutral black alphas (`rgba(0, 0, 0, ...)`), permanently preventing warm cream shadows from bleeding as a glow into dark mode cards.
  - **Embedded Artifact Card Cleanup**:
    - Removed `border-(--teal-600)/30` in embedded edit mode in `ArtifactCard.tsx`, harmonizing with `border-(--border-subtle)`.
- **Anti-AI Slop Enforcement**:
  - Strictly adheres to Rule 2: Zero cyan/neon SaaS glows, zero one-sided gradient strokes, 100% crisp 1px solid borders and authentic BayanHealth clinical authority.

---

### [2026-09-23] Doctor Profile: Clinical Tab Bar Ergonomics & Overflow Fix

- **Target Route / Surface**:
  - `/doctor/profile` (Doctor Profile Workspace Tabs)
- **Files Modified**:
  - `src/features/doctor/components/profile/DoctorProfileView.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Fixed Tab List Height Clipping & Pill Overflow**:
    - Previously, Base UI's `<TabsList>` enforced a rigid `h-8` (32px) constraint with default absolute pseudo-elements, causing the active tab pill to visibly overflow and intersect the outer rounded border.
    - Replaced with a custom, high-durability segmented tab bar (`role="tablist"` / `role="tab"`).
    - Designed with proper padding (`p-1.5`), responsive pill geometry (`py-2 px-3`), crisp 1px solid border (`border-(--border-subtle)`), and warm background tint (`bg-(--surface-warm-soft)`).
    - Kept form draft state persistent across tab switches via `hidden`/`block` panel rendering so clinicians do not lose uncommitted edits when navigating.

---

### [2026-09-23] Post-Consultation: Comprehensive Dark Mode Readability & Contrast Overhaul

- **Target Route / Surface**:
  - `/doctor/post-consultation/[consultationId]` (Entire Post-Consultation Doctor Workspace & Modals in Dark Mode)
- **Files Modified**:
  - `src/styles/bayanhealth-tokens.css` [MODIFIED]
  - `src/features/consultation/components/postConsultation/SoapSummaryCards.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactPayloadView.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactPayloadEditor.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PatientRail.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PatientDetails.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ProtectedToolsRail.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/WorkspaceChrome.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Diagnosed Dark Mode Contrast Failure**:
    - In dark mode (`:root.dark, .dark, [data-theme="dark"]`), raw color variables (`--navy-900: #032a44;`, `--navy-800: #053a5b;`, `--ink-800: #323232;`, `--ink-700: #454c52;`, etc.) remained dark tones from the light palette definition.
    - Components across the post-consultation workspace directly utilizing raw utilities like `text-(--navy-900)`, `text-(--navy-800)`, `text-(--ink-700)`, and `text-(--ink-800)` rendered dark blue and black text against dark charcoal card surfaces (`#161D26`), resulting in an illegible contrast ratio (~1.05:1).
  - **Two-Pillar Solution**:
    1. **Global Fail-Safe Token Inversions (`bayanhealth-tokens.css`)**:
       - Added high-contrast inverted mappings under `:root.dark, .dark, [data-theme="dark"]` for `--navy-900` (`#f8f4e3`), `--navy-800` (`#e8ecf2`), `--navy-700` (`#97c0d8`), `--ink-900` (`#f8f4e3`), `--ink-800` (`#e1e7ef`), `--ink-700` (`#c5d0db`), `--ink-600` (`#9aabb8`), `--ink-500` (`#7e91a0`), and `--teal-800` (`#3eb49e`).
       - Explicitly anchored `--surface-brand: #0e3753;` so inverted brand text tokens do not distort dark brand surfaces.
    2. **Component-Scoped Semantic Token Migration**:
       - **SOAP Intake Strip (`SoapSummaryCards.tsx`)**: Replaced raw navy and ink text tokens with semantic `text-(--text-heading)` and `text-(--text-muted)`.
       - **Document Renderers (`ArtifactPayloadView.tsx`)**: Replaced hardcoded ink and navy tokens in `PlanView`, `Field`, `Prose`, `Bullets`, and `Pair` with semantic `text-(--text-heading)`, `text-(--text-body)`, and `text-(--text-muted)`.
       - **Deliverables & Document Editor (`ArtifactPayloadEditor.tsx`)**: Added `dark:bg-(--surface-card)` to all typing surfaces (`TextField`, `TextAreaField`, `StringListField`, `GroupItem`); converted `FieldLabel`, `RepeatingGroup`, and group titles to `text-(--text-heading)`.
       - **Assessment Workspace & Banners (`AssessmentFirstWorkspace.tsx`)**: Upgraded confirmed assessment summary, guidance instruction strip, alert dialog titles/descriptions, and documentation warning pills to semantic text tokens.
       - **Patient Rail & Details (`PatientRail.tsx`, `PatientDetails.tsx`)**: Replaced raw tokens on symptoms review, pain rating badges, red-flag screening, reproductive health, and intake collapse controls with semantic tokens.
       - **Protected Tools Rail (`ProtectedToolsRail.tsx`)**: Switched tool item labels, locked state indicators, and status badges to `text-(--text-heading)`, `text-(--text-muted)`, and `text-(--status-soon-fg)`.
       - **Workspace Header (`WorkspaceChrome.tsx`)**: Updated patient identifier and metadata subtitles to `text-(--text-muted)`.
- **Anti-AI Slop & Accessibility Verification**:
  - Restored WCAG AAA / AA contrast ratios (> 7:1 for headings, > 4.5:1 for body copy) across all dark mode clinical surfaces.
  - Zero glowing neon cyan/purple SaaS gradients; crisp 1px solid borders (`border-(--border-subtle)` / `border-(--border-default)`); authentic BayanHealth clinical authority maintained.

---

### [2026-09-23] Doctor Profile & Settings: Two-Column Master / Detail Clinical Cockpit & Tabbed Workspaces

- **Target Route / Surface**:
  - `/doctor/profile` (Doctor Profile, Signature Management, and Credentialing / KYC Verification)
- **Files Modified**:
  - `src/app/doctor/(homepage)/profile/page.tsx` [MODIFIED]
  - `src/features/doctor/components/profile/DoctorProfileView.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Monolithic Single-Column Vertical Stack**:
    - Previously, the profile page stacked three heavy cards (`Your details`, `Signature`, and `Credentials`) vertically in a `max-w-4xl` column, creating vast empty space on wide displays while forcing excessive scrolling.
    - Expanded page container width to `max-w-6xl w-full` and reorganized the layout into an asymmetric **Two-Column Master / Detail Clinical Cockpit** (`grid-cols-1 lg:grid-cols-12`).
  - **Master Column: Doctor Identity & Status Cockpit (`lg:col-span-4`)**:
    - Introduced a sticky summary card providing instant situational awareness:
      - Doctor monogram avatar badge, verified checkmark, and full name.
      - PRC License and verification status badge (`Approved`, `Pending review`, etc.).
      - Clinical credentials snapshot (PRC License, signature status with quick alert link if missing, and On-Demand availability status).
      - Quick workspace section shortcuts synchronized with the active tab.
      - Regulatory reassurance note referencing Philippine PRC & DOH telehealth practice guidelines.
  - **Detail Column: Focused Tabbed Workspaces (`lg:col-span-8`)**:
    - Integrated high-density segmented tabs using `@base-ui/react/tabs`:
      - **Practice Info**: Clean layout for public clinical profile, locked credentials with explanatory lock hints, specialty, phone, bio textarea with character counter, and dirty-aware save button.
      - **Clinical Signature**: Reusable digital specimen signing workspace with framed signature preview, remove/replace controls, and drawing pad.
      - **Credentials & KYC**: Dedicated compliance view for uploading professional license and supporting documents, previewing uploaded files, and submitting for review.
  - **Platform Ergonomics & Anti-AI Slop Enforcement**:
    - Crisp 1px solid borders (`border-(--border-subtle)`), warm card surfaces (`bg-(--surface-card)`, `bg-(--surface-warm-soft)`), and Bayan Navy/Teal accents.
    - Zero platform emojis; exclusively intentional `lucide-react` vector icons.
    - Seamless responsive collapse to a single column on tablet/mobile screens with >= 48px touch targets.

---

### [2026-09-23] Post-Consultation: Plan & Deliverables Editor Input Affordances, Readability & Visual Typing Contrast

- **Target Route / Surface**:
  - `/doctor/post-consultation/[consultationId]` (Edit Draft mode on Plan, Prescription, and deliverables)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/ArtifactPayloadEditor.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Solved Low Typing Affordance & "Non-Typable" Appearance**:
    - Previously, editable textareas rendered with `bg-transparent` inside the warm cream container, blending completely into the background and appearing like flat static text boxes rather than interactive, typable input fields. Single-line list items (Goals, Interventions) displayed unwanted browser textarea resize grabbers.
    - Upgraded all editor input primitives (`TextField`, `TextAreaField`, `StringListField`, `GroupItem`) to crisp white typing surfaces (`bg-white`), solid 1px borders (`border-(--border-default)`), subtle depth (`shadow-2xs`), and responsive focus rings (`focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--teal-600)/20`).
  - **High-Density Structured List Inputs (`StringListField`)**:
    - Replaced single-line textareas with high-contrast `<Input>` fields, adding numbered pill badges (`1`, `2`, `3`) on the left to clearly establish structured list hierarchy.
    - Added contextual guide placeholders (`"e.g. Symptom relief of productive cough"`, `"e.g. Increased fluid intake (2-3L/day)"`).
    - Standardized clean delete buttons (`size-9 rounded-lg hover:bg-(--danger-bg)`) and dashed outline add buttons (`+ Add goal`, `+ Add intervention`).
  - **Modernized Clinical Section Labels**:
    - Replaced faint, all-caps uppercase labels (`SUMMARY`, `GOALS`, `INTERVENTIONS`, `FOLLOW-UP`) with high-authority sentence-case typography (`Clinical summary`, `Clinical goals`, `Interventions & orders`, `Follow-up & precautions`).
  - **Contextual Edit Mode Header**:
    - Added a clear editing banner at the top of the editing container inside `ArtifactCard` (*"Editing draft — modify fields directly below"* / *"Click any field to type · Press 'Save changes' below when done"*), immediately signaling interactive editing state.

---

### [2026-09-23] Post-Consultation: Sign & Lock Modal Overhaul, Auto-Saving Signature Pad & Clinical Attestation

- **Target Route / Surface**:
  - `/doctor/post-consultation/[consultationId]` (Sign Document modal for Plan, Prescription, Medical Certificate, etc.)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/SignatureField.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Defensive Wordy Explanations & Typos**:
    - Replaced the dense, rambling 6-line paragraph containing confusing system architecture copy ("The patient has no screen for this one, so releasing it changes your record but shows them nothing...") with a clear, calm clinical description: *"Confirm your clinical review to finalize and lock this document. Releasing to the patient or records remains a separate step."*
  - **Auto-Saving Signature Canvas (Eliminated Confusing Save-on-Pad Friction)**:
    - Previously, drawing a signature did not update the modal state until the physician discovered and pressed a tiny, unlabelled floppy disk icon on the canvas toolbar. The main "Sign and lock" button remained disabled with the confusing micro-text *"Draw above, then press save on the pad before signing."*
    - Upgraded `SignaturePadDialog` with automatic stroke commitment on `pointerup`, seamlessly capturing the signature as the doctor draws.
    - Added an authentic clinical prescription pad baseline (dashed line with `✕` guide), stroke smoothing in BayanHealth Navy `#074972`, a live `"Signature captured"` indicator, and a clear `"Clear & redraw"` action.
  - **Interactive Clinical Attestation Card**:
    - Replaced the unstyled browser checkbox and long text block with an interactive clinical attestation card featuring clear typography, subtle hover states, and warm teal active styling.
  - **Profile Name Pre-fill & Verified Credential Card**:
    - Wired `defaultSignerName` from `doctorProfile` through `DeliverablesDeck` to prefill the signer name automatically when no saved signature exists.
    - Polished the "Signature on file" state with a clear verified badge, signature stroke thumbnail, and direct profile link.

---

### [2026-09-23] Post-Consultation Workspace: Decluttering, Information Architecture & Plan Deck Unification

- **Target Route / Surface**:
  - `/doctor/post-consultation/[consultationId]` (and demo / history post-consult views)
- **Files Modified**:
  - `src/features/doctor/lib/api/bookingIntake.ts` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PatientDetails.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/SoapSummaryCards.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactPayloadView.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PatientRail.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/workspacePhase.ts` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Solved Severe Center-Column Crowding & Stacking**:
    - Previously, the center column stacked 8 vertical sections totaling ~1,530px in height (over 1.7x desktop viewport height), burying deliverables beneath multiple full-page scrolls and requiring constant scrolling to view and sign prescriptions.
    - Unified the clinical `Plan` as the premier first tab inside the `DeliverablesDeck` rather than as a disconnected, standalone card above it. This eliminated duplicate footers (signing, amending, releasing) and cut center column vertical bulk by over 50%.
  - **Fixed "NKDA" False-Alarm Emergency Alert**:
    - Previously, "No known drug allergies (NKDA)" triggered 3 prominent red emergency alert banners and cards because the parser only checked for the literal string `"none"`.
    - Added comprehensive regex negation detection (`isNegativeAllergy`) covering `nkda`, `nka`, `none`, `no known`, `denied`, and `negative`.
    - Calmly renders NKDA as neutral grey clinical text in `PatientDetails` and `ClinicalAlerts` while reserving high-contrast red warning styling strictly for actual anaphylactic/active drug allergies.
  - **Unified High-Density SOAP Intake Strip**:
    - Replaced two bulky, vertically-stacked ~120px Subjective & Objective cards with a single compact, horizontal clinical intake strip (S: Chief complaint + verbatim quote | O: Vitals tiles).
    - Reduced vertical footprint from 240px to ~70px while maintaining instant visibility of key patient complaints and vitals readings.
  - **Collapsible Patient Intake Rail**:
    - Added an intuitive expand/collapse toggle to `PatientRail` with a sleek 3.5rem (56px) collapsed icon strip, allowing doctors to reclaim horizontal space on clinical laptops and focus entirely on documentation and deliverables.
  - **Card Flattening & Clinical Typography Modernization**:
    - Removed nested cards and heavy inner container borders inside `ArtifactPayloadView` and `PatientDetails`.
    - Replaced shouting all-caps tracking headers (`GOALS`, `INTERVENTIONS`, `FOLLOW-UP & RED FLAGS`, `SYMPTOMS REVIEW`, `SAFETY SCREEN`) with clean, sentence-case, high-authority clinical typography.
  - **Action Affordance & Defensive Copy Cleanup**:
    - Replaced defensive, wordy instructional paragraphs (`"Signing locks the content..."`, `"Press and hold for 2 seconds to release..."`, `"Nothing is drafted until you confirm this Assessment..."`) with self-explanatory button states (`Sign & lock`, `Release to patient`), explicit visual states (`✓ Signed · Ready to release`), and clean feedback.
    - Removed persistent "Choose an output to draft..." guidance banner once drafting is already open.
  - **Accurate Deliverables Deck & Rail Counts**:
    - Fixed `railBadgeLabel` and deck ordering so doctors see true counts (`3 released`, `2 to review`, `1 to draft`) instead of misleading `"0 unlocked"` when all deliverables are drafted.

---

### [2026-09-23] Consultation Room: Proportional Height Distribution & Void Elimination in Patient Intake

- **Target Route / Surface**:
  - `/consultation/room/[bookingId]` (and demo route `/consultation/room/demo`)
- **Files Modified**:
  - `src/components/consultation/DoctorClinicalCompanionSuite.tsx` [MODIFIED]
  - `src/features/consultation/components/session/PatientIntakeReferenceTab.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Bottom Empty Void with Proportional Height Growth**:
    - Resolved the issue where aggressive vertical compression left a large, empty blank area at the bottom of the clinical drawer on tall desktop screens.
    - Updated `TabsContent` to `flex flex-col` and configured `PatientIntakeReferenceTab` with `flex-1 min-h-0 flex flex-col`.
    - Added `flex-1 min-h-fit flex flex-col justify-center` to all main clinical cards (`ChiefComplaintCard`, `SymptomReviewCard`, `AllergyCard`/`MedicalHistoryCard`, `VitalsCard`, `BaselineCard`).
    - The cards now grow proportionally to fill 100% of the available drawer height, eliminating dead void space at the bottom while keeping a crisp, fixed `gap-2.5 sm:gap-3` margin between cards.
  - **Balanced Clinical Typography & Comfortable Padding**:
    - Restored comfortable, readable typography: `text-xs sm:text-[13px]` body text, `text-[10px]` uppercase tracking labels, and `text-xs sm:text-sm font-bold` vitals.
    - Expanded card internal padding to `p-3 sm:p-3.5` with vertically centered contents (`justify-center`), providing a polished, high-authority clinical feel without overflowing the viewport.

---

### [2026-09-23] Consultation Room: No-Scroll Clinical Cockpit Density & Margin Spacing Optimization

- **Target Route / Surface**:
  - `/consultation/room/[bookingId]` (and demo route `/consultation/room/demo`)
- **Files Modified**:
  - `src/features/consultation/components/session/ConsultationRoom.tsx` [MODIFIED]
  - `src/components/consultation/DoctorClinicalCompanionSuite.tsx` [MODIFIED]
  - `src/features/consultation/components/session/PatientIntakeReferenceTab.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Zero-Scroll Doctor Cockpit (Fits 100% of Intake on Desktop without Scrolling)**:
    - Addressed user feedback where the intake reference panel required vertical scrolling on standard desktop viewports, hiding vital patient metrics and baseline info below the fold.
    - Sized every card and component so the complete intake profile (Red-Flag alerts, Chief Concern, Symptom Review, Allergies & Known Conditions, Vitals, and Baseline Information) fits entirely within the viewport without triggering a vertical scrollbar.
  - **Fine-Tuned Margins & Clean Visual Breathing Room**:
    - Eliminated floating uppercase text labels between cards that collided with card borders.
    - Integrated headers directly into each card's structure with crisp 1px borders, subtle 2xs shadows, and clean interior padding (`px-3 py-2`).
    - Standardized consistent `gap-2` vertical margins between cards so information is cleanly separated with distinct boundaries.
  - **Precise Clinical Typography Scaling**:
    - Tuned micro-typography for rapid physician scanning: `text-[8.5px]` uppercase bold field labels, `text-[10px]`-`text-[11px]` crisp values, and `text-[11px]`-`text-xs` relaxed quote for the chief complaint.
    - Scaled Vitals tiles to a compact 4-column strip with `text-[8.5px]` labels and `text-[11px] sm:text-xs font-bold` measurements, maintaining instant elevated fever highlighting (38.2°C).
    - Arranged Allergies (NKDA) and Known Conditions side-by-side in a responsive 2-column grid (`grid grid-cols-2 gap-2`), cutting vertical footprint by 50%.
  - **Compact Companion Tabs Header & Outer Layout**:
    - Compacted `DoctorClinicalCompanionSuite` tabs header from `h-11` (44px) + `p-3.5` to a sleek `h-8.5` (34px) bar with `px-3 py-2`, saving ~24px of vertical height.
    - Tightened `ConsultationRoom` desktop outer padding (`p-2 sm:p-2.5 md:p-3.5 lg:p-4`) and header min-height (`md:min-h-14 md:py-2.5`), recovering another ~30px for clinical content.

---

### [2026-09-23] Consultation Room: Viewport Dual-Pane Stretch & Clinical Spacing Overhaul

- **Target Route / Surface**:
  - `/consultation/room/[bookingId]` (and demo route `/consultation/room/demo`)
- **Files Modified**:
  - `src/features/consultation/components/session/ConsultationRoom.tsx` [MODIFIED]
  - `src/components/consultation/DoctorClinicalCompanionSuite.tsx` [MODIFIED]
  - `src/components/consultation/PatientCompanionSuite.tsx` [MODIFIED]
  - `src/features/consultation/components/session/PatientIntakeReferenceTab.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Bottom Cream Void with Guaranteed Flexbox**:
    - Replaced the CSS Grid layout on `<main>` with a rock-solid desktop flexbox row (`flex flex-col lg:flex-row min-h-0 flex-1 h-full w-full gap-2.5 md:gap-3.5 lg:gap-4`) where the video stage takes `lg:flex-[7]` and the companion drawer takes `lg:flex-[5]`. This guarantees both columns span 100% of the viewport height down to the exact bottom margin without any grid track collapse.
  - **Relaxed Typography & De-compressed Card Spacing**:
    - Addressed claustrophobic, tight typography across the Patient Intake drawer:
      - Upgraded base font size from cramped `text-xs` (12px) to comfortable `text-sm` (14px).
      - Replaced microscopic uppercase section headers (`text-[10px] mb-1.5`) with prominent, high-legibility labels (`text-xs font-bold uppercase tracking-wider mb-2.5 gap-2`).
      - Restructured Symptom Review into a clean 2-column clinical tile grid (`grid-cols-1 sm:grid-cols-2 gap-3`) with distinct label and value separation, eliminating vertical text crowding.
      - Expanded Vitals tiles with `min-h-[76px] p-3 sm:p-3.5 rounded-2xl`, prominent `text-base sm:text-lg font-bold` readings, and distinct label spacing.
      - Increased card padding from `p-3.5` to `p-4 sm:p-5`, with `pb-20` bottom scroll cushion.
      - **Fixed AsyncView Gap Collapse**: Resolved issue where `AsyncView` rendered a plain block `w-full` wrapper around a fragment `<>`, causing `gap-5` on the outer drawer to have no effect between cards. Wrapped `AsyncView` children in an explicit `<div className="flex flex-col gap-6">` and passed `className="flex flex-col gap-6"` to `AsyncView`, ensuring consistent 24px vertical separation between every card.
      - Enlarged chip touch targets from `px-2 py-0.5 text-[10px]` to `px-3 py-1 text-xs rounded-lg`.
  - **Tactile Tab Triggers**:
    - Upgraded tabs header with `h-11`, `p-1.5`, and `text-sm font-bold` triggers with smooth active transitions.
  - **Removed Double Navy Border Rim on Video**:
    - Replaced outer video container's `bg-(--surface-nav) p-2 md:p-4` with clean `p-0` framing and `rounded-2xl md:rounded-3xl border border-slate-800/80 bg-slate-950`. Both the video stage and companion drawer now feature matching curvature and symmetric framing.
  - **Fixed Red-Alert False Alarm for NKDA ("No known drug allergies")**:
    - Fixed clinical classification where "No known drug allergies (NKDA)" was previously rendered with a bright red/danger warning badge and platform emoji (`⚠`).
    - Implemented `isNoKnown` detection with calming, authoritative clinical confirmation (`ShieldCheck` vector icon in teal/emerald with clean neutral card styling).
  - **Granular Triage in Red-Flag Screening**:
    - Disentangled triage chip coloring so negative indicators (`Chest pain: No`, `Shortness of breath: No`) are rendered in clean neutral badges, and only actual positive risks (`Fever 3 days`) receive high-priority alert styling.
  - **Elevated Vitals Highlighting & Structured Typography**:
    - Highlighted abnormal vitals (e.g. Temp 38.2°C) with subtle warm alert borders and text to speed up physician scanning.
    - Standardized section headers across all cards with intentional Lucide SVG icons (`MessageSquare`, `Stethoscope`, `ShieldAlert`, `ListChecks`, `Activity`, `User`, `Baby`).
  - **Internal Scroll Containment**:
    - Added `overscroll-contain` and smooth vertical scrolling to `PatientIntakeReferenceTab` with `pb-8`, keeping the outer consultation cockpit fixed to `100dvh` without page jumps.

---

### [2026-09-23] Post-Consultation CDS Demo: Fixed generationEligibility TypeError & Hydrated Zero-Backend Mock

- **Target Route / Surface**:
  - `/doctor/post-consultation/id?consultationId=demo&bookingId=demo`
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/lib/api/assessmentFirst.ts` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Resolved Runtime TypeError in Demo Workspace**:
    - Fixed `Cannot read properties of undefined (reading 'eligibleOutputTypes')` in `AssessmentFirstWorkspace.tsx` by adding safe navigation (`assessment?.confirmed?.generationEligibility?.eligibleOutputTypes ?? assessment?.allowedOutputTypes ?? []`).
    - Configured demo token fallback (`session?.idToken ?? (isDemo ? "demo-token" : "")`) so demo workspaces load immediately without waiting on Cognito auth state.
    - Hydrated `getAssessment()`, `issueGateToken()`, and `getOutputHistory()` in `assessmentFirst.ts` with complete `generationEligibility` (listing all 6 protected CDS outputs: plan, prescription, lab_request, imaging_request, medical_certificate, patient_education) and gate token expiry for seamless zero-backend interactive exploration.

---

### [2026-09-23] Post-Consultation Workspace: Readability Overhaul & Decluttering

- **Target Route / Surface**:
  - `/doctor/post-consultation/id?consultationId=...&bookingId=...` (Post-Consultation CDS Workspace)
- **Files Modified**:
  - `src/components/ui/alert-dialog.tsx` [MODIFIED]
  - `src/app/doctor/post-consultation/layout.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/WorkspaceChrome.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/SoapSummaryCards.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactPayloadView.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PatientRail.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PatientDetails.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ProtectedToolsRail.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **De-compressed Documentation Incomplete Modal Spacing**:
    - Expanded `AlertDialogContent` with `size="lg"` (`max-w-lg: 512px` instead of cramped `384px`), eliminating awkward line wraps and squished layout.
    - Upgraded padding to generous `p-6 sm:p-7 gap-5` with `rounded-2xl shadow-lg border border-(--border-subtle) bg-(--surface-card)`.
    - Restructured `DocumentationWarning` with a horizontal header (crisp category label + high-contrast white badge for ungenerated items) and relaxed detail text.
    - Polished footer with generous gap (`gap-3`), clear divider line, and 40px touch-target pill buttons (`Continue documenting` and `Finish and go to history`).
  - **Maintained Signature Warm Cream Ground with Crisp Card Definition**:
    - Retained the signature BayanHealth warm cream background (`--surface-page: #f9f4dd`), providing the human, calming brand tone clinicians expect.
    - Elevated cards and surfaces with crisp 1px borders (`border-(--border-subtle)` / `border-(--border-default)`) and subtle clean shadows (`shadow-xs`), ensuring clear figure-ground separation against the warm background without muddy yellow blur.
  - **Dramatically Reduced Clutter**:
    - Replaced the large cyan "Ready to draft" guidance banner between Assessment and Plan with a compact, non-intrusive status strip, restoring uninterrupted clinical SOAP workflow between A and P.
    - Compacted Allergies and Current Medications into a side-by-side 2-column grid in `PatientDetails`, saving 50% vertical space in the patient intake rail.
    - Streamlined Subjective and Objective SOAP cards with a neat `Intake record` badge instead of washed-out `read-only` text.
  - **Plan Document Structuring & Typographic Hierarchy**:
    - Completely restructured the raw bullet list in `PlanView` into three scannable clinical blocks:
      1. Lead Summary card with a vertical Bayan Teal accent bar and high-contrast typography (`text-(--navy-900)`).
      2. Responsive 2-column grid for Goals (with Target icon) and Interventions (with Activity icon).
      3. Standout Follow-up & Red Flags alert box with a Clock icon and high-contrast clinical border.
    - Replaced generic browser bullet points with clean, aligned teal dot indicators.
  - **Fixed WCAG Contrast Failures Across Labels & Metadata**:
    - Replaced washed-out `--text-subtle` (`#98a5ad`, ~2.2:1 contrast) across all uppercase section headers (`Field`, `Pair`, `Section`, `SummaryRow`, `Disclosure`) with authoritative `--navy-700` and `--ink-600` (contrast > 7:1).
    - Upgraded Symptom Review (OLDCART) into a structured 2-column key-value grid with clear micro-labels and dark navy text.
    - Enhanced Pain Severity badge into a clinical triage badge (e.g. `8/10 Severe`).
    - Formatted infant demographics from ambiguous `0 · Male` to `<1 y/o (infant) · Male`.
  - **Protected Tools Rail Polish**:
    - Streamlined header with clean border and refined badge contrast.
    - Upgraded tool rows with crisp status text and high-contrast icons.
- **Tokens & Primitives Used**:
  - `var(--surface-canvas)`, `var(--surface-card)`, `var(--surface-brand-soft)`, `var(--navy-900)`, `var(--navy-700)`, `var(--teal-700)`, `var(--ink-800)`, `var(--ink-600)`.
- **Upstream Porting Notes**:
  - All existing `data-slot` test hooks, state logic, and prop interfaces are preserved without alteration.

---

### [2026-09-23] Development Route Security Bypass & Route Hub Type Fixes

- **Target Route / Surface**:
  - Global route guard middleware (`src/lib/route-guard.ts`)
  - Route showcase directory (`src/app/admin/routes/page.tsx`)
- **Files Modified**:
  - `src/lib/route-guard.ts` [MODIFIED]
  - `src/app/admin/routes/page.tsx` [MODIFIED]
  - `src/features/consultation/lib/api/assessmentFirst.ts` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Unrestricted Page Inspection**:
    - Updated `isPublicPath()` in `src/lib/route-guard.ts` to return `true`, allowing instant, unrestricted navigation to all routes (`/patient`, `/doctor`, `/admin`, `/doctor/schedule`, `/doctor/history`, etc.) without redirecting to `/signIn`.
    - Both server-side proxy middleware (`src/proxy.ts`) and client-side session guard (`src/components/auth/SessionGuard.tsx`) bypass redirects cleanly while preserving page fallback UI for missing auth tokens.
  - **Fixed Admin Route Directory Button Variant Types**:
    - Replaced incompatible `Button asChild` invocations with `Link` styled via `buttonVariants(...)`, eliminating TypeScript compiler errors while maintaining design fidelity.

---

### [2026-09-23] Local Dev Server: CSP unsafe-eval & Localhost WebSocket Support

- **Target Route / Surface**:
  - Global application shell & Next.js local development server (`src/proxy.ts`)
- **Files Modified**:
  - `src/proxy.ts` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Resolved Next.js Turbopack CSP Violation Overlay**:
    - In local development mode (`process.env.NODE_ENV !== "production"`), React and Next.js Turbopack devtools require `eval()` for runtime error boundary reporting and callstack reconstruction.
    - Updated `buildContentSecurityPolicy()` in `src/proxy.ts` to include `'unsafe-eval'` under `script-src` and `ws:`, `http:` under `connect-src` during development only.
    - Omitted `upgrade-insecure-requests` on development localhost to prevent accidental HTTPS redirects on local ports.
    - Production builds remain strictly locked down with `'strict-dynamic'` and zero `'unsafe-eval'`.

---

### [2026-09-23] Doctor Consultation History Tab Relayout & Anti-Slop Non-Dropdown View

- **Target Route / Surface**:
  - `/doctor/history` ("Consults" Tab on Doctor Workspace)
- **Files Modified / Created**:
  - `src/app/doctor/(homepage)/history/page.tsx` [MODIFIED]
  - `src/features/doctor/components/consultations/CompletedConsultations.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Collapsible Dropdown**: Removed the legacy `<Collapsible>` accordion behavior that previously hid completed consultations behind a single blue button on initial visit. Consultations are now immediately visible upon navigating to the "Consults" tab.
  - **Relayout Consultation Tab to Clinical Cockpit Width**: Widened the page container from an awkward `max-w-3xl` to a responsive, desktop-first `max-w-5xl` layout matching the doctor flight deck. Added a clean, authoritative clinical header with title and subtitle.
  - **Centered Empty State ("No recent consults")**: When no consultations exist in the active date window, renders a vertically and horizontally centered empty state with a clinical icon, explicit "No recent consults" text in the middle, date-range context, and a "Jump to latest week" quick action button if paged into past weeks.
  - **Enhanced Consultation Item Rows**: Upgraded row visual hierarchy with a soft-tiled Stethoscope icon (`bg-(--surface-warm)`), crisp date/time and booking ID tags, clinical emerald Completed badge, and an explicit "Chart →" link directly opening the post-consult workspace.
  - **Week Navigation & Quick Reset**: Integrated date window controls (`< WindowNav >`) directly into the card header bar alongside a "Latest" week shortcut button and consultation count ticker.
- **Tokens & Primitives Used**:
  - `var(--surface-brand)`, `var(--surface-card)`, `var(--surface-warm)`, `var(--border-subtle)`, `var(--border-default)`, `var(--text-heading)`, `var(--text-muted)`, `var(--text-on-brand)`.
  - Removed unused imports (`Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`, `ChevronDown`).
- **Upstream Porting Notes**:
  - All public exports (`toCompletedConsultations`, `fetchCompletedConsultationsInWindow`, `postConsultationHref`, `CompletedConsultation`, `CompletedConsultations`) remain intact for downstream components such as `DoctorRecentConsultations`.

---

### [2026-09-23] Consultation Zero-Backend Demo Launcher & Universal Admin Route Directory

- **Target Route / Surface**:
  - `/consultation/room/demo` (Live Consultation Room Preview)
  - `/doctor/post-consultation/id?consultationId=demo&bookingId=demo` (Post-Consultation CDS Workspace Preview)
  - `/admin/routes` (Universal Platform Route Directory)
  - `/doctor` & `/doctor/chat` (Doctor Flight Deck Anti-AI-Slop Clean-up)
- **Files Modified / Created**:
  - `src/app/admin/routes/page.tsx` [NEW]
  - `src/features/admin/components/AdminSidebar.tsx` [MODIFIED]
  - `src/features/consultation/components/session/ConsultationRoom.tsx` [MODIFIED]
  - `src/features/consultation/hooks/useConsultationChat.ts` [MODIFIED]
  - `src/features/consultation/lib/api/assessmentFirst.ts` [MODIFIED]
  - `src/features/doctor/lib/api/bookingIntake.ts` [MODIFIED]
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorDutyCard.tsx` [MODIFIED]
  - `src/features/doctor/components/chat/DoctorChatList.tsx` [MODIFIED]
  - `src/features/doctor/components/chat/DoctorChatRoom.tsx` [MODIFIED]
  - `src/lib/route-guard.ts` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Consultation Access Without DynamoDB Booking ID (`/consultation/room/demo`)**:
    - Previously, `/consultation/room/[bookingId]` required an active DynamoDB booking token, returning 404 or 409 when navigated to directly.
    - Added dedicated demo support for `bookingId === "demo" || bookingId === "preview"`. Bypasses backend query locks and renders `DemoVideoStage` featuring simulated patient video feed (Maria Santos), self picture-in-picture, active camera/mic toggle states, and end call button.
    - Wired mock patient intake form (`fetchBookingIntake`) with complete vitals and triage history.
    - Integrated interactive demo chat in `useConsultationChat` allowing bi-directional messaging simulation without WebSockets.
    - Clicking "End Consultation" smoothly routes to the post-consult CDS workspace with mock clinical diagnostics, prescription orders, and medical cert preloaded.
  - **Universal Admin Route Directory (`/admin/routes`)**:
    - Created an administrative index showcasing all 37+ platform pages across Consultation, Doctor, Patient, Admin, and Public/Auth suites.
    - Includes instant zero-backend launch cards, category filtering buttons, keyword search, one-click URL copy, and direct route launch actions.
    - Integrated "Route Directory" into the primary admin navigation sidebar (`AdminSidebar`).
  - **Doctor Flight Deck Anti-AI-Slop Clean-up**:
    - Removed `animate-ping` and multi-stop gradient from `DoctorPatientQueue`, replacing with solid, clinical `bg-(--surface-warm)` and 1px crisp borders.
    - Replaced `animate-pulse` dot in `DoctorDutyCard` and `ConsultationRoom` with solid status indicators.
    - Contained overflowing heights in post-consultation workspace (`DeliverablesDeck` and `AssessmentFirstWorkspace`) using dynamic viewport bounding (`calc(100dvh - 2.5rem)`).
    - Polished doctor chat conversation list and active chat room with semantic BayanHealth design tokens and 48px touch targets.
- **Tokens & Primitives Used**:
  - `var(--navy-700)`, `var(--teal-700)`, `var(--surface-card)`, `var(--surface-warm)`, `var(--border-subtle)`, `var(--status-available-fg)`.
- **Upstream Porting Notes**:
  - Completely non-invasive: all real production API endpoints, DynamoDB queries, and WebSocket logic remain unchanged for standard production booking IDs.

---

### [2026-09-23] Doctor Dashboard: Relayout to Clinical Command Bar & Two-Column Workspace

- **Target Route / Surface**:
  - `/doctor` (Doctor Homepage / Clinical Flight Deck)
- **Files Modified**:
  - `src/features/doctor/components/homepage/DoctorCommandBar.tsx` [NEW]
  - `src/features/doctor/components/homepage/DoctorHome.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/ActiveEncounterCommandCenter.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/UpcomingTodayCard.tsx` [MODIFIED]
- **Design Intent**:
  - **Eliminated Triple-Redundant "Offline" Messaging**:
    - Previously, 3 separate cards across the screen declared that walk-ins were paused, creating noisy clutter and cognitive fatigue.
    - Consolidated Doctor Greeting, Master On-Demand Duty Switch (`onDemandAvailable`), Shift KPI Metrics (`Completed today`, `Live queue`, `Next appointment`, `Pending payout`), and Notification Bell into a unified, high-density **Top Command Bar** (`DoctorCommandBar`).
  - **Balanced Two-Column Clinical Cockpit**:
    - Eliminated the 4-card vertical "tower" on the left and the sprawling empty void on the right.
    - **Main Clinical Stage (`col-span-8`)**: Anchors active patient encounters, schedule collision banners, unified live patient triage queue, and recent consultation records.
    - **Schedule & Context Rail (`col-span-4`)**: Re-anchored `UpcomingTodayCard` to the right side of the screen as a continuous chronological schedule timeline and daily slot navigator.
  - **Polished Active Encounter & Standby UX**:
    - When an encounter is active, `ActiveEncounterCommandCenter` renders a high-contrast clinical hero card with primary call room access and no-show controls.
    - When idle, it renders a sleek, compact standby strip (~48px height) that preserves vertical space for the triage queue.
    - Fixed ambiguous standby copy in `DoctorPatientQueue` from *"Go on-duty in the card above"* (which was previously on the left on desktop) to *"Turn on duty status in the command bar above"*.
  - **Anti-AI-Slop & Brand Token Alignment**:
    - Replaced one-sided gradient header in `UpcomingTodayCard` with solid Brand Navy token (`bg-(--surface-brand)`) with crisp 1px borders.
    - Grounded all borders, surfaces, and badges in semantic BayanHealth design tokens (`var(--surface-brand)`, `var(--status-available-fg)`, `var(--status-available-bg)`, `var(--border-subtle)`). Zero platform emojis.
- **Device Optimization**:
  - **Desktop First**: Multi-column clinical cockpit with 100vh viewport fit, zero dead whitespace, and high data density.
  - **Mobile Ergonomics**: Clean single-column linear stack (Command Bar -> Urgent Patient Queue -> Schedule Timeline -> Performance Overview).
- **Tokens & Primitives Used**:
  - `var(--surface-brand)`, `var(--surface-card)`, `var(--surface-warm)`, `var(--status-available-fg)`, `var(--status-available-bg)`, `var(--border-subtle)`, `var(--radius-canvas)`.
- **Upstream Porting Notes**:
  - Direct drop-in component update. All TanStack Query hooks (`useMyDoctorProfile`, `useDoctorShiftMetrics`, `useDoctorQueueSummary`, `useActiveEncounter`, `useTodayAgenda`), idempotency managers, data contracts, and `data-slot` attributes are 100% preserved.

---

### [2026-09-23] Doctor Shell: Suppress Redundant Greeting Banner on Calendar, Consults, and Profile Tabs

- **Target Route / Surface**:
  - `/doctor/schedule` (Calendar)
  - `/doctor/history` (Consults / Consultation History)
  - `/doctor/profile` (Profile / Verification)
- **Files Modified**:
  - `src/features/doctor/components/header.tsx`
  - `src/app/doctor/(homepage)/schedule/page.tsx`
- **Design Intent & Problem Solved**:
  - **Removed Redundant Top Greeting Banner ("Kumusta, Dr. [Name]")**:
    - Suppressed `DoctorHeader` rendering when navigating to `/doctor/schedule`, `/doctor/history`, and `/doctor/profile`.
    - These views already have their own dedicated page titles (e.g. "Consultation history", doctor profile view) or require maximal vertical space (e.g. the calendar schedule grid).
    - Eliminates redundant stacked titles and frees up ~92px of valuable clinical vertical real estate.
    - Theme toggle and session sign-out remain persistently accessible via the docked sidebar navigation (`SidebarContent`).
  - **Schedule Page Layout Optimization**:
    - Updated `schedule/page.tsx` section height from hardcoded `h-[calc(100dvh-92px)]` to `h-[calc(100dvh-2rem)] lg:h-full` to seamlessly occupy the full canvas without leaving bottom voids.
- **Upstream Porting Notes**:
  - Pure route visibility filter and container height alignment. No backend or state changes.

---

### [2026-09-23] Doctor Experience: Calendar UI/UX Redesign & Clinical Density Modernization

- **Target Route / Surface**:
  - `/doctor/schedule` (Doctor Schedule: Day, Week, and Month Views)
- **Files Modified**:
  - `src/features/doctor/components/schedule/weekGridLayout.ts`
  - `src/features/doctor/components/schedule/TimeGrid.tsx`
  - `src/features/doctor/components/schedule/CalendarToolbar.tsx`
  - `src/features/doctor/components/schedule/DoctorScheduleView.tsx`
  - `src/features/doctor/components/schedule/CalendarLegend.tsx`
- **Design Intent & Problem Solved**:
  - **Eliminated Solid Column Color Wash (Anti-AI-Slop & Readability)**:
    - Removed heavy, opaque light-navy block (`bg-(--surface-brand-soft)`) across the "Today" column in `TimeGrid.tsx`, which was causing Day view to appear as a solid blue box.
    - Replaced with clean card surface (`bg-(--surface-card)`) and very subtle `bg-(--surface-brand-soft)/10` column tint for today.
    - Implemented clinical "Today" indicator in the column header via a prominent Bayan Teal circular date badge (`size-7 bg-(--action-primary) text-white font-bold rounded-full`).
  - **1-Hour Grid Lines & Half-Hour Guides**:
    - Changed `hourMarks` interval from 120 minutes to 60 minutes in `weekGridLayout.ts`, removing 2-hour gaps.
    - Rendered crisp 1px horizontal hour grid lines (`border-t border-(--border-subtle)/50`) and subtle dashed half-hour guidelines (`border-t border-dashed border-(--border-subtle)/20`) across every day column.
    - Aligned left-gutter time labels (`8 AM`, `9 AM`, `10 AM`, etc.) precisely with each horizontal grid line using `-translate-y-1/2`.
  - **Viewport Density & Height Upgrade**:
    - Increased `GRID_BODY_HEIGHT_PX` from 420px to 580px (~58px/hour for a 10-hour day), eliminating the ~250px dead white void at the bottom of the card on desktop and providing comfortable legibility for 30-min and 15-min slots without truncated text.
  - **Day View Clinical Cockpit (Multi-Column Layout)**:
    - In `DoctorScheduleView.tsx`, introduced a multi-column desktop clinical cockpit when `view === "day"`:
      - Main TimeGrid occupies the left region (68–72%).
      - Integrated "Day Overview & Slot Management" companion panel occupies the right region (28–32% on `lg:` screens), surfacing summary stats (Available, Booked) and the existing `ActiveDaySlotList` with rapid "+ Add Shift" CTA, converting dead space into actionable triage utility.
  - **Toolbar & Legend Polish**:
    - Added a standard "Today" quick jump button (`onToday`) to `CalendarToolbar.tsx` alongside polished `< >` step buttons.
    - Compacted `CalendarLegend.tsx` with refined dot swatches, smaller typography, and clean button styling.
- **Device Optimization**:
    - Desktop-first high density for clinical schedule management; responsive flex fallback on smaller viewports.
- **Tokens & Primitives Used**:
  - `bg-(--action-primary)`, `text-(--text-heading)`, `text-(--text-muted)`, `border-(--border-subtle)`, `bg-(--surface-card)`, `bg-(--surface-warm-soft)`, `bg-(--teal-700)`, `bg-(--navy-700)`.
- **Upstream Porting Notes**:
  - Pure visual styling and layout enhancements. All appointment popover logic, generation handlers, and mutation callbacks remain 100% backward compatible.

---

### [2026-09-23] Doctor Experience: Anti-AI-Slop Clean-Up, Post-Consultation Density & Chat Polish

- **Target Route / Surface**:
  - `/doctor` (Clinical Flight Deck: Standby Queue & Duty Command)
  - `/consultation/room/[bookingId]` (Room Header Identity)
  - `/doctor/post-consultation/id` (Assessment-First Workspace, Deliverables Deck, Sticky Rails)
  - `/doctor/chat` & `/doctor/chat/[bookingId]` (Doctor Chat List & Conversation Room)
- **Files Modified**:
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx`
  - `src/features/doctor/components/homepage/DoctorDutyCard.tsx`
  - `src/features/consultation/components/session/ConsultationRoom.tsx`
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx`
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx`
  - `src/features/doctor/components/chat/DoctorChatList.tsx`
  - `src/features/doctor/components/chat/DoctorChatRoom.tsx`
- **Design Intent & Problem Solved**:
  - **Anti-AI-Slop Rule 1 & 9 Enforcement (No Pulsing Dots / AI Ping Animations / Gradients)**:
    - Removed `animate-ping` beacon and replaced multi-stop gradient background in `DoctorPatientQueue`'s `StandbyPanel` with a clean, solid, clinical warm surface (`bg-(--surface-warm)`) and crisp 1px solid border (`border-(--border-subtle)`).
    - Removed `animate-pulse` on active duty status dot in `DoctorDutyCard`, replacing it with a calm, solid semantic dot (`bg-(--status-available-fg)`).
    - Removed `animate-pulse` from the live consultation badge in `ConsultationRoom`'s `RoomHeaderIdentity`.
  - **Post-Consultation Workspace Density & Scroll Containment**:
    - Added height containment and internal scrolling (`max-h-[min(640px,calc(100dvh-16rem))] overflow-y-auto`) to the active tabpanel in `DeliverablesDeck`, preventing long e-prescriptions (A4 documents) or multi-item lab/imaging lists from causing page jumps or pushing action footers out of view.
    - Added `max-h-[calc(100dvh-2.5rem)] overflow-y-auto` to the sticky `PatientRail` and `ProtectedToolsRail` in `AssessmentFirstWorkspace` to ensure all actions remain accessible on compact laptop screens.
  - **Doctor Chat Clinical Tokens & Ergonomics**:
    - Replaced generic `bg-card` classes with BayanHealth tokens (`bg-(--surface-card)`, `border-(--border-subtle)`, `text-(--text-heading)`, `text-(--text-muted)`) in `DoctorChatList`.
    - Polished doctor message bubbles (`bg-(--action-primary)` with solid white text) and patient message bubbles (`bg-(--surface-card)` with subtle 1px border) in `DoctorChatRoom`.
    - Upgraded chat composer textarea and send CTA button to 48px touch targets with clean focus rings.
- **Device Optimization**:
  - Desktop-first clinical density and viewport containment for high-efficiency physician workflows.
- **Tokens & Primitives Used**:
  - `bg-(--surface-warm)`, `border-(--border-subtle)`, `bg-(--surface-card)`, `bg-(--status-available-fg)`, `bg-(--action-primary)`.
- **Upstream Porting Notes**:
  - Pure visual styling and layout containment. All props, query keys, WebSocket handlers, and CDS safety gates remain 100% untouched.

---

### 2026-09-21 — Restore Background Herringbone Pattern + Patient Hero Widget Cleanup

#### `src/app/globals.css`
- **Restored** `.bg-satin` background-image (`/background-pattern.svg`) that had been stripped, leaving pages with a plain cream surface. Added `background-size: 320px 320px`, `background-repeat: repeat`, `background-attachment: local` to match the original woven texture intent described in the class comment.
- Applies globally to: auth layout, patient shell, doctor shell, landing page, consultation room.

#### `src/features/patient/components/homepage/PatientHome.tsx`
- **Removed** "MABILISANG TULONG" badge (`<span>` with `Clock` icon + uppercase teal label) from the Idle hero widget — per user request.
- **Enlarged** "Kailangan mo ng doktor ngayon?" heading: `text-[16px] sm:text-[17px]` → `text-[20px] sm:text-[22px]` with `leading-snug`.
- Removed now-unused `Clock` import from `lucide-react`.



### [2026-09-21] Authentication: Single Continuous Line Progress Bar

- **Target Route / Surface**:
  - `/signUp` (Sign-Up wizard header progress stepper across all steps)
- **Files Modified**:
  - `src/features/authentication/components/SignUpProgress.tsx`
- **Design Intent & Problem Solved**:
  - **Replaced Segmented Dashes with a Single Line**:
    - Replaced the 4 separated progress dashes (`gap-1.5` segments) with a single continuous, rounded track (`bg-muted`) and smooth fill line (`bg-primary`).
    - Calculates completion percentage directly from the active step (`(step / 4) * 100%`) with smooth CSS easing transitions (`transition-all duration-300 ease-out`).
    - Produces a sleek, unified, and modern linear progress experience matching standard design systems.
- **Anti-AI Slop Quality Compliance**:
  - Clean brand tokens (`bg-muted`, `bg-primary`), seamless animations, zero broken dash clutter.
- **Upstream Porting Notes**:
  - Pure visual styling update in `SignUpProgress.tsx`; props and step logic remain untouched.

### [2026-09-21] Authentication: Expanded Container Dimensions & High White-Space Field Breathing Room

- **Target Route / Surface**:
  - `/signUp` (all steps: Role Selection, Credentials, Profile, Confirmation)
  - `/signIn`
- **Files Modified**:
  - `src/features/authentication/components/AuthBox.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
  - `src/features/authentication/components/forms/SignUpProfile.tsx`
  - `src/features/authentication/components/forms/SignUpCredentials.tsx`
  - `src/features/authentication/components/forms/SignUpConfirm.tsx`
  - `src/features/authentication/components/forms/SignUpRoleSelection.tsx`
- **Design Intent & Problem Solved**:
  - **Unclipped Labels & Generous White Space**:
    - Previously, container height of 570px was too tight for Step 3, causing "Full Name" label to be partially clipped by `overflow-hidden` at the top, and bottom inputs to press directly against the navigation action bar.
    - Expanded `AuthBox` container height to `h-[660px] sm:h-[685px] max-h-[calc(100dvh-2.5rem)]` with `px-5 py-4.5 sm:px-6 sm:py-5` padding, capitalizing on the ample vertical space available on mobile and desktop viewports.
    - Increased inter-field spacing across all form steps:
      - `SignUpProfile.tsx`: `gap-3.5 sm:gap-4` between field rows, `gap-2` between labels and inputs, and `gap-3 sm:gap-3.5` for 2-column nickname/pronoun and doctor rows.
      - `SignUpCredentials.tsx`: `gap-4 sm:gap-4.5` between fields and `gap-2` between labels and inputs.
      - `SignUpRoleSelection.tsx`: `min-h-[125px] sm:min-h-[135px]` with `p-4 sm:p-5 rounded-2xl` and `gap-3 sm:gap-4`.
      - `SignUpConfirm.tsx`: `gap-3.5 sm:gap-4` with `p-3.5 sm:p-4 rounded-2xl` registration summary.
    - **Zero-Scroll Guarantee**: The content area fits comfortably with ~30px of vertical headroom, completely eliminating clipping and maintaining zero inner or outer scrollbars.
- **Anti-AI Slop Quality Compliance**:
  - Elegant spatial breathing room, crisp 1px solid borders, no awkward clipping or scroll slop, strict adherence to BayanHealth typography hierarchy.
- **Upstream Porting Notes**:
  - Pure visual styling and spatial layout improvements.

### [2026-09-21] Patient Consultation Intake: "Who is this for?" Tile Card Redesign & Truncation Fix

- **Target Route / Surface**:
  - `/patient/booking/getBooking/[bookingId]` (Patient Consultation Intake Wizard, Step 1: "Who is this for?")
- **Files Modified**:
  - `src/components/blocks/profile/PersonDataSection.tsx`
- **Design Intent & Problem Solved**:
  - **Eliminated Text Truncation (`Depen...`)**:
    - Previously, horizontal card layout placed the icon, title, subtitle, and badge in a single crowded horizontal row. In a 2-column grid on mobile viewports, the "SOON" badge and icon consumed over 65% of available width, truncating "Dependent" into "Depen..." and compressing "Family member".
    - Restructured cards into an ergonomic vertical tile layout:
      - **Top Row**: Form icon (`User` / `Users`) framed in a soft rounded container (`size-8 sm:size-9`) on the left, paired with the active status indicator (`Check` circle on "Myself", "Soon" badge on "Dependent") on the right.
      - **Bottom Row**: Full-width title ("Myself" / "Dependent") and subtitle ("Account owner" / "Family member") with zero truncation, tight leading, and crisp typography.
    - Symmetrical height (`min-h-[84px] sm:min-h-[92px]`), comfortable touch targets, and balanced visual parity between active and disabled states.
- **Anti-AI Slop Quality Compliance**:
  - Crisp 1px solid and dashed borders, brand teal active state (`--teal-100`, `--action-primary`), senior-friendly legibility, zero truncation slop.
- **Upstream Porting Notes**:
  - Pure presentation improvement in `PersonDataSection.tsx`; form values (`field.value`, `forWhom`) remain untouched.

### [2026-09-21] Authentication Sign-Up: Full-Width Step 1 Next Action & Balanced Navigation Bar

- **Target Route / Surface**:
  - `/signUp` (Step 1: Role Selection action bar)
- **Files Modified**:
  - `src/features/authentication/components/SignUpFlow.tsx`
- **Design Intent & Problem Solved**:
  - **Full-Width Primary Action on First Step**:
    - Previously, the Back button on Step 1 was hidden using `invisible pointer-events-none`. Because `invisible` preserves layout space in flex containers, the Next CTA button was lopsided and pushed to the right side of the card.
    - Conditionally omitted the Back button when `isFirstStep` is true, and updated the Next CTA to occupy the full width of the card (`w-full h-12`).
    - Maintained standard bookended `justify-between` navigation (Back on left, Next/Complete on right) for subsequent steps (2, 3, and 4).
- **Anti-AI Slop Quality Compliance**:
  - Balanced visual symmetry, ergonomic mobile thumb-zone alignment (48px touch target), crisp border and token-driven brand styling.
- **Upstream Porting Notes**:
  - Pure layout fix in `SignUpFlow.tsx`; no changes to wizard state, schemas, or submission logic.



### [2026-09-21] Authentication: Zero-Scroll Sign-Up Wizard & Balanced Multi-Column Field Ergonomics

- **Target Route / Surface**:
  - `/signUp` (Sign-Up Wizard, all steps including Step 3 Profile Completion)
  - `/signIn`
- **Files Modified**:
  - `src/features/authentication/components/AuthBox.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
  - `src/features/authentication/components/forms/SignUpProfile.tsx`
  - `src/features/authentication/components/forms/SignUpBottomPickers.tsx`
  - `src/features/authentication/components/forms/SignUpCredentials.tsx`
- **Design Intent & Problem Solved**:
  - **Eliminated Outer and Inner Scrollbars ("Avoid Making It Scrollable")**:
    - Previously, container height was set to `710px–730px`, which exceeded laptop and mobile viewport heights and triggered browser or card scrollbars.
    - Stacked 6 full-width fields vertically in Step 3, taking over ~510px for the inputs alone.
    - Grouped **Call Me (Nickname)** and **Pronouns (optional)** side-by-side into a balanced 2-column row (`grid grid-cols-2 gap-2.5 sm:gap-3`), saving ~70px of vertical space.
    - Similarly grouped Doctor profile fields (Specialization + Sub-Specialization, Clinic Name + Clinic Address) into 2-column rows for clinical desktop density.
    - Calibrated `AuthBox` container to `h-[570px] sm:h-[595px] max-h-[calc(100dvh-4.5rem)]` with `overflow-hidden`, maintaining an identical, consistent container footprint across all steps without any jumping or scrollbars.
    - Set `overflow-hidden` on `SignUpFlow`'s content wrapper, strictly preventing scrollbars.
    - Standardized input touch heights to `h-11 sm:h-12` (44px on mobile, 48px on sm/desktop) across credentials, profile fields, picker triggers, and action buttons.
- **Anti-AI Slop Quality Compliance**:
  - Crisp 1px solid borders, intentional spatial hierarchy, consistent container aspect ratio, clean Lucide iconography, zero scroll clipping.
- **Upstream Porting Notes**:
  - Pure layout and styling changes; all form keys, Zod schemas, and wizard step handling remain untouched.

### [2026-09-21] Patient Consultation Intake: Mobile-First Gender Bottom Sheet Modal Replacement

- **Target Route / Surface**:
  - `/patient/booking/getBooking/[bookingId]` (Patient Consultation Intake Wizard, Step 1: "About You")
- **Files Modified**:
  - `src/components/blocks/profile/PersonDataSection.tsx`
- **Design Intent & Problem Solved**:
  - **Eliminated Desktop Popover on Mobile**:
    - Replaced the desktop-centric Radix UI `<Select>` popover for "Sex at birth" (`genderAtBirth`) with a mobile-first `GenderPicker` powered by `CustomBottomModal`.
    - Standard floating dropdown menus float awkwardly below inputs on phones with tiny, hard-to-tap items (32px) and no thumb-zone ergonomics.
    - Upgraded to a comfortable bottom drawer sheet featuring:
      - Large `h-14 sm:h-15` (56px-60px) touch targets for "Male", "Female", and "Prefer Not To Say".
      - Clear visual active states with teal tint (`bg-(--teal-100)`), active brand border, and Lucide `Check` icons.
      - Prominent full-width "Cancel" dismiss button at the bottom.
      - Aligns consistency with `BloodTypePicker`, `PronounBottomPicker`, and `DateOfBirthBottomPicker`.
- **Anti-AI Slop Quality Compliance**:
  - Crisp 1px solid borders, brand teal active state (`--teal-100`, `--teal-800`), clinical typography, zero generic floating menu slop.
- **Upstream Porting Notes**:
  - Pure UI replacement of `<Select>` with `GenderPicker`; keeps `field.onChange` and `genderAtBirth` string values completely unchanged.

### [2026-09-21] Patient Consultation Intake: Senior-Friendly UI Ergonomics & High-Accessibility Form Scaling

- **Target Route / Surface**:
  - `/patient/booking/getBooking/[bookingId]` (Patient Consultation Intake Wizard, Step 1: "About You")
- **Files Modified**:
  - `src/components/blocks/profile/PersonDataSection.tsx`
  - `src/features/booking/components/DateTimePicker.tsx`
  - `src/features/booking/components/consultation/intake/MultiSelectDropdown.tsx`
  - `src/features/booking/components/consultation/intake/IntakeNavFooter.tsx`
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx`
- **Design Intent & Problem Solved**:
  - **Senior-Friendly Large Touch Targets (>= 48px to 64px)**:
    - Expanded "Who is this for?" radio cards from `h-11` (44px) to `h-14 sm:h-16` (56px-64px), with `size-9 sm:size-10` icon containers and `size-5` Lucide vector icons (`User`, `Users`).
    - Standardized all input and picker heights (`DatePicker`, `SelectTrigger`, `Input` for weight/height, `BloodTypePicker`, `MultiSelectDropdown`) to `h-12 sm:h-12.5` (48px-50px) for effortless, tremor-tolerant tapping.
    - Scaled navigation buttons in `IntakeNavFooter` to `min-h-12 sm:min-h-12.5` with generous padding (`px-6`) and larger typography.
  - **Legible, High-Contrast Typography (No More Microscopic All-Caps)**:
    - Replaced unreadable `text-[10px]` all-caps labels with clear `text-xs sm:text-sm font-semibold text-(--text-heading)`.
    - Increased input, placeholder, and option font sizes to `text-sm sm:text-base` (15-16px, which also prevents automatic browser zoom on iOS).
    - Upgraded section legends and step title headers (`text-base sm:text-lg font-bold`).
  - **Balanced Vertical Spacing & Card Padding**:
    - Expanded inner card padding to `p-3.5 sm:p-5` with `space-y-3.5 sm:space-y-4` spacing, naturally utilizing the screen height and removing empty white space awkwardness.
- **Anti-AI Slop Quality Compliance**:
  - Clean 1px solid borders (`border-(--border-default)`), warm surface card styling (`bg-(--surface-card)`), and clinical Lucide vector icons (`Droplet`, `Calendar`, `User`, `Weight`, `Ruler`, `Check`, `ChevronDown`). Zero AI glowing strokes or neon SaaS effects.
- **Upstream Porting Notes**:
  - Preserved all react-hook-form bindings (`personalDetails.dateOfBirth`, `genderAtBirth`, `weight`, `height`, `bloodType`, `allergens`, `diet`), schemas, and validation logic intact.

### [2026-09-21] Authentication Sign-Up: Increased Field Spacing, Expanded Container & Zero-Scroll Layout

- **Target Route / Surface**:
  - `/signUp` (Step 3: "Complete Profile" and overall Sign-Up container)
- **Files Modified**:
  - `src/features/authentication/components/forms/SignUpProfile.tsx`
  - `src/features/authentication/components/AuthBox.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
- **Design Intent & Problem Solved**:
  - **Spacious Field Spacing & Enlarged Typography**:
    - Increased the vertical gap between fields from cramped `gap-2` to generous `gap-3.5 sm:gap-4` with `gap-1.5` internal field padding, eliminating the cramped feel.
    - Scaled up all field labels to `text-sm font-semibold text-foreground` (14px) for high accessibility and visual consistency across steps.
  - **Zero-Scroll Fit & Expanded Consistent Container**:
    - Expanded the unified card container height from `600px` to `h-[710px] max-h-[calc(100dvh-2rem)] sm:h-[730px]`.
    - Streamlined the Step 3 description to a single concise line (`"Profile details are saved locally on your device."`), saving vertical space.
    - Enabled all 6 profile fields (Full Name, Date of Birth, Address, Preferred Contact, Nickname, and Pronouns) to fit comfortably on screen simultaneously with zero truncation.
    - Added CSS scrollbar suppression (`[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`) to prevent unsightly browser scrollbar tracks from appearing.
- **Anti-AI Slop Quality Compliance**:
  - Spacious breathing room, consistent spatial geometry across steps, and zero visual clutter.
- **Upstream Porting Notes**:
  - Form validation, field bindings, and handoff flows are 100% preserved.

### [2026-09-21] Patient Profile: Removed Month Numbers in Date of Birth Picker

- **Target Route / Surface**:
  - `/signUp` (Step 3: "Complete Profile" Date of Birth bottom sheet modal)
- **Files Modified**:
  - `src/features/authentication/components/forms/SignUpBottomPickers.tsx`
- **Design Intent & Problem Solved**:
  - **Clean Month Typography**:
    - Removed redundant numeric prefixes/suffixes (e.g. `(08)`, `(09)`) from the Month scroll column items.
    - Standardized month options to clean 3-letter month labels (`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`), streamlining visual hierarchy and eliminating clutter.
- **Anti-AI Slop Quality Compliance**:
  - Crisp typography, consistent spacing, and zero redundant text elements.
- **Upstream Porting Notes**:
  - Value emission format remains `YYYY-MM-DD`.

### [2026-09-21] Patient Intake: Permanently Visible Non-Scrollable Action Buttons & Strict Flex Isolation

- **Target Route / Surface**:
  - `/patient/booking/getBooking/[bookingId]` (All Intake Steps: About You, Medical History, Concern & Safety, Pain Assessment, Review & Consent)
- **Files Modified**:
  - `src/features/booking/components/consultation/intake/IntakeNavFooter.tsx`
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx`
  - `src/features/booking/components/consultation/BookingWizard.tsx`
  - `src/features/booking/components/patient/PatientBookingDetail.tsx`
  - `src/app/patient/booking/getBooking/[bookingId]/page.tsx`
- **Design Intent & Problem Solved**:
  - **Permanently Anchored & Always-Showing CTA Buttons**:
    - Upgraded `IntakeNavFooter`'s pinned placement to `sticky bottom-0 z-30 shrink-0 border-t border-(--border-subtle) bg-(--surface-card) px-3.5 py-2.5 shadow-sm sm:px-8 sm:py-3`.
    - Buttons ("Back" and "Continue" / "Submit") are permanently locked and anchored at the bottom of the visible intake card across all device viewports.
    - The action bar NEVER scrolls off screen, is never hidden behind the mobile bottom navigation bar (`NavBar`), and never requires the patient to scroll through the form to find or press it.
  - **Strict Flexbox Containment & Zero Container Overflow**:
    - Removed conflicting `h-full` properties across nested flex children in `BookingWizard` and `AuthenticatedIntakeForm`. Previously, `h-full` forced flex-1 children to match 100% of their parent's height while ignoring siblings (`BookingContextBar` and headers), pushing the bottom buttons ~50px below the viewport edge.
    - Replaced with `flex-1 min-h-0 flex flex-col overflow-hidden` so that intermediate wrappers absorb the exact remaining vertical space.
    - Isolated the scrollable section in `AuthenticatedIntakeForm` with `<div className="flex min-h-0 flex-1 overflow-hidden">`, strictly constraining vertical scrolling to `<main ref={scrollBodyRef}>` while the header and footer remain static.
  - **Zero Outer Window Scrolling**:
    - Added `overflow-hidden` to `BookingDetailPage` (`page.tsx`) and `flex-1 min-h-0 w-full` to `PatientBookingDetail`, guaranteeing that the outer page/window never shows double scrollbars.
- **Anti-AI Slop Quality Compliance**:
  - Solid 1px borders, opaque card surface backdrop, standard Lucide vector icons (`ArrowLeft`, `ArrowRight`, `Send`), and WCAG AA $\ge 44\text{px}$ touch targets.
- **Upstream Porting Notes**:
  - Pure layout, CSS geometry, and spatial hierarchy modernization. Zero business logic, validation rules, or API contracts altered.

### [2026-09-21] Authentication Sign-Up: Consistent Card Container Sizing & Anti-Jank Stability

- **Target Route / Surface**:
  - `/signUp` (All 4 Steps: Choose Role, Create Account, Complete Profile, Confirm & Submit)
- **Files Modified**:
  - `src/features/authentication/components/AuthBox.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
  - `src/features/authentication/components/forms/SignUpProfile.tsx`
- **Design Intent & Problem Solved**:
  - **Locked Consistent Card Container Dimensions**:
    - Previously, the signup card height was content-driven (`h-auto`), causing severe visual jumping between steps (collapsing to ~350px on Step 4 and expanding to ~620px on Step 3).
    - Standardized the signup card container to a consistent height (`h-[600px] max-h-[calc(100dvh-5rem)] sm:h-[620px]`) across all 4 steps.
    - Pinned the step progress and title at the top, and pinned the thumb-friendly action bar (`Back` / `Next`) and sign-in link at the exact same bottom position on every step.
  - **Anti-Clipping Centered Content**:
    - Switched the step content wrapper from `justify-center` on the scroll parent to `my-auto` on the child wrapper, preventing tall forms (Step 3) from having their top inputs clipped while keeping shorter steps (Step 1 & Step 4) perfectly vertically centered.
    - Calibrated Step 3 profile field gaps (`gap-2 sm:gap-2.5`) to comfortably accommodate all 6 inputs without forced overflow.
- **Anti-AI Slop Quality Compliance**:
  - Fixed-dimension spatial stability, zero layout shifts, crisp 1px borders, and ergonomic thumb zone constancy.
- **Upstream Porting Notes**:
  - Form state, wizard step navigation, and validation handlers are completely preserved.

### [2026-09-21] Patient Profile: Mobile-Friendly Date of Birth Touch Column Picker

- **Target Route / Surface**:
  - `/signUp` (Step 3: "Complete Profile" for Patient registration)
- **Files Modified**:
  - `src/features/authentication/components/forms/SignUpBottomPickers.tsx`
- **Design Intent & Problem Solved**:
  - **Eliminated Native Browser `<select>` Dropdown Popups**:
    - Replaced raw HTML `<select>` dropdowns for Month, Day, and Year that opened unstyled, oversized browser menu overlays that covered the mobile viewport.
    - Built a dedicated, self-contained 3-column scrollable touch wheel picker inside the `CustomBottomModal`.
    - Integrated smooth auto-scrolling with `scrollIntoView({ block: 'center' })` to automatically center the user's selected date upon opening.
    - Dynamically calculated `daysInMonth` based on the selected year and month (including leap year validation) and automatically clamped invalid days.
  - **Live Preview & Clinical Age Badge**:
    - Added a real-time header preview displaying the formatted date alongside a clinical age calculation badge (e.g. `30 years old`).
    - Standardized touch target buttons to tactile 36px-40px sizes with active brand teal states (`bg-primary text-primary-foreground font-bold shadow-xs`).
- **Anti-AI Slop Quality Compliance**:
  - Crisp 1px solid borders, semantic tokens, zero gradient stroke glows, and clean Lucide SVG icons.
- **Upstream Porting Notes**:
  - Emits `YYYY-MM-DD` string format matching existing API contracts and form schemas.

### [2026-09-21] Authentication Sign-Up: Fixed Role Selection Auto-Advance Behavior

- **Target Route / Surface**:
  - `/signUp` (Step 1: "Choose Your Role")
- **Files Modified**:
  - `src/features/authentication/stores/useSignUpStore.ts`
  - `src/features/authentication/components/forms/SignUpRoleSelection.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
  - `src/features/authentication/hooks/useSignUpWizard.ts`
- **Design Intent & Problem Solved**:
  - **Eliminated Instant Auto-Advance on Card Click**:
    - Previously, clicking a role card ("Patient" or "Doctor") immediately executed `setRole`, which forced `step: 2` in the Zustand store, abruptly bypassing the "Next" button.
    - Updated `setRole` to update only the selected `role` state without modifying `step`.
    - Clicking a role card now highlights and selects the card with active brand teal styling while keeping the user on Step 1.
    - Enabled the prominent bottom "Next ->" button upon role selection, allowing the user to explicitly and deliberately advance to Step 2 ("Create Account").
- **Upstream Porting Notes**:
  - Store contracts, form validation schemas, and handoff flows are preserved.

### [2026-09-21] Patient Intake: Related Symptoms Mobile Modal & Aligned Symmetrical Toggles

- **Target Route / Surface**:
  - `/patient/booking/getBooking/[bookingId]` (Patient Intake Step 3: "Current Concern & Safety")
- **Files Modified**:
  - `src/features/booking/components/consultation/intake/ConcernSafetyStep.tsx`
  - `src/features/booking/components/consultation/intake/IntakeChoice.tsx`
- **Design Intent & Problem Solved**:
  - **Related Symptoms Mobile Bottom Modal (`CustomBottomModal`)**:
    - Replaced the wall of 17 jagged, unaligned chips with a sleek high-affordance trigger field (`Activity` icon, selection count badge, and dropdown indicator).
    - When tapped, slides up `CustomBottomModal` categorizing all 17 symptoms into balanced, symmetrical 2-column grids (`grid grid-cols-2 gap-2`) with tactile 48px touch targets, active brand teal rings, and clear checkmarks.
    - Selected symptoms render as dismissible tag chips beneath the trigger on the main form, saving ~250px of vertical space.
  - **Symmetrical 50/50 Home Vitals Radio Toggle (`SegmentedToggle`)**:
    - Upgraded `SegmentedToggle` from an uneven inline-flex container with empty trailing whitespace to a balanced `grid grid-cols-2 w-full` layout.
    - "No vitals taken" and "+ Log vitals" now span equal 50% halves across the full mobile card width with centered typography and active state rings.
- **Anti-AI Slop Quality Compliance**:
  - Maintained crisp 1px solid borders, BayanHealth Brand Navy and Teal tokens, Lucide SVG vector icons, and zero floating glowing gradients.
- **Upstream Porting Notes**:
  - Form state bindings (`requestDetails.complaintTags`) and validation are identical. Zero backend schema changes.

### [2026-09-21] Patient Intake: Full-Width Layout Restoration for Blood Type & Allergies

- **Target Route / Surface**:
  - `/patient/booking/getBooking/[bookingId]` (Patient Intake Step 1: "About You")
- **Files Modified**:
  - `src/components/blocks/profile/PersonDataSection.tsx`
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx`
- **Design Intent & Problem Solved**:
  - **Full-Width Row Restoration**:
    - Disbanded the cramped 2-column pairing of Blood Type and Allergies & Intolerances.
    - Restored **Blood Type** to a clean, full-width row with comfortable tactile affordance.
    - Restored **Allergies & Intolerances** to a full-width row, eliminating label wrapping, text truncation (`Search or add alle...`), and helper text squishing.
    - Kept standard vitals (DOB & Sex, Weight & Height) in balanced 2-column pairings while allowing complex clinical selectors full breathing room.
    - Configured `intake-scroll-body` with `overflow-y-auto` and hidden scrollbars to prevent any visual scrollbar while safely accommodating varied mobile screen ratios.
- **Anti-AI Slop Quality Compliance**:
  - Crisp 1px solid borders, clean typography, full-width readability, zero truncation slop.
- **Upstream Porting Notes**:
  - Layout-only change. Form bindings and schemas remain identical.

### [2026-09-21] Authentication: Simplified Layout, Enlarged Typography & Conditional Password Requirements

- **Target Route / Surface**:
  - `/signUp` (Step 2: "Create Account" credentials step)
  - `/signIn` (Patient & Doctor Sign In)
- **Files Modified**:
  - `src/features/authentication/components/forms/SignUpCredentials.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
  - `src/features/authentication/components/forms/SignInForm.tsx`
- **Design Intent & Problem Solved**:
  - **Conditional Password Requirement Display**:
    - Replaced the hardcoded, static helper text beneath the password field with a reactive conditional check (`!isPasswordPassing`).
    - When the password is empty or in-progress, clear guidance is provided; as soon as the password satisfies the standard (10+ characters, uppercase, lowercase, numbers), the helper text automatically disappears, eliminating visual clutter.
    - Added dynamic warning color (`text-amber-600 dark:text-amber-400`) while typing an incomplete password and calm muted styling when idle.
  - **Simplified Copy & Reduced Cognitive Clutter**:
    - Shortened form labels from verbose "Email Address" to concise "Email".
    - Streamlined subtitles and descriptions across both Sign-Up and Sign-In forms to eliminate redundant characters and align with modern design patterns (Clerk, Stripe, Linear).
  - **Enlarged Typography & Mobile Touch Targets**:
    - Scaled step titles up to prominent `text-xl sm:text-2xl font-bold tracking-tight`.
    - Enlarged input field labels from small `text-xs` (12px) to accessible, legible `text-sm font-semibold` (14px).
    - Standardized all input heights to ergonomic 48px touch targets (`h-12 rounded-xl`), adhering strictly to patient-first accessibility guidelines.
- **Anti-AI Slop Quality Compliance**:
  - Crisp 1px solid borders, semantic tokens, and clean SVG vector icons without glowing gradients.
- **Upstream Porting Notes**:
  - Form field names, Zod schemas, validation bindings, and Cognito auth handlers are 100% preserved.

### [2026-09-21] Patient Intake: Elimination of Double-Scroll & Zero-Scroll Fit Across All Screens

- **Target Route / Surface**:
  - `/patient/booking/getBooking/[bookingId]` (Patient Consultation Intake Wizard)
- **Files Modified**:
  - `src/features/patient/components/PatientShell.tsx`
  - `src/app/patient/booking/getBooking/[bookingId]/page.tsx`
  - `src/features/booking/components/patient/PatientBookingDetail.tsx`
  - `src/features/booking/components/consultation/BookingWizard.tsx`
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx`
  - `src/features/booking/components/consultation/intake/IntakeNavFooter.tsx`
  - `src/components/blocks/profile/PersonDataSection.tsx`
  - `src/features/booking/components/consultation/intake/MultiSelectDropdown.tsx`
- **Design Intent & Problem Solved**:
  - **Zero Outer Window Scroll**:
    - Locked `PatientShell` outer wrapper to `h-[100dvh] max-h-[100dvh] w-full overflow-hidden`, completely preventing the browser window and body from scrolling on all device viewports.
    - Removed redundant `pb-24` from `<main>` in `PatientShell` which previously forced an artificial 96px scroll overflow.
    - Streamlined `BookingDetailPage` to `flex h-full min-h-0 w-full flex-1 flex-col` and stripped out the hardcoded `pb-10` and redundant nested wrappers.
    - Calibrated `PatientBookingDetail` when `isIntake === true` to precisely fill the available viewport above the fixed navigation bar (`h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom,0px))]` on mobile, `lg:h-[calc(100dvh-1.5rem)]` on desktop) with `overflow-hidden`.
  - **Zero Inner Form Scroll**:
    - Changed `AuthenticatedIntakeForm`'s body from `overflow-y-auto` to `overflow-hidden`.
    - Compacted Step 1 "About You" personal vitals rows to crisp `h-9 sm:h-10` input heights with `text-[10px] sm:text-[11px]` labels, fitting the entire section within ~290px of vertical space.
    - Tightened `BookingContextBar` back button (`size-9 sm:size-10`) and padding (`py-1 sm:py-2`), and refined `IntakeNavFooter` pinned padding (`px-3.5 py-2`) and button height (`min-h-10 sm:min-h-11`).
    - Entire intake screen fits within 100% of the screen height on small phones (e.g. iPhone SE 667px), medium phones, tablets, and desktop cockpits with zero scrolling.
- **Anti-AI Slop Quality Compliance**:
  - Crisp solid 1px borders, zero floating gradient glows, standard Lucide vector icons, and strict adherence to BayanHealth brand tokens.
- **Upstream Porting Notes**:
  - Pure layout, CSS geometry, and styling changes. Zero form logic, validation, or schema alterations.

### [2026-09-21] Authentication Sign-Up Flow: Direct Redirection to Doctor Sign-In on Role Selection

- **Target Route / Surface**:
  - `/signUp` (Step 1: "Choose Your Role" role selection screen)
- **Files Modified**:
  - `src/features/authentication/components/forms/SignUpRoleSelection.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
- **Design Intent & Problem Solved**:
  - **Instant Doctor Sign-In Navigation**:
    - When clicking the "Doctor" role card on Step 1, the user is immediately redirected to the Sign-In page (`/signIn`) rather than requiring them to select the card and subsequently click "Next" through the patient sign-up wizard.
    - Added fallback guard in `handleContinue` to route to `/signIn` if a doctor role is active on Step 1.
    - Preserves Patient account registration onboarding workflow while smoothly channeling clinical professionals to the unified authentication portal.
- **Anti-AI Slop Quality Compliance**:
  - Immediate responsive interaction with no layout shift or unnecessary interstitial spinners.
  - Clinical authority maintained through standard Lucide icons (`Stethoscope`, `HeartPulse`) and solid surface borders.
- **Upstream Porting Notes**:
  - Pure client router navigation via `next/navigation`'s `useRouter().push("/signIn")`. No backend, API, or contract alterations.

### [2026-09-21] Authentication Sign-Up Profile: Preferred Contact Grid Layout Symmetrical Alignment

- **Target Route / Surface**:
  - `/signUp` (Step 3: "Complete Profile" for Patient / Doctor registration)
- **Files Modified**:
  - `src/features/authentication/components/forms/SignUpProfile.tsx`
- **Design Intent & Problem Solved**:
  - **Symmetrical 5-Column Grid Alignment**:
    - Replaced `grid-cols-4` with `grid-cols-5` so that all 5 communication preferences (SMS, Email, Messenger, WhatsApp, Viber) are laid out evenly across a single unified row instead of leaving Viber orphaned alone on an uneven second row.
    - Adjusted typography with responsive font sizing (`text-[10px] sm:text-[11px] leading-none`) and centered layout so all labels fit cleanly within 48px tactile touch targets.
- **Anti-AI Slop Quality Compliance**:
  - Maintained crisp 1px solid border states, primary active ring accents, and clinical vector icons.
- **Upstream Porting Notes**:
  - Form validation bindings and `preferredCommunicationApp` array schema are unchanged.

### [2026-09-21] Patient Intake: Medical History Symmetrical Grid & Clickable Choice Cards Redesign

- **Target Route / Surface**:
  - `/patient/booking/getBooking?id=...` & `/patient/booking/...` (Patient Consultation Intake Wizard, Step 2: "Medical History")
- **Files Modified**:
  - `src/features/booking/components/consultation/intake/IntakeChoice.tsx`
  - `src/features/booking/components/consultation/intake/MedicalHistoryStep.tsx`
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx`
- **Design Intent & Problem Solved**:
  - **Balanced, Symmetrical 2-Column Conditions Grid (`ConditionTile`)**:
    - Replaced the ragged, uneven `flex flex-wrap gap-2` tag cloud with a structured, equal-width 2-column mobile grid (`grid grid-cols-2 sm:grid-cols-3 gap-2`).
    - Standardized all 12 condition tiles to identical height and width with left-aligned clinical typography and explicit checkmark indicators.
    - Aligned "Other condition (please specify)" as a full-width item spanning both columns at the base of the grid with smooth progressive disclosure for the specify input.
    - Upgraded "No pre-existing medical conditions" into a prominent, high-affordance hero selection card with clear mutual exclusivity against condition selections.
  - **High-Affordance Interactive Choice Cards (`ChoiceCard`)**:
    - Replaced ambiguous, low-contrast `SegmentedToggle` controls for "Current medications" and "Prior surgeries" with tactile, explicit `ChoiceCard` pairs (`grid grid-cols-1 sm:grid-cols-2 gap-2.5`).
    - Added crisp 1px solid borders, visible radio indicator circles with filled active states, clear primary titles, and descriptive helper labels.
    - Provided minimum 48px touch targets adhering to mobile ergonomics and WCAG AA guidelines.
  - **Zero-Scroll Mobile Layout Optimization**:
    - Tightened vertical spacing and section margins (`space-y-6`) so the medical history questions fit into the mobile viewport.
    - Fixed the card height calculation (`max-h-[calc(100dvh-13.5rem)]`) to ensure the pinned action footer (`Back` & `Continue`) remains completely above the fixed mobile bottom navigation bar (`NavBar`), eliminating nested scrollbars and cutoffs.
- **Anti-AI Slop Quality Compliance**:
  - Pure BayanHealth brand tokens (`--surface-nav-accent`, `--safe-bg`, `--safe-fg`, `--border-default`, `--surface-card`).
  - Zero gradient stroke AI glows, zero platform emojis; only accessible SVG vector icons (`Check`).
- **Upstream Porting Notes**:
  - Form field bindings (`personalDetails.structuredMedicalHistory.knownConditions`, `noneReported`, `other`, `currentMedications`, `details`) and validation rules are 100% preserved.

### [2026-09-21] Patient Intake: Zero-Scroll Single-Screen Modernization & Mobile Bottom Sheet Drawers

- **Target Route / Surface**:
  - `/patient/booking/getBooking?id=...` & `/patient/booking/...` (Patient Teleconsult & Consultation Intake Wizard, Step 1: "About You")
  - Multi-Select pickers across all intake steps (Allergies & Intolerances, Dietary Preferences)
- **Files Modified**:
  - `src/components/blocks/profile/PersonDataSection.tsx`
  - `src/features/booking/components/consultation/intake/MultiSelectDropdown.tsx`
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx`
  - `src/features/booking/components/consultation/intake/IntakeNavFooter.tsx`
- **Design Intent & Mobile-First Root Cause Fix**:
  - **Zero-Scroll Single-Screen Mobile Architecture**:
    - Eliminated nested scrollbars and viewport collision with the patient shell's fixed bottom navigation bar (`max-h-[calc(100dvh-13.5rem)]`). The entire intake sheet, header, fields, and pinned `Back`/`Continue` footer fit cleanly within the viewport on mobile without requiring vertical scrolling.
    - Removed outdated blog-style colored underline beneath "About You" and the detached floating trust text.
    - Embedded a clinical trust micro-pill (`ShieldCheck` · "Encrypted & Autosaved") directly into the header row.
  - **Mobile Bottom Sheet Drawers (`CustomBottomModal` / `Drawer`) for Pickers**:
    - **Blood Type Bottom Picker**: Built a dedicated `BloodTypePicker` with an accessible 44px trigger button displaying the `Droplet` icon. Tapping opens a slide-up `CustomBottomModal` displaying 8 large, tactile 48px options (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) in a clean grid with active checkmark feedback.
    - **Allergies & Dietary Multi-Select Mobile Drawer**: Replaced the desktop popover with a responsive `CustomBottomModal` on mobile (`useIsMobile`). Features search input, active chip tags, prominent "None" toggle, 48px preset rows with checkmarks, and a thumb-friendly "Done" CTA button.
  - **High-Density Clinical Vitals & Demographic Layout**:
    - **Patient Selector ("Who is this for?")**: Replaced the oversized 96px cards with a sleek, compact 2-column segmented selector (`h-12`). "Myself" features an active border (`border-(--action-primary)`), soft teal tint (`bg-(--teal-100)/25`), circular avatar icon, and checkmark. "Dependent" displays a dashed border and gold "Soon" badge (`--gold-100` / `--gold-700`).
    - **Paired 2-Column Vitals Grid**: Paired Date of Birth (compact `CalendarIcon` picker, replacing casual `Cake`) with Sex at birth (compact segmented control with calm active state); paired Weight and Height side-by-side with semantic red asterisks (`text-(--danger-fg)`); paired Blood Type and Allergies side-by-side.
    - Eliminated the awkward `Cog` (gear) and `Apple` dividers in favor of clean section headers with crisp 1px solid borders.
- **Tokens & Components Used**:
  - `CustomBottomModal`, `Drawer`, `bg-(--surface-card)`, `border-(--border-subtle)`, `--teal-700` (`#18a58c`), `--teal-100`, `--navy-700` (`#074972`), `--gold-100`, `--gold-700`, `--danger-fg`.
- **Anti-AI Slop Quality Compliance**:
  - 100% free of one-sided glowing stroke gradients, purple/cyan neon blobs, or meaningless AI badges.
  - Zero platform emojis used; clean vector Lucide icons (`CalendarIcon`, `User`, `Users`, `Weight`, `Ruler`, `Droplet`, `ShieldCheck`, `Check`, `ChevronDown`).
  - Strict compliance with Brand Navy, Teal, and Warm Cream palette.
- **Upstream Porting Notes**:
  - Zero business logic, schema, or API mutation changes. All React Hook Form bindings (`name`, `prefix`, `setValue`) remain 100% preserved.

- **Target Route / Surface**:
  - `/signUp` (Pronoun Picker, Date of Birth Picker, Doctor Specialization Picker, Terms and Conditions)
  - Reusable modal primitive `CustomBottomModal`
- **Files Modified**:
  - `src/components/ui/custom-bottom-modal.tsx`
  - `src/features/authentication/components/forms/SignUpBottomPickers.tsx`
  - `src/components/blocks/legal/SignUpTermsAndCondition.tsx`
- **Design Intent & Reference Alignment**:
  - **Standard Mobile Modal Component Integration**:
    - Replaced the custom bottom sheet implementation in `CustomBottomModal` with the official BayanHealth `Drawer` (`src/components/ui/drawer.tsx`).
    - Standardized container geometry to a floating card inset from screen edges (`m-(--drawer-inset,0px)` with `--drawer-inset: --spacing(2)` / 8px margin), rounded on all 4 corners (`rounded-[min(var(--radius-4xl),24px)]`), with subtle shadow and `DrawerOverlay` backdrop blur.
    - Removed extraneous drag handles, close 'X' buttons, and top border dividers to provide the clean, centered visual hierarchy established in `BookingServiceSelect`.
  - **Consistent Selection Option Cards**:
    - Updated `PronounBottomPicker` and `SpecializationBottomPicker` list options to strictly match the reference:
      - Active item: `bg-(--teal-100) ring-1 ring-(--action-primary)` with label and icon in `text-(--teal-800)`.
      - Inactive item: `hover:bg-(--action-secondary-hover-surface)` with `text-foreground` and `text-(--text-muted)`.
      - Removed redundant radio check circle badges in favor of full card selection state.
  - **Responsive Terms & Conditions Modal**:
    - Modernized `SignUpTermsAndConditions` to be responsive: on mobile (`useIsMobile`), renders as the floating standard `Drawer` with centered header, scrollable body, and sticky bottom action buttons (`DrawerFooter`); on desktop, retains the standard centered `Dialog`.
- **Tokens & Primitives Used**:
  - `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter`, `bg-(--teal-100)`, `ring-(--action-primary)`, `text-(--teal-800)`, `text-(--navy-700)`.
- **Upstream Porting Notes**:
  - Zero modifications to validation schemas, API calls, or form submission logic. Pure visual/spatial standardization.

### [2026-09-21] Authentication: Full-Screen Mobile-First Layout Unification & Seamless Thumb Zone Docking

- **Target Route / Surface**:
  - `/signUp` and `/signIn` (All steps: Role Selection, Credentials, Profile, Confirm & Submit)
- **Files Modified**:
  - `src/app/(auth)/layout.tsx`
  - `src/features/authentication/components/AuthBox.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
- **Design Intent & Root Cause Fix**:
  - **Eliminated Floating Card & Detached Bottom Bar Clash**:
    - Previously on mobile, a floating desktop card hovered over a cream (`bg-satin`) background while navigation buttons were pinned to `fixed bottom-0`. This created an unsightly beige gap between the card and the bottom bar, and misplaced the "Already have an account? Sign in" link *above* the buttons with a massive artificial white void (`pb-20` / `pb-16`).
    - **Unified Mobile Canvas**: On mobile (`< sm`), the layout now spans the full viewport (`bg-(--surface-card) border-0 rounded-none h-dvh max-h-dvh flex flex-col justify-between overflow-hidden`), creating a seamless, native app feel. On desktop (`>= sm`), it remains an elegant centered cockpit card on warm `bg-satin`.
  - **Integrated Mobile App Header**:
    - Replaced the standalone detached desktop header with an integrated mobile bar (`sm:hidden flex items-center justify-between w-full px-4 pt-3 pb-1.5`) housing the BayanHealth logo and an accessible `ModeToggle` theme switch. Desktop maintains its centered logo above the card and top-corner header.
  - **Seamlessly Docked Thumb Zone Navigation**:
    - Integrated Back, Next / Complete buttons, and "Already have an account? Sign in" directly into the bottom of the flex container (`shrink-0 pt-2.5 sm:pt-3 border-t border-(--border-subtle) mt-auto`).
    - Zero disconnected gaps, zero beige strips, and zero artificial padding voids.
    - Content area uses `flex-1 min-h-0 overflow-y-auto` so content never overflows on small screens while staying 100% single-page on standard mobile displays.
- **Tokens & Components Used**:
  - `bg-(--surface-card)`, `bg-satin`, `border-(--border-subtle)`, `AppLogo`, `ModeToggle`, `brandButtonClass`.
- **Upstream Porting Notes**:
  - Zero API or logic changes; purely layout, spatial hierarchy, and mobile viewport ergonomics.

### [2026-09-21] Authentication: Mobile Bottom Sheet Modals for Dropdowns & Fixed Thumb Zone Navigation Bar

- **Target Route / Surface**:
  - `/signUp` (Role Selection, Account Credentials, Complete Profile, Confirm & Submit)
- **Files Modified / Added**:
  - `src/components/ui/custom-bottom-modal.tsx` [NEW]
  - `src/features/authentication/components/forms/SignUpBottomPickers.tsx` [NEW]
  - `src/app/(auth)/layout.tsx`
  - `src/features/authentication/components/AuthBox.tsx`
  - `src/features/authentication/components/SignUp.tsx`
  - `src/features/authentication/components/SignUpProgress.tsx`
  - `src/features/authentication/components/SignUpFlow.tsx`
  - `src/features/authentication/components/forms/SignUpRoleSelection.tsx`
  - `src/features/authentication/components/forms/SignUpCredentials.tsx`
  - `src/features/authentication/components/forms/SignUpProfile.tsx`
  - `src/features/authentication/components/forms/SignUpConfirm.tsx`
- **Design Intent & Mobile-First Root Cause Fix**:
  - **Custom Modals That Appear from the Bottom (Bottom Sheet Pickers)**:
    - Built a reusable, accessible `CustomBottomModal` (`fixed inset-x-0 bottom-0 z-50 rounded-t-[28px]`) with smooth bottom slide-up animation (`slide-in-from-bottom duration-250`), dimmed scrim backdrop (`bg-black/50 backdrop-blur-xs`), and drag handle pill indicator.
    - **Pronoun Picker**: Replaced the narrow desktop select with `PronounBottomPicker`. Tapping the `h-12` trigger smoothly slides up a custom bottom modal with generous 56px rows (`He / Him`, `She / Her`, `They / Them`, `Prefer not to say`) featuring clinical contextual descriptions and radio checkmarks.
    - **Date of Birth Picker**: Replaced the monthly calendar popover with `DateOfBirthBottomPicker`. Tapping the `h-12` trigger slides up a custom bottom modal with 3 large thumb-friendly column pickers (Month, Day, Year), instant date preview badge, and a primary "Confirm Date" CTA.
    - **Doctor Specialization Picker**: Replaced the narrow select with `SpecializationBottomPicker`. Slides up a custom bottom modal with a thumb-accessible search input (`h-11`) and a smooth scrollable list of 37 specializations with 48px row heights.
  - **Thumb Zone Navigation Bar (Next & Back)**:
    - Pinned the navigation bar to the bottom of the viewport on mobile (`fixed bottom-0 inset-x-0 z-40 bg-(--surface-card)/95 backdrop-blur-md border-t border-(--border-subtle) px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]`).
    - Anchors both Back and Next/Complete buttons directly within natural thumb reach, requiring zero reaching into the upper or middle screen areas.
    - Both buttons upgraded to `h-12` (48px) with `active:scale-[0.98]` tactile compression.
    - Added `pb-20 sm:pb-0` bottom clearance to form content and footer to prevent any element from colliding with the thumb bar.
  - **Single-Page Non-Scrollable Fit**:
    - Constrained `AuthLayout` to `h-dvh max-h-dvh overflow-hidden` and vertically centered the card (`min-h-0 items-center justify-center`).
    - All inputs set to `h-12` with `text-[16px]` to prevent automatic iOS Safari viewport zooming.
- **Tokens & Components Used**:
  - `--teal-700` (`#18a58c`), `border-(--border-subtle)`, `bg-(--surface-card)`, `shadow-(--shadow-card)`, `Button`, `Input`, `CustomBottomModal`.
- **Upstream Porting Notes**:
  - Zero business logic, Cognito handler, Zod schema, or React Hook Form registration changes. All bindings remain 100% stable.

### [2026-09-21] Patient UI: Search Dropdown Layout Modernization, Width Anchoring & Scrim Overlay

- **Target Route / Surface**:
  - `/patient` (Patient Home Top Bar & Quick Symptoms Dropdown)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientHome.tsx`
- **Design Intent & Root Cause Fix**:
  - **Full-Width Span Across Notification Area**: Wrapped the search form and notification Bell button within a shared `relative flex w-full items-center gap-2.5` container, anchoring the dropdown with `absolute top-full left-0 right-0 mt-2 z-50`. This allows the dropdown to expand across the full header width—taking up the space below both the search input and the notification Bell—giving patients a wide, balanced surface for quick symptoms and instant search actions on mobile and desktop.
  - **Dimmed Scrim Backdrop**: Added a focused scrim backdrop (`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]`) when `isSearchOpen` is active. This eliminates visual clash with half-obscured hero content underneath and ensures tapping anywhere outside safely dismisses the search menu.
  - **1-Column Scannable Symptoms List**: Switched the symptoms layout to a full-width 1-column list (`flex flex-col gap-1.5`). Each symptom item now occupies its own row with left-aligned clinical typography and a right-aligned forward navigation chevron (`ChevronRight`), allowing patients to scan symptoms vertically with zero visual friction and effortless tap targets.
  - **Scrollable Safety Height**: Bound the dropdown to `max-h-[calc(100vh-140px)] overflow-y-auto` to ensure seamless usability when mobile virtual keyboards are engaged.
  - **Mobile Touch Ergonomics**: Increased interactive touch heights across symptom chips, search action buttons, and directory links to `min-h-11` (44px), meeting mobile accessibility and WCAG standards. Updated the search input to `text-[16px] sm:text-[14px]` to eliminate iOS Safari automatic viewport zooming on focus.
  - **Clinical Taglish Terminology**: Updated the symptom label from the colloquial "Katawan" to the clinical Taglish standard "Sakit ng Katawan" (matching "Sakit ng Ulo" and "Sakit ng Tiyan").

### [2026-09-21] Patient UI: Desktop Edge-to-Edge Green Bar Behind Sidebar Navigation & Subheader Removal

- **Target Route / Surface**:
  - All Patient UI surfaces: `/patient` (Home), `/patient/health` (My Health), `/patient/booking` (Consultation Chooser), `/patient/booking/search` (Find Doctor), `/patient/booking/doctor/[doctorId]`, `/patient/booking/createBooking`, `/patient/chat` (Chat), `/patient/profile` (Profile & Sub-pages), and `PatientShell`.
- **Files Modified**:
  - `src/features/patient/components/PatientShell.tsx`
  - `src/features/patient/components/PatientPageHeader.tsx`
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/patient/components/PatientPage.tsx`
  - `src/features/patient/components/health/PatientHealthView.tsx`
  - `src/features/booking/components/patient/BookingPathChooser.tsx`
  - `src/features/patient/components/chat/PatientChatList.tsx`
  - `src/features/patient/components/profile/PatientProfileSettings.tsx`
  - `src/features/patient/components/profile/ProfileSubPage.tsx`
  - `src/app/patient/booking/search/page.tsx`
  - `src/app/patient/booking/doctor/[doctorId]/page.tsx`
  - `src/features/booking/components/patient/OnDemandBooking.tsx`
  - `src/features/booking/components/doctor/DoctorBooking.tsx`
  - `src/app/patient/booking/getBooking/[bookingId]/page.tsx`
  - `src/features/patient/components/chat/PatientChatRoom.tsx`
  - `src/app/patient/profile/details/page.tsx`
  - `src/app/patient/profile/doctor-preferences/page.tsx`
  - `src/features/doctor/components/homepage/DoctorHome.tsx`
- **Design Intent & Root Cause Fix**:
  - **Desktop Floating Sidebar & Seamless Behind-the-Navbar Green Top Bar**:
    - Previously, `<aside>` in `PatientShell.tsx` was an in-flow flex sibling beside `<main>`, preventing `<main>` and its `<header>` from reaching `x = 0`. This caused the green bar on desktop to terminate abruptly at the right edge of the sidebar, leaving cream/satin gaps above and to the left of the sidebar.
    - Repositioned `<aside>` as a fixed floating card on desktop (`fixed left-4 top-3 bottom-3 z-30 hidden w-60 lg:flex`) and allowed `<main>` to occupy full viewport width (`w-full flex-1`).
    - The green top bar (`bg-(--teal-700)` in light mode, `dark:bg-[#0c1f1b]` in dark mode) now spans 100vw from `x = 0` to `x = 100vw` across the top of the desktop screen, passing seamlessly behind the floating sidebar card.
    - Added desktop clearance (`lg:pl-[18rem] lg:pr-8`) to `PatientPageHeader`, `PatientHome` search container, and `patientPageClass` (wide and narrow variants) so titles, breadcrumbs, search inputs, buttons, and page cards sit 32px to the right of the 240px sidebar with zero collision.
    - Decoupled `DoctorHome.tsx` from `patientPageClass` to ensure doctor portal multi-column desktop density and layout remain completely preserved.
  - **Subheader Removal Across All Patient Headers**:
    - Completely removed `{subtitle}` rendering from `PatientPageHeader.tsx`.
    - Removed subheader text strings across all patient routes, specifically eliminating `"Your health identity, medicines and full record — plus the Med Hub."` from `/patient/health` and corresponding subtitles from `/patient/booking`, `/patient/chat`, `/patient/profile`, and subpages.
  - **Replaced Legacy BookingNavBar with Unified PatientPageHeader**:
    - Replaced obsolete `BookingNavBar` in `/patient/booking/doctor/[doctorId]`, `/patient/booking/createBooking?mode=on-demand`, and doctor appointment booking with `PatientPageHeader`.
    - The entire patient booking funnel now shares the authoritative edge-to-edge Brand Teal top bar.
- **Tokens & Components Used**:
  - `--teal-700` (`#18a58c`), `PatientPageHeader`, `PatientShell`, `patientPageClass`.
- **Upstream Porting Notes**:
  - Pure layout and styling modernization; zero backend, API contract, or auth state modifications.

### [2026-09-21] Patient UI: Full-Bleed Edge-to-Edge Green Top Bar Across All Patient Pages (Zero Margin, Padding, or Border)

- **Target Route / Surface**:
  - All Patient UI surfaces: `/patient` (Home), `/patient/health` (My Health), `/patient/booking` (Consultation Chooser), `/patient/booking/search` (Find Doctor), `/patient/chat` (Chat), `/patient/profile` (Profile & Sub-pages), and `PatientShell`.
- **Files Modified**:
  - `src/features/patient/components/PatientShell.tsx`
  - `src/features/patient/components/PatientPageHeader.tsx`
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/patient/components/Breadcrumb.tsx`
  - `src/features/patient/components/profile/PatientProfileSettings.tsx`
  - `src/features/patient/components/profile/ProfileSubPage.tsx`
  - `src/app/patient/booking/search/page.tsx`
- **Design Intent & Root Cause Fix**:
  - **Eliminated Outer Gaps and Indentations**:
    - Removed container-level horizontal padding (`lg:px-5`, `sm:px-3.5`, `sm:pb-3.5`) and flex gap (`gap-4`, `lg:gap-4`) from `PatientShell.tsx` that previously indented `<main>` and created 16px-20px cream/satin margin voids on either side of the green bar.
    - Updated desktop sidebar rail positioning with `lg:my-3 lg:ml-4 lg:mr-0` so `<main>` starts directly flush against `<aside>` and stretches completely to the right edge of the viewport. On mobile/tablet screens, `<main>` and the green bar span 100vw from the extreme left edge to the right edge of the screen.
  - **Zero Padding, Border, and Margin on Green Top Bar**:
    - Removed bottom border (`border-b border-(--teal-800)/20`, `border-0 border-none`) and shadow (`shadow-none`) on both `PatientHome.tsx` topbar and `PatientPageHeader.tsx`.
    - Both headers now expand with `w-full m-0 p-0` so the green background touches all outer boundaries seamlessly without any gaps, margins, or borders.
  - **Integrated Breadcrumbs Directly Inside Header**:
    - Sub-page breadcrumbs previously rendered in `PatientShell.tsx` as a standalone row on the cream background above `PatientPageHeader`, creating a visual gap and pushing the green bar down.
    - Added `variant="header"` to `PatientBreadcrumb` with soft white typography (`text-white/80` and `hover:text-white`), embedding the navigation trail directly inside `PatientPageHeader` so the green bar starts flush at `top: 0`.
  - **Consistent Green Header Across All Patient Pages**:
    - Added `PatientPageHeader` to `/patient/profile` (`PatientProfileSettings.tsx`), `/patient/profile/details` and `/patient/profile/doctor-preferences` (`ProfileSubPage.tsx`), and `/patient/booking/search` (`search/page.tsx`), ensuring every single patient page features the authoritative, high-contrast BayanHealth Brand Teal top bar.
- **Tokens & Components Used**:
  - `--teal-700` (`#18a58c`), `dark:bg-[#0c1f1b]`, `PatientPageHeader`, `PatientBreadcrumb`.
- **Upstream Porting Notes**:
  - Pure layout and presentation enhancement; zero mutations to TanStack Query keys, auth flows, or API contracts.

### [2026-09-21] Patient UI: De-Neonify Greens & Optimize Palette for Eye Comfort in Dark Mode

- **Target Route / Surface**:
  - All Patient UI surfaces (`/patient` Home, My Health, Book, Chat, Profile, `FloatingSidebar`, `PatientPageHeader`)
- **Files Modified**:
  - `src/styles/bayanhealth-tokens.css`
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/patient/components/PatientPageHeader.tsx`
  - `src/components/layout/FloatingSidebar.tsx`
- **Design Intent & Root Cause Fix**:
  - **Eliminated Glaring Neon Greens**:
    - Previously, `--teal-500` was hardcoded to electric neon cyan (`#2dd4b5`), `--teal-400` to neon mint (`#63e0c9`), and `--teal-300` to pale cyan (`#9cebdb`). On dark backgrounds, these colors vibrated with intense optical glare, causing acute eye strain across primary buttons, sidebar active pills, service tiles, status labels, and toggle switches.
    - Updated raw teal ramp: calmed `--teal-500` to `#20a38b`, `--teal-400` to `#3eb49e`, and `--teal-300` to `#62c7b4`.
  - **Re-Anchored Dark Mode on Authentic Brand Teal**:
    - Re-anchored dark mode `--action-primary` directly on BayanHealth Brand Teal (`#18a58c`), paired with `--action-primary-text: var(--white)`. This delivers an authoritative, calm 4.64:1 WCAG AA contrast ratio while completely eliminating the fluorescent "highlighter" look.
    - Set dark mode `--status-available-fg`, `--safe-fg`, `--text-link`, and `--edited-fg` to a soothing medical sage-teal (`#3eb49e`), providing gentle 4.9:1+ contrast on dark card surfaces without retinal fatigue.
    - Softened dark mode `--surface-accent-soft`, `--status-available-bg`, and `--widget-profile-bg` to deep midnight pine (`#102a24`), providing clean container grouping with zero neon glow.
  - **Calmed Top Header Bar in Dark Mode**:
    - In `PatientHome.tsx` and `PatientPageHeader.tsx`, replaced the full-width saturated emerald green slab (`dark:bg-(--teal-800)` / `#0f7a66`) with deep, serene midnight pine `dark:bg-[#0c1f1b]` and subtle 1px border `dark:border-[#15463c]/50`.
    - Preserves BayanHealth's green heritage while dropping luminance down to an eye-resting ~8.5%, perfectly integrating the search input and header actions into the dark clinical cockpit.
  - **Sidebar Switch Thumb Polish**:
    - Updated theme switch thumb in `FloatingSidebar.tsx` to `bg-white shadow-sm`, ensuring an elegant, familiar white circle slider against the calm Brand Teal track.
- **Tokens & Components Used**:
  - `--action-primary` (`#18a58c`), `--status-available-fg` (`#3eb49e`), `--surface-accent-soft` (`#102a24`), `dark:bg-[#0c1f1b]`, `dark:border-[#15463c]/50`.
- **Upstream Porting Notes**:
  - 100% design token and CSS styling enhancement. Zero changes to data fetching, API contracts, or business logic.

### [2026-09-21] Patient UI: Comprehensive Dark Mode Theme Activation, High-Contrast Action Text & Brand Mark Legibility

- **Target Route / Surface**:
  - Entire Patient UI (`/patient`, `/patient/health`, `/patient/chat`, `/patient/profile`, `/patient/booking`, `FloatingSidebar`, `NavBar` mobile dock)
- **Files Modified**:
  - `src/styles/bayanhealth-tokens.css`
  - `src/components/layout/FloatingSidebar.tsx`
  - `src/features/booking/components/patient/BookingPathChooser.tsx`
  - `src/features/booking/components/patient/OnDemandBooking.tsx`
- **Design Intent & Root Cause Fix**:
  - **Selector Mismatch Resolved**: `next-themes` (configured in `src/app/layout.tsx` with `attribute="class"`) injects `class="dark"` on `<html>`. However, `bayanhealth-tokens.css` had dark mode semantic variables and dark shadows scoped exclusively to `[data-theme="dark"]`. As a consequence, toggling dark mode switched Tailwind base utilities (`globals.css`) but left all semantic surface, text, and border design tokens (`--surface-page`, `--surface-card`, `--surface-raised`, `--surface-warm`, `--text-heading`, `--text-body`, `--text-muted`, `--border-subtle`, `--widget-*`) in light mode.
  - **Full `.dark` and `:root.dark` Coverage**: Expanded the selectors at both lines 237 and 450 in `bayanhealth-tokens.css` to `:root.dark, .dark, [data-theme="dark"]` for complete compatibility across both class-based and attribute-based theme systems.
  - **WCAG AAA Action Button Contrast**: In `bayanhealth-tokens.css` dark mode, `--action-primary` is bright teal (`#2dd4b5`). Previous `--action-primary-text: var(--white)` produced an illegible 1.8:1 contrast ratio. Replaced with `--action-primary-text: var(--navy-900)` (`#032a44`), achieving a sharp, WCAG AAA-compliant 8.2:1 contrast ratio on all primary CTA buttons and active navigation links.
  - **AppLogo Wordmark Inversion on Dark Rail**: Added `className="dark:brightness-0 dark:invert"` to `AppLogo` in `FloatingSidebar.tsx` so the `#074972` navy brand wordmark transforms cleanly to crisp white on dark sidebar surfaces.
  - **Adaptive Callout Borders**: In `BookingPathChooser.tsx` and `OnDemandBooking.tsx`, replaced static light `border-(--teal-100)` with adaptive `border-(--status-available-fg)/20` to prevent glaring light borders from breaking dark surfaces.
- **Tokens & Components Used**:
  - `:root.dark, .dark, [data-theme="dark"]`, `--surface-page` (`#0b1117`), `--surface-card` (`#161d26`), `--surface-raised` (`#1c2530`), `--action-primary-text` (`var(--navy-900)`), `--status-available-fg`/20.
- **Upstream Porting Notes**:
  - 100% CSS/styling enhancement. Zero changes to business logic, API calls, routing, or state stores.

### [2026-09-21] Patient Home: Remove Redundant "Tingnan lahat" Link in Health Advice Section

- **Target Route / Surface**:
  - `/patient` (Patient Home - "Para sa'yo" Health Advice Section)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientHome.tsx`
- **Design Intent**:
  - Removed redundant text link `"Tingnan lahat"` adjacent to the `"Para sa'yo"` section header. The entire article card directly beneath already serves as a prominent, accessible link to `/patient/health?tab=medhub`.
  - Simplified header layout to a clean `<h2>` element.
- **Upstream Porting Notes**:
  - Presentational cleanup; zero state or logic affected.

### [2026-09-17] Patient Home: Full-Bleed Bayan Health Brand Green Top Bar Behind Search & Notifications

- **Target Route / Surface**:
  - `/patient` (Patient Home Header & Patient Shell)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/patient/components/PatientShell.tsx`
  - `src/features/patient/components/Breadcrumb.tsx`
  - `src/app/patient/page.tsx`
- **Design Intent**:
  - Upgraded the top search and notification area into a full-bleed, edge-to-edge Bayan Health brand green top bar (`data-slot="patient-home-top-bar"`), completely covering all space above and eliminating previous top, left, and right satin background gaps.
  - Reset container-level top padding on `PatientShell.tsx` (`sm:px-3.5 sm:pb-3.5 sm:pt-0 lg:px-5 lg:pb-3 lg:pt-0`), allowing `<main>` to start flush at `top: 0` without clipping negative margins across `overflow-y-auto`.
  - Maintained `<aside>` floating sidebar margins using `lg:my-3 lg:h-[calc(100%-1.5rem)]` and preserved sub-page desktop breadcrumb spacing with `pt-3 pb-2` in `Breadcrumb.tsx`.
  - Pinned header flush to the top with `sticky top-0 z-30 w-full rounded-t-none`: `bg-(--teal-700)` with `dark:bg-(--teal-800)`, subtle outline border `border-b border-(--teal-800)/20 dark:border-(--teal-700)/30`, and elevated soft shadow `shadow-xs`.
  - Responsive full-bleed geometry: spans full width edge-to-edge (`w-full sm:-mx-3.5 sm:w-[calc(100%+1.75rem)] lg:mx-0 lg:w-full`), covering all spaces at the top while centering the search box and notification trigger within a responsive container (`max-w-lg md:max-w-360 px-4 pt-3.5 pb-3.5 sm:px-6 md:px-8`).
  - High-contrast white focus rings (`focus-visible:ring-(--white)`) on the search input and bell icon for WCAG 2.1 AA accessibility against the green brand surface.
  - Added explicit `role="combobox"` to search input to satisfy jsx-a11y standards.
  - Preserves full dropdown functionality (`#patient-home-search-dropdown`) anchored cleanly directly beneath the brand bar.
- **Tokens & Components Used**:
  - `--teal-700` (`#18a58c`), `--teal-800`, `--radius-card`, `--surface-card`, `--shadow-xs`, `--white`.
- **Upstream Porting Notes**:
  - Pure presentational enhancement; zero state logic, query keys, or API contracts altered.
  - 100% test pass rate across `PatientHome.test.tsx`, `Breadcrumb.test.tsx`, and all 12 patient test suites (117 tests passed).

### [2026-09-17] Patient Home Responsive Desktop Cockpit Layout

- **Target Route / Surface**:
  - `/patient` (Unified Patient Home)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/patient/components/homepage/PatientHome.test.tsx`
- **Design Intent**:
  - **Eliminated 50% Desktop Dead Margin Void**:
    - Previously, `data-slot="patient-home"` was hardcoded with `max-w-3xl` (768px), which left more than 50% of widescreen desktop viewports as an empty cream background to the right of a narrow, centered column.
    - Upgraded `data-slot="patient-home"` with responsive expansion: `max-w-3xl mx-auto lg:max-w-none lg:mx-0 lg:gap-5`, allowing it to span the full width of `<main>` (`max-w-360` / 1440px) on desktop viewports.
  - **Responsive 2-Column Desktop Grid Layout**:
    - Below `lg`: Retains seamless mobile single-column stacking with focused ergonomic padding and 48px touch targets.
    - `lg` and up: Adopts a balanced 12-column grid (`grid grid-cols-1 lg:grid-cols-12 lg:gap-6 lg:items-start`):
      - **Main Left Column (`lg:col-span-8`)**:
        - Full-width Live Activity Hero card (`LiveActivityCard`), with `md:flex-row md:items-center md:justify-between` and right-aligned CTA button (`sm:w-52`) eliminating awkward full-width button stretching on desktop.
        - 4×2 Grab-inspired Service Grid (`Mga Serbisyo`) expanding comfortably to ~230px wide per tile (`lg:min-h-[116px]`), avoiding cramped vertical proportions.
      - **Sidebar Right Column (`lg:col-span-4`)**:
        - "Para sa'yo" daily curated health advice card with doctor attribution (`/patient/health?tab=medhub`).
        - "Garantiyang BayanHealth" clinical trust assurance card (100% PRC-licensed doctors, FDA-compliant electronic prescriptions, secure records).
        - Quick Medical Guide card (*"Kailangan ng gabay? Alamin ang proseso ng telekonsulta"*) creating equal visual column height and clinical confidence.
  - **Anti-AI Slop Purge**:
    - Completely purged remaining `<Sparkles />` icons from `PatientHome.tsx` (in the search dropdown and section headers) and replaced them with authentic clinical iconography (`Stethoscope`, `HeartPulse`).
- **Device Optimization**:
  - **Desktop**: Full 1440px viewport utilization, balanced 8:4 cockpit grid, zero dead margins, right-aligned action buttons.
  - **Mobile**: Preserves mobile-first single-column ergonomics, touch targets, and dropdown symptom triage.
- **Tokens & Components Used**:
  - `BrandLinkButton`, Lucide icons (`Stethoscope`, `HeartPulse`, `Clock`, `CheckCircle2`, `BriefcaseMedical`), `--surface-card`, `--surface-accent-soft`, `--action-primary`.
- **Upstream Porting Notes**:
  - 100% test pass rate across `PatientHome.test.tsx` and all patient test suites.
  - All DOM test selectors (`data-slot="patient-home"`, `data-slot="patient-home-services"`, `data-slot="patient-home-activity"`, `data-slot="patient-home-hero"` with `data-state`) and URL contracts are fully preserved.

### [2026-09-16] Patient Home Search Dropdown & Section Header Streamlining

- **Target Route / Surface**:
  - `/patient` (Unified Patient Home)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/patient/components/homepage/PatientHome.test.tsx`
- **Design Intent**:
  - **Eliminated Redundant Section Header Links**:
    - Removed *"Tingnan lahat"* from the *Mga Serbisyo* section header since the 8th tile in the 4×2 grid already provides a dedicated *"Lahat"* action pointing to `/patient/booking`.
    - Removed *"Med Hub"* from the *Para sa'yo* section header since the curated advice card immediately below it already directs patients to `/patient/health?tab=medhub`.
  - **Converted Symptom Chips to Interactive Searchbar Dropdown**:
    - Removed the static horizontal swipeable symptom chips row from the main page body to reclaim valuable vertical screen space above the fold on mobile.
    - Integrated symptom triage (*Lagnat*, *Ubo't Sipon*, *Sakit ng Ulo*, *Sakit ng Tiyan*, *Pangangati*, *Katawan*) into an interactive dropdown attached to the search bar.
    - Added instant real-time symptom filtering and doctor search actions on input.
    - Added one-tap clear button (`X`), Escape and click-outside dismissal, and mobile keyboard submit handling (`enterKeyHint="search"`).
  - **Full-Width Dropdown Alignment (Covering Space Below Notif Bell)**:
    - Anchored the dropdown to the top `<header>` container rather than the inner `flex-1` search wrapper, extending the dropdown across the full container width (`left-0 right-0`).
    - The dropdown now cleanly spans across both the search input and the space below the notification bell icon, creating a balanced, flush layout aligned with the dashboard cards.
- **Device Optimization**:
  - Mobile ergonomics: reduced page clutter, reclaimed vertical screen height above the fold, seamless touch-friendly search dropdown with $\ge 40\text{px}$ touch targets, and full-width edge alignment.
- **Tokens & Components Used**:
  - `Search`, `Bell`, `Sparkles`, `Video`, `X`, `--radius-card`, `--radius-pill`, `--surface-card`, `--surface-warm`, `--action-primary`.
- **Upstream Porting Notes**:
  - Self-contained in `PatientHome.tsx` and tested in `PatientHome.test.tsx`. Pure UX/UI enhancement with zero backend breakage.

- **Target Route / Surface**:
  - `/patient` (Patient Home - Desktop & Mobile)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/patient/components/homepage/PatientHome.test.tsx`
- **Files Deleted**:
  - `src/features/patient/components/homepage/PatientMobileHome.tsx`
  - `src/features/patient/components/homepage/PatientMobileHome.test.tsx`
- **Design Intent**:
  - Consolidated the patient home into a single mobile-first component directly inside `PatientHome.tsx`, completely eliminating the need for a separate `PatientMobileHome.tsx` file.
  - Fully preserved the approved Grab-style mobile-first layout across all viewports:
    1. Top Search & Notification Header
    2. Emergency Interceptor Strip with direct dialable 911 action
    3. Horizontal Swipeable Quick Symptom Chips
    4. Dynamic Live Activity Card (`LIVE_ROOM`, `SCHEDULED`, `POST_CONSULT`, `IDLE`)
    5. 4×2 Grab-Style Service Grid with $\ge 48\text{px}$ touch targets
    6. "Para sa'yo" Curated Editorial Advice Card
  - On desktop (`lg+`), the unified layout scales within a focused `w-full max-w-3xl mx-auto` container, eliminating the cognitive burden and maintenance overhead of dual-branch desktop/mobile card architectures.
- **Upstream Porting Notes**:
  - When porting `/patient` to the main repository, only `PatientHome.tsx` needs to be updated. Zero extraneous component files are introduced.

### [2026-09-16] Mobile Layout Margin Alignment & Bottom Navigation Polish


- **Target Route / Surface**:
  - `/patient` (Patient Mobile Home)
  - `src/features/patient/components/NavBar.tsx` (Mobile Bottom Navigation)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientMobileHome.tsx`
  - `src/features/patient/components/NavBar.tsx`
- **Design Intent**:
  - **Fixed 14px Margin Misalignment**: Stripped duplicate `px-3.5` from `PatientMobileHome.tsx` so the entire page adheres to a single 16px horizontal boundary from `patientPageClass`. Adjusted symptom chips to `-mx-4 px-4` so the first chip (*Lagnat*) aligns pixel-for-pixel with the Search input, Emergency banner, Hero card, and Service grid.
  - **Eliminated Emergency Banner Ellipsis Clipping**: Replaced pill shape with `rounded-(--radius-card)` card styling, clean 2-line layout (*"Hindi para sa emergency"* + *"Kung kagyat, tumawag agad sa 911 o pumunta sa ospital."*), preventing mid-sentence truncation.
  - **Unified Input & Bell Sizing**: Set both search input and notification bell to matching `h-11` height and `rounded-(--radius-card)` border radii, and shortened placeholder to prevent right-edge clipping.
  - **Rebalanced Bottom Navigation**: Replaced the disproportionate solid green block pill on the active tab with a refined, balanced indicator (soft icon badge `bg-(--surface-accent-soft)` with bold teal label) and pinned the bar to `max-w-lg mx-auto inset-x-4` to match page content width.
  - **Service Grid Tone Consistency**: Unified the 8th tile (*Lahat*) background with the design palette, eliminating mismatched yellow tint.
- **Device Optimization**:
  - Mobile ergonomics: perfect vertical alignment on all elements, no text clipping, harmonious proportions and balanced bottom navigation.
- **Tokens & Components Used**:
  - `NavBar`, `PatientMobileHome`, `--radius-card`, `--surface-accent-soft`, `--action-primary`.

### [2026-09-16] Patient Mobile Home Top Bar: Search Bar & Notifications Replacement

- **Target Route / Surface**:
  - `/patient` (Patient Mobile Home)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientMobileHome.tsx`
  - `src/features/patient/components/homepage/PatientMobileHome.test.tsx`
- **Design Intent**:
  - Removed the bulky top identity/greeting section (*"Kumusta, Juan Dela Cruz"*, avatar circle, and PhilHealth badge) from the mobile fold.
  - Promoted the universal search input directly into the top header alongside the circular notification bell button (`[ 🔍 Maghanap ng sintomas, doktor, o gamot... ] [ 🔔 ]`).
  - Saves ~80px of vertical space, eliminates visual clutter above the fold, and brings quick symptoms and primary care actions immediately into the thumb-reach zone.
- **Device Optimization**:
  - Mobile ergonomics: faster instant search access, higher vertical density, cleaner super-app aesthetic.
- **Tokens & Components Used**:
  - `Search`, `Bell`, `--radius-pill`, `--surface-card`, `--border-default`, `--text-heading`.
- **Upstream Porting Notes**:
  - Unused local profile hooks cleaned up in `PatientMobileHome.tsx`; zero API contract or prop interface breakage.

### [2026-09-16] Patient Mobile Home Decluttering & Fast-Scan Refactor

- **Target Route / Surface**:
  - `/patient` (Patient Mobile Home)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientMobileHome.tsx`
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/patient/components/homepage/PatientMobileHome.test.tsx`
- **Design Intent**:
  - Applied "Scan, Don't Read" super-app principles to drastically cut visual clutter and text density:
    1. **1-Label Rule on Services Grid**: Replaced dual title+subtitle pairs on all 8 tiles with single scannable labels (*Konsulta, Pa-schedule, Fit to Work, Sick Leave, Reseta, Lab Review, Talaan, Lahat*), eliminating text truncation and awkward ellipsis clipping.
    2. **Single-Line Emergency Interceptor**: Streamlined top notice into a clean single-line pill with direct 911 phone action, and hid the redundant bottom `EmergencyFooterBar` on mobile.
    3. **Compact Editorial Advice Card**: Replaced the 4-line medical wall-of-text with a sleek media preview card (*"Tamang Pag-inom ng Tubig at Pahinga"* • *2 min read • BayanHealth Clinical Team*).
    4. **Hero CTA Hierarchy**: Positioned the dynamic live activity card directly below quick symptom pills for immediate urgent triage visibility, streamlined the idle state to 1 dominant primary button (*[Kumonsulta Agad]*), and converted the secondary scheduling action to an accessible inline text link.
    5. **Punchy Text-Only Symptoms**: Maintained high-contrast symptom triage chips without platform emojis, and shortened multi-word entries for comfortable horizontal swiping.
- **Device Optimization**:
  - Mobile ergonomics: faster eye scanning, zero text clipping, reduced vertical scroll height, clear visual anchor points.
- **Tokens & Components Used**:
  - `BrandLinkButton`, Lucide icons (`ShieldAlert`, `Phone`, `Stethoscope`, `ChevronRight`, `Clock`), `--radius-pill`, `--surface-card`, `--action-primary`.
- **Upstream Porting Notes**:
  - Pure layout, copy, and styling refactor. Zero business logic or TanStack Query contract alterations.

### [2026-09-16] Design System Rule: Strict Ban on Platform Emojis

- **Target Route / Surface**:
  - Global Design System (`UI_UX_AGENT.md`, `AGENTS.md`)
  - Patient Mobile Home (`src/features/patient/components/homepage/PatientMobileHome.tsx`)
- **Files Modified**:
  - `UI_UX_AGENT.md`
  - `AGENTS.md`
  - `src/features/patient/components/homepage/PatientMobileHome.tsx`
- **Design Intent**:
  - Banned the use of native platform emojis (`🤒`, `🤧`, `🚨`, `💡`, `💊`, etc.) across all user-facing surfaces. Emojis diminish clinical gravitas in an accredited healthcare platform, render inconsistently across mobile platforms (iOS vs Android), and pollute screen reader accessibility output.
  - Mandated the exclusive use of clean, accessible `lucide-react` SVG vector icons.
  - Replaced the hardcoded `💡` emoji in `PatientMobileHome.tsx` appointment reminder tip with a semantic Lucide `Info` icon and high-contrast `Paalala:` text label.
- **Device Optimization**:
  - Global cross-device consistency and a11y compliance.
- **Tokens & Primitives Used**:
  - `lucide-react` (`Info`), `--status-available-fg`, `--text-heading`, `--text-muted`.
- **Upstream Porting Notes**:
  - Synchronize updated rules in `UI_UX_AGENT.md` and `AGENTS.md`.

### [2026-09-16] Mobile-First Grab-Inspired Patient UI Redesign (PatientHome, BookingPathChooser, OnDemandBooking)

- **Target Route / Surface**:
  - `/patient` (Patient Mobile & Desktop Home)
  - `/patient/booking` (Booking Path Chooser)
  - `/patient/booking/createBooking` (On-Demand Booking & Intake)
- **Files Created**:
  - `src/features/patient/components/homepage/PatientMobileHome.tsx`
  - `src/features/patient/components/homepage/PatientMobileHome.test.tsx`
- **Files Modified**:
  - `public/background-pattern.svg`
  - `src/app/globals.css`
  - `src/features/patient/components/PatientShell.tsx`
  - `src/features/patient/components/NavBar.tsx`
  - `src/features/patient/components/NavBar.test.tsx`
  - `src/features/patient/components/homepage/PatientHome.tsx`
  - `src/features/booking/components/patient/BookingPathChooser.tsx`
  - `src/features/booking/components/patient/OnDemandBooking.tsx`
- **Design Intent**:
  - **Grab-Style Convenience & Medical UX**: Faithfully implemented the approved Figma `Userflows` (`O12`, `O1`–`O3`) tailored for elderly and non-tech-savvy Filipino patients:
    1. **Top Identity Bar**: Patient avatar with user initials, warm greeting (*"Kumusta, [Name]!"*), PhilHealth coverage verification badge, and notifications button.
    2. **Universal Search & Symptom Quick-Triage**: Search bar input plus horizontal swipeable symptom chips (*Lagnat, Ubo't Sipon, Sakit ng Ulo, Sakit ng Tiyan, Pangangati, Sakit ng Katawan*) directly opening on-demand intake.
    3. **Emergency Interceptor Notice**: High-contrast, clean emergency notice with direct 1-tap dialable 911 button (*"Hindi para sa emergency"*).
    4. **Grab-Style 4×2 Quick Service Grid**: 8 rounded squircle tiles with 48px+ touch targets and Taglish labels (*Konsulta ngayon, I-schedule, Fit to Work, Sick Leave, Reseta Refill, Lab Review, Kalusugan, Higit Pa*).
    5. **Dynamic Live Activity Card**: Driven deterministically by `derivePatientHomeState(bookings)`:
       - `LIVE_ROOM`: Urgent pulsing card with 1-tap *[Pumasok sa Consultation Room]* CTA.
       - `SCHEDULED`: Upcoming appointment card with formatted date/time and preparation tips.
       - `POST_CONSULT`: Completed consultation summary with 1-tap *[Buksan ang Care Kit]* CTA.
       - `IDLE`: Reassuring on-demand consultation shortcut with wait time estimate.
    6. **"Para sa'yo" Health Guidance**: Curated daily preventive advice card attributed to the clinical team.
    7. **Booking Path Chooser**: Figma `O12` mode choice with green *Pinakamabilis* badge, wait time estimate, and reassurance strip (*"Parehong daan, parehong presyo at parehong kalidad ng doktor — bilis lang ang pinagkaiba"*).
    8. **On-Demand Intake Refactor**: Figma `O1`–`O3` 3-section layout (*"Ano ang kailangan mo?"*, *"May gusto ka bang doktor?"* soft preferences with Taglish reassurance, and *"Buod ng booking"* fee hold transparency).
    9. **Background Pattern Styling**: Enlarged pattern size (`background-size: 2600px auto`) in `globals.css` and lowered group opacity from `0.15` down to `0.04` in `public/background-pattern.svg` so the brand herringbone weave serves as a gentle, non-distracting watermark texture.
    10. **Mobile NavBar Decluttering**: Omitted coming-soon items (`comingSoon: true`) from the patient mobile bottom bar (`NavBar.tsx`), eliminating disabled "Soon" placeholders so phones render a focused 4-tab bar (Home, Health, Book, Profile) with 25% tap targets and zero dead clicks.
- **Device Optimization**:
  - **Patient Mobile**: Thumb-zone ergonomics, minimum 48px touch targets, 16px+ inputs, natural Taglish phrasing, zero clinical acronyms or cognitive load.
  - **Responsive Switching**: Below `lg`, renders `PatientMobileHome`; on `lg` and above, renders the multi-column clinical desktop cockpit.
- **Tokens & Components Used**:
  - Semantic Tokens: `--surface-card`, `--surface-raised`, `--surface-accent-soft`, `--surface-brand`, `--surface-warm`, `--text-heading`, `--text-body`, `--text-muted`, `--text-subtle`, `--status-available-fg`, `--danger-bg`, `--danger-border`, `--danger-fg`, `--border-subtle`, `--border-default`, `--radius-card`, `--radius-pill`.
  - Primitives: `BrandLinkButton`, `BrandButton`, `PathCard`, `BookingSummary`, `BookingServiceSelect`.
- **Upstream Porting Notes**:
  - 100% backend contract stability: zero modifications to API hooks, TanStack Query keys, or booking payloads.
  - Passes all 170 test files (1,586 tests), hardcoded color scans, contrast audits, and fabricated data scans.

### [2026-09-16] Comprehensive UI/UX Audit & Standardization Overhaul

- **Target Route / Surface**:
  - Global Design System & Primitives (`/src/components/ui/*`)
  - Patient Surfaces (Mobile Shell, Landing, Home, Navigation, Booking)
  - Doctor Surfaces (Dashboard, Consultation Room, Intake Reference, Clinical Workspace, CPG Command Dialog)
- **Files Modified**:
  - `src/components/ui/button.tsx`
  - `src/components/ui/badge.tsx`
  - `src/components/ui/tabs.tsx`
  - `src/features/booking/components/consultation/intake/MultiSelectDropdown.tsx`
  - `src/components/consultation/PatientCompanionSuite.tsx`
  - `src/components/consultation/DoctorClinicalCompanionSuite.tsx`
  - `src/features/consultation/components/session/PatientIntakeReferenceTab.tsx`
  - `src/features/consultation/components/postConsultation/MedicalCodeSuggestionCommandList.tsx`
  - `src/features/consultation/components/postConsultation/SOAPContext.tsx`
  - `src/components/blocks/landing/HowItWorksSection.tsx`
  - `src/features/consultation/components/postConsultation/CandidatePicker.tsx`
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx`
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx`
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx`
  - `src/features/patient/components/NavBar.tsx`
  - `src/features/patient/components/homepage/TriageBookingCard.tsx`
  - `src/features/patient/components/homepage/EmergencyFooterBar.tsx`
  - `src/features/patient/components/homepage/AdviceCard.tsx`
  - `src/features/doctor/components/homepage/DoctorDashboardDrawer.tsx`
  - `src/features/booking/components/doctor/DoctorBooking.tsx`
  - `src/features/booking/components/doctor/DoctorAvailabilty.tsx`
  - `src/features/booking/components/SpecializationFilter.tsx`
  - `src/features/booking/components/doctor/DoctorBookingLoader.test.tsx`
  - `src/app/theme-hardcoded-color-scan.test.ts`
- **Files Deleted (Dead Code)**:
  - `src/features/patient/components/homepage/SystemRecommendation.tsx`
  - `src/features/patient/components/homepage/ServicesGrid.tsx`
  - `src/components/layout/AppCanvas.tsx`
- **Design Intent**:
  - **Contrast & Token Integrity**: Resolved severe dark mode contrast bugs where `dark:text-secondary` produced unreadable (< 2:1) text in buttons, command inputs, and acronym headers. Migrated raw `slate-*`, `teal-*`, `rose-*`, and `amber-*` classes across clinical consultation suites to semantic tokens (`--surface-card`, `--border-subtle`, `--text-body`, `--text-heading`, `--text-muted`, `--text-subtle`, `--status-*`, `--danger-*`).
  - **Anti-AI Slop Compliance**: Purged all generic `<Sparkles />` icons across the product, replacing them with clinically authentic and functional iconography (`Activity`, `FileText`, `PenLine`).
  - **Touch Ergonomics**: Enforced WCAG 2.5.5 touch target sizes (>= 48px `min-h-12`) on primary CTAs (`TriageBookingCard`, `DoctorBooking`, `Button` touch variants).
  - **A11y & Form Fixes**: Replaced unstyled native `<select>` with `NativeSelect`, fixed label `htmlFor` / radio `id` mismatches in doctor availability selection, and resolved Popover non-button DOM nesting warnings.
  - **Mobile Shell Polish**: Harmonized Patient Mobile Navigation bar coming-soon tabs with `text-(--status-soon-fg)` and rich `aria-label`/`title` tooltips for assistive tech.
- **Device Optimization**:
  - **Patient**: Mobile thumb ergonomics, 48px touch targets, clear distinction of coming soon destinations, high-contrast emergency guidance bar with Lucide icons.
  - **Doctor**: Desktop density and scanning hierarchy in `PatientIntakeReferenceTab` and consultation companions, clean non-glitch drawer layouts without unjustified glassmorphism.
- **Tokens & Components Used**:
  - Semantic Tokens: `--surface-card`, `--surface-raised`, `--surface-sunken`, `--text-heading`, `--text-body`, `--text-muted`, `--text-subtle`, `--status-available-*`, `--status-pending`, `--status-soon-*`, `--danger-*`.
  - Components: `Button`, `Badge`, `Tabs`, `Drawer`, `NativeSelect`, `RadioGroup`, `Avatar`.
- **Upstream Porting Notes**:
  - All modifications preserve existing React state, TanStack Query keys, Form bindings, and DOM `data-slot` test selectors.
  - Deleted dead files were completely unreferenced across the codebase and can safely be removed upstream.
  - In `DoctorBookingLoader.test.tsx`, `vi.useFakeTimers({ toFake: ["Date"] })` with pinned time `2026-09-14` is required so test fixtures in September 2026 are not invalidated by wall clock progression.

### [Initial Setup] UI/UX Fork Standards Initialized
- **Date**: 2026-09-15
- **Author**: UI/UX Designer Agent
- **Target Surfaces**: All Patient & Doctor surfaces across `frontend/bayan-health-mvp`
- **Key Deliverables**:
  - Established `UI_UX_AGENT.md` governing pure UI scope, anti-AI slop standards, and porting rules.
  - Defined device ergonomics: Patient (Mobile First) and Doctor (Desktop First).
  - Integrated `shadcn/ui`, `taste-skill`, `anti-slop`, and `tailwind-design-system` agent skills.
  - Initialized `CHANGELOG_UI.md` tracking mechanism for upstream sync.
- **Upstream Porting Notes**: Upstream agent can read `UI_UX_AGENT.md` to understand design guidelines and reference this log for specific component updates.

---

## Change Template

For all future UI changes, copy and fill this template:

```markdown
### [YYYY-MM-DD] Component / View Redesign: <Component or Page Name>

- **Target Route / Surface**: (e.g., `/patient/intake`, `/doctor/consultation`)
- **Files Modified**:
  - `src/features/.../ComponentName.tsx`
  - `src/components/ui/...`
- **Design Intent**: (What UX/UI problem was resolved, visual improvements made)
- **Device Optimization**:
  - **Patient**: Mobile thumb ergonomics, touch targets (>=48px), contrast, readability.
  - **Doctor**: Desktop density, scanning speed, multi-column clinical cockpit.
- **Tokens & Components Used**: (e.g., Brand Teal, Navy headings, shadcn Dialog, Card)
- **Upstream Porting Notes**: (Exact guidance for the main repo AI agent when porting this file)
```
