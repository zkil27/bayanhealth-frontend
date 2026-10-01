# BayanHealth UI/UX Changelog (V2)

All design, layout, styling, and UX modifications made in this fork must be logged here.  
This document serves as the active single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository, superseding the original [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

> **Note**: For historical entries prior to 2026-09-26, refer to the archived [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

---

## Log Entries

### [2026-10-01] SOAP Summary Strip: Balanced Subjective / Objective Columns

- **Target Route / Surface**: Doctor post-consultation workspace, SOAP summary strip
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/SoapSummaryCards.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - Vitals wrapped as a free flow of pills, leaving SpO₂ orphaned on a second row, and the S/O divider was only as tall as the shorter column.
  - Desktop (`lg`): Objective column is a fixed `25rem` and vitals sit in a 2×2 grid (Temp/BP, HR/SpO₂); Subjective takes the remaining width; columns stretch so the divider spans the full card height. Mobile keeps the wrapping flow.
- **Upstream Porting Notes**: Class-only change, no logic or data changes.

### [2026-10-01] Root Body: Remove Document-Level Scroll on iOS Safari (Double Scroll)

- **Target Route / Surface**: All patient routes on mobile Safari (seen on `/patient/booking`)
- **Files Modified**:
  - `src/app/layout.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - `<body>` used `min-h-screen` (`100vh`, the large viewport on iOS), while `PatientShell` is `h-[100dvh]`. The document was taller than the shell, so the page scrolled at document level *and* inside `<main>`. The inner scroller's bottom edge then sat above the fixed bottom nav, clipping the last card.
  - Changed to `min-h-dvh` so the document matches the visible viewport and only `<main>` scrolls.
- **Upstream Porting Notes**: One class. `min-height` only, so non-shell pages that scroll the document are unaffected.

### [2026-10-01] Patient Shell: Page Content No Longer Shrinks Under Bottom Nav

- **Target Route / Surface**: `/patient/booking/createBooking` (Consult Now) and any patient page using a `min-h-full` root
- **Files Modified**:
  - `src/features/patient/components/PatientShell.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - `<main>` is a flex column and its page roots use `min-h-full`. An explicit `min-height` disables the flex item's automatic content minimum, so the root could shrink to viewport height and its bottom padding no longer extended the scroll area. The last card (emergency notice) stayed hidden behind the mobile nav.
  - Added `[&>*]:shrink-0` on `<main>` so page roots keep their content height and the existing bottom clearance scrolls into view.
- **Upstream Porting Notes**: Pure layout change, one class. No logic or contract changes.

### [2026-10-01] Mobile Intake Bottom Sheets: Single Scroll Container

- **Target Route / Surface**: `/patient/booking/getBooking/[bookingId]` intake, mobile bottom sheets (Related Symptoms, medical-history multi-selects)
- **Files Modified**:
  - `src/components/ui/custom-bottom-modal.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/ConcernSafetyStep.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/MultiSelectDropdown.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - `CustomBottomModal` wrapped its children in `overflow-y-auto`, and both intake sheets nested a second scroller inside it (`max-h-[60vh] overflow-y-auto` and `max-h-[50dvh] overflow-y-auto`). On mobile that produced two independently scrolling regions in one sheet, with scroll chaining between them.
  - The modal body is now the only scroller (`min-h-0 flex-1 overflow-y-auto overscroll-contain`). Inner `max-h`/`overflow` removed.
  - New optional `footer` prop pins the **Done** button below the scrolling body (safe-area padded), so it stays reachable without a second scroller.
- **Tokens & Primitives Used**: `--border-subtle`, `--action-primary`, `env(safe-area-inset-bottom)`.
- **Upstream Porting Notes**: Pure UI/layout change. `footer` is additive and optional; other `CustomBottomModal` consumers are unaffected.

### [2026-10-01] Patient App Shell Viewport Scrollability & Mobile Bottom Navigation Clearance

- **Target Route / Surface**: `/patient/booking` (`BookingPathChooser.tsx`), `/patient/booking/search` (`search/page.tsx`), `/patient/booking/createBooking` (`OnDemandBooking.tsx`), `/patient/booking/doctor/[doctorId]` (`DoctorBooking.tsx`, `page.tsx`), `/patient` (`PatientHome.tsx`), `/patient/chat` (`PatientChatList.tsx`), `/patient/health` (`PatientHealthView.tsx`), `/patient/profile` (`PatientProfileSettings.tsx`, `ProfileSubPage.tsx`), App Shell (`PatientShell.tsx`, `PatientPage.tsx`)
- **Files Modified**:
  - `src/features/patient/components/PatientShell.tsx` [MODIFIED]
  - `src/features/patient/components/PatientPage.tsx` [MODIFIED]
  - `src/features/booking/components/patient/BookingPathChooser.tsx` [MODIFIED]
  - `src/features/booking/components/patient/OnDemandBooking.tsx` [MODIFIED]
  - `src/features/booking/components/doctor/DoctorBooking.tsx` [MODIFIED]
  - `src/app/patient/booking/search/page.tsx` [MODIFIED]
  - `src/app/patient/booking/doctor/[doctorId]/page.tsx` [MODIFIED]
  - `src/features/patient/components/homepage/PatientHome.tsx` [MODIFIED]
  - `src/features/patient/components/chat/PatientChatList.tsx` [MODIFIED]
  - `src/features/patient/components/health/PatientHealthView.tsx` [MODIFIED]
  - `src/features/patient/components/profile/PatientProfileSettings.tsx` [MODIFIED]
  - `src/features/patient/components/profile/ProfileSubPage.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Resolved Mobile Viewport Scroll Lock & Emergency Disclaimer Occlusion**:
    - Previously, on the patient consultation booking screen (`/patient/booking`), patients on mobile and tablet devices could not scroll down to the bottom of the page. The critical emergency warning (*"Hindi para sa emergency — kung nakakaranas ka ng matinding sintomas, tumawag sa 911 o pumunta sa pinakamalapit na ER"*) and the **"Call 911"** action button were obscured behind the fixed mobile bottom navigation bar (`NavBar.tsx`).
    - In `PatientShell.tsx`, `<main>` had `lg:overflow-y-auto`, which unintentionally omitted vertical overflow scrolling on mobile viewports (`< lg`), while wrapped in parent containers that had `overflow-hidden`.
    - Enabled `overflow-y-auto` across all breakpoints on `<main>` with safe clearance (`pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4`).
  - **Standardized Mobile Bottom Safe-Area Clearance across Patient Column (`patientPageClass`)**:
    - Updated `patientPageClass` in `PatientPage.tsx` from default `pb-8`/`pb-12` (which ended beneath the 64px–98px fixed bottom navbar) to `pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:pb-12 lg:pb-8`.
    - Removed rigid `h-full min-h-0 pb-4` constraints across `BookingPathChooser.tsx`, `OnDemandBooking.tsx`, `DoctorBooking.tsx`, `PatientChatList.tsx`, `PatientHealthView.tsx`, `PatientProfileSettings.tsx`, `ProfileSubPage.tsx`, and `PatientHome.tsx`, upgrading them to fluid `min-h-full` containers so that content expands naturally and outer scroll height calculations preserve the full bottom margin.
  - **Enhanced Mobile Touch Ergonomics**:
    - Guaranteed at least 24px–32px of clean visual breathing room between the bottom-most interactive elements (e.g., Call 911, Submit booking, or Disclaimer notes) and the floating mobile bottom navigation bar on all iOS and Android form factors, including devices with home-indicator gesture bars (`env(safe-area-inset-bottom)`).
- **Tokens & Primitives Used**: `calc(6rem+env(safe-area-inset-bottom,0px))`, `min-h-full`, `overflow-y-auto`, `patientPageClass`.
- **Upstream Porting Notes**: Pure UI/UX layout adjustment. Zero changes to API endpoints, data models, or backend contracts.

---

- **Target Route / Surface**: `/patient`, `/consultation/room/[bookingId]`, `/patient/booking/createBooking`, `/patient/booking/getBooking/[bookingId]`, App-wide (`PatientShell.tsx`)
- **Files Modified / Added**:
  - `src/lib/patient/activeConsultationStorage.ts` [NEW]
  - `src/features/patient/components/ActiveConsultationBanner.tsx` [NEW]
  - `src/lib/patient/patientHomeState.ts` [MODIFIED]
  - `src/features/patient/components/homepage/PatientHome.tsx` [MODIFIED]
  - `src/features/consultation/components/session/ConsultationRoom.tsx` [MODIFIED]
  - `src/features/patient/components/PatientShell.tsx` [MODIFIED]
  - `src/features/booking/components/patient/OnDemandBooking.tsx` [MODIFIED]
  - `src/features/booking/components/patient/PatientBookingDetail.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Hero Fallback to Generic "Kailangan mo ng doktor ngayon? Kumonsulta Agad"**:
    - Previously, when an on-demand consultation was in-flight, `patientHomeState.ts` sorted on-demand bookings (with `scheduledAt: undefined`) as `Infinity`, pushing them behind old scheduled appointments. Furthermore, when `status === "confirmed"`, it rendered a static "Paparating na Konsulta" card with "Time pending" and a tiny "Tingnan" button.
    - Added first-class `ON_DEMAND_WAITING` and `UNFINISHED_INTAKE` states in `patientHomeState.ts`. Recent on-demand bookings are sorted by descending `updatedAt`/`createdAt` so active encounters always take priority over distant calendar appointments.
    - Updated `LiveActivityCard` in `PatientHome.tsx` with high-contrast, attention-commanding recovery cards:
      - `LIVE_ROOM`: Displays *"Nagsimula na ang iyong konsulta ... Naghihintay si Dr. [Name]"* with a prominent **"Bumalik sa Consultation Room"** button.
      - `ON_DEMAND_WAITING`: Displays *"Kasalukuyang bukas ang iyong telekonsulta / Aktibo ang iyong request"* with pulsing indicator and **"Pumasok sa Waiting Room / Bumalik sa Status ng Konsulta"** CTA.
      - `UNFINISHED_INTAKE`: Displays *"Hindi Pa Natatapos na Konsulta"* with **"Ipagpatuloy ang Booking"** CTA.
  - **Zero-Latency Client-Side Session Recovery (`activeConsultationStorage`)**:
    - Created lightweight `activeConsultationStorage.ts` to track active consultation metadata in `localStorage` across room entry, booking creation, and status transitions.
    - `PatientHome.tsx` immediately reconciles with local storage on mount, preventing any flash of the generic `IDLE` state while network queries resolve or if React Query cache is stale.
  - **In-Room Accidental Navigation Guard**:
    - Added standard browser `beforeunload` guard in `ConsultationRoom.tsx` during live calls, preventing accidental swipe gestures or tab closures from dropping the call without confirmation.
    - Added an explicit "Pumunta sa Dashboard" button in `PreConsultHeader` for patients to navigate safely while waiting.
  - **Omnipresent Rejoin Banner across Patient Routes (`ActiveConsultationBanner`)**:
    - Mounted `<ActiveConsultationBanner />` in `PatientShell.tsx` so patients exploring other tabs (`/patient/health`, `/patient/records`, etc.) during an active consultation always have a sticky 1-tap **"Bumalik sa Konsulta"** button in their viewport.
  - **Query Cache Invalidation & Freshness**:
    - Invalidate `["patient-home-bookings"]` immediately upon booking creation in `OnDemandBooking.tsx` and upon consult completion in `ConsultationRoom.tsx`. Set `refetchOnMount: "always"` and reduced `staleTime` on Patient Home bookings query.
  - **React Rules of Hooks Hardening in `PatientBookingDetail.tsx`**:
    - Positioned active consultation synchronization `useEffect` strictly at top of component alongside query declarations, before any conditional `isLoading` or `error` early return statements, eliminating Turbopack/Next.js hook order drift warnings.
- **Device Optimization**: Mobile-first touch ergonomics (48px+ targets), iOS Safari gesture resilience, desktop clinical layout.
- **Tokens & Primitives Used**: Bayan Teal, Emerald live pulse indicators, Lucide SVG icons (`Video`, `Clock`, `ArrowRight`, `X`), `BrandLinkButton`, `cn`.
- **Upstream Porting Notes**: UI and client persistence only. 100% preservation of backend contracts, Daily Call Object handling, and OpenAPI schemas. Zero breaking changes.

---

### [2026-10-01] Clinical Documents Mobile Layout & Cramped Text Remediation

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (`DocumentSheetModal.tsx`, `DocumentSheetHeader.tsx`, `PrescriptionSheet.tsx`, `MedicalCertificateSheet.tsx`, `DiagnosticRequestSheet.tsx`, `ClinicalReferralSheet.tsx`, `PatientCareGuideSheet.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetHeader.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PrescriptionSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/MedicalCertificateSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DiagnosticRequestSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/ClinicalReferralSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PatientCareGuideSheet.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Mobile Document Viewport Cramping**:
    - Previously, `DocumentSheetModal` applied `p-6` around `ClinicalDocumentSheet`'s `p-8`, compounding to 112px of total horizontal padding. On 360px–390px mobile screens, this left as little as 248px for the physical document canvas, severely crunching table columns, physician headers, and patient demographics.
    - Reduced outer canvas padding to fluid `p-2.5 sm:p-6 md:p-10` and inner sheet padding to `p-4 sm:p-8 md:p-12`.
  - **Responsive Patient Demographic Grids**:
    - Converted rigid, inflexible multi-column patient detail blocks to mobile-first responsive stacks (`grid-cols-1 sm:grid-cols-2`), ensuring patient name, DOB, age, sex, address, and allergies wrap cleanly without horizontal truncation.
  - **Scrollable Prescription & Diagnostic Tabular Data**:
    - Wrapped tabular medication rows (`PrescriptionSheet.tsx`) in an overflow-safe horizontal scroll container (`min-w-[500px] sm:min-w-full`), preventing drug dosage and frequency columns from squishing together on small devices.
  - **Fluid Diagnostic, Referral, and Certificate Layouts**:
    - Stacked clinical recommendations, referral urgency rows, and diagnostic tests vertically on mobile while preserving high-density side-by-side clinical layouts on desktop.
- **Device Optimization**: Mobile viewports (<640px) prioritized with generous breathing room, preserving exact 8.5x11 portrait paper proportions on desktop and print.
- **Tokens & Primitives Used**: `Dialog`, `Button`, `FileText`, `Printer`, `cn`, Bayan Brand Navy (`--navy-700`) & Teal (`--teal-700`).
- **Upstream Porting Notes**: UI styling improvements across document sheets. 100% preservation of `ClinicalDocumentArtifact` model contracts and print media queries. Zero backend breaking changes.

---

### [2026-10-01] Patient Intake Form: iOS Safari Auto-Zoom Remediation & Fluid Typography Scaling

- **Target Route / Surface**: `/patient/booking/createBooking`, `/intake/[token]` (`PersonDataSection.tsx`, `IntakeChoice.tsx`, `Teleconsult.tsx`, `DateTimePicker.tsx`)
- **Files Modified**:
  - `src/components/blocks/profile/PersonDataSection.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/IntakeChoice.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/services/Teleconsult.tsx` [MODIFIED]
  - `src/features/booking/components/DateTimePicker.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **iOS Safari Auto-Zoom Remediation**:
    - Enforced strict `text-base` (16px) minimum font size on mobile viewports (<640px) across vital sign inputs, date pickers, chief complaint narrative fields, and optional symptom textareas, eliminating iOS Safari's disruptive auto-zooming on input focus.
    - Paired with `sm:text-sm` (14px) and proportional input heights (`h-12 sm:h-11`, `min-h-[90px] sm:min-h-[85px]`) on desktop screens to retain clinical cockpit density.
  - **Ergonomic Touch Targets for Intake Choices**:
    - Upgraded `ConditionTile`, `ChoiceCard`, and `SegmentedToggle` touch targets to a minimum height of 48px (`min-h-12 sm:min-h-11`) with active tactile feedback (`active:scale-[0.98]`), facilitating accurate interaction for patients with motor limitations.
- **Device Optimization**: Mobile-first for patient inputs; crisp desktop scaling.
- **Tokens & Primitives Used**: `Input`, `Textarea`, `Button`, `CalendarIcon`, `cn`.
- **Upstream Porting Notes**: Styling and typography adjustments only. 100% preservation of form validation, zod schemas, and submission payloads.

---

### [2026-10-01] Post-Consultation: Authorized Artifact History Modernization & Specimen Lightbox Inspection

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (`AuthorizedArtifactHistory.tsx`, `AssessmentFirstWorkspace.tsx`, `DocumentSheetModal.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/AuthorizedArtifactHistory.tsx` [NEW]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Replaced Raw HTML Details List with Dedicated Clinical Audit Component**:
    - Previously, authorized artifact history was rendered as an unstyled `<details data-slot="artifact-history">` HTML list with basic text bullets.
    - Extracted and designed `<AuthorizedArtifactHistory />`, featuring semantic document icons (`Pill`, `Award`, `FlaskConical`, `Scan`, `BookOpen`, `FileText`), status badges (`Active Baseline`, `Superseded / Stale`), Assessment version tags (`Assessment vX · rev Y`), and relative timestamps.
  - **Interactive Historical Specimen Inspection**:
    - Added an "Inspect specimen" action button on every historical artifact row that opens `<DocumentSheetModal />` with `isHistoricalArchive={true}`.
    - Integrated an amber audit notice banner (*"Historical Artifact Archive — Read-Only Clinical Audit Mode"*) and a distinct `HISTORICAL ARCHIVE (READ-ONLY)` badge in `DocumentSheetModal.tsx`, clearly demarcating superseded drafts from active legal records while allowing doctors to review earlier clinical formulations.
- **Device Optimization**: Desktop clinical cockpit multi-column list, responsive stacking on mobile viewports.
- **Tokens & Primitives Used**: `History`, `Eye`, `Archive`, `Pill`, `Award`, `FlaskConical`, `Scan`, `BookOpen`, `FileText`, `AlertCircle`, `CheckCheck`, `Button`, `Spinner`, `cn`.
- **Upstream Porting Notes**: Drop-in replacement for the raw `<details data-slot="artifact-history">` block in `AssessmentFirstWorkspace.tsx`. `CdsProtectedArtifact` fully satisfies `ClinicalDocumentArtifact` for modal preview. Zero CDS contract or backend changes.

---

### [2026-10-01] On-Demand Booking: Authentication Guarding, Unhandled Error Remediation & Sign-In Flow

- **Target Route / Surface**: `/patient/booking/createBooking` (`OnDemandBooking.tsx`)
- **Files Modified**:
  - `src/features/booking/components/patient/OnDemandBooking.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Next.js `AUTH_REQUIRED` Unhandled Exception Crash**:
    - Previously, `onSubmit` called `await submit(...)` without a `try/catch` wrapper. When an unauthenticated user or guest submitted the form, `useCreateBooking` threw `new Error("AUTH_REQUIRED")`, which surfaced as a fatal Next.js dev runtime crash overlay.
    - Wrapped `await submit(...)` in `try/catch` to match `DoctorBooking.tsx` conventions.
  - **Seamless Authentication Guidance & Bounced Redirect**:
    - Integrated `useIdToken` to detect unauthenticated state up-front.
    - If a user clicks submit while unauthenticated, they are cleanly redirected to `/signIn?next=${encodeURIComponent("/patient/booking/createBooking")}` so they can sign in and immediately return without losing their place.
    - Added an inline, high-contrast amber callout above the CTA button clarifying that sign-in is required before joining the queue.
  - **Error Feedback & Anti-AI Slop Polish**:
    - Rendered explicit error feedback (`role="alert"`) beneath the CTA button for network and booking failures.
    - Replaced native platform emoji (`⚡`) with Lucide vector icon (`Zap`).
- **Device Optimization**: Mobile and desktop friendly error alerts and thumb-zone CTA notices.
- **Tokens & Primitives Used**: `useIdToken`, `LogIn`, `Zap`, `BrandCtaButton`, `cn`.
- **Upstream Porting Notes**: Component-scoped updates to `OnDemandBooking.tsx`. 100% preservation of `useCreateBooking` mutation contract and idempotency keys. Zero backend breaking changes.

---

### [2026-10-01] Patient Live Consult & Mobile iOS Safari Modernization: Viewport Resiliency, Senior-Friendly Controls, & 1-Tap Lobby

- **Target Route / Surface**: `/consultation/room/[bookingId]`, `/patient/booking/getBooking/[bookingId]` (`ConsultationRoom.tsx`, `ConsultationVideo.tsx`, `PatientCompanionSuite.tsx`, `ConsultationChatPanel.tsx`, `PatientBookingDetail.tsx`, `ConfirmationStep.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/session/ConsultationRoom.tsx` [MODIFIED]
  - `src/features/media/components/ConsultationVideo.tsx` [MODIFIED]
  - `src/components/consultation/PatientCompanionSuite.tsx` [MODIFIED]
  - `src/features/consultation/components/session/ConsultationChatPanel.tsx` [MODIFIED]
  - `src/features/booking/components/patient/PatientBookingDetail.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/ConfirmationStep.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **iOS Safari Viewport & Keyboard Resiliency**: Added `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` clearance across consultation room containers. Implemented auto-collapse video behaviour (`h-[74px]` compact audio stage) when the chat composer is focused on mobile, preventing on-screen keyboard from crushing the chat thread.
  - **Senior-Centered In-Call Controls**: Enlarged touch targets to 52px with high-contrast semantic color coding. Replaced ambiguous icon slashes with explicit text pills (`Mic On` / `Muted` in alert red, `Camera On` / `Camera Off`). Added dedicated `SwitchCamera` button for physical symptom inspections, and added a safe `Leave Call` action in the thumb zone with accidental-disconnect confirmation.
  - **Frictionless 1-Tap Pre-Join Lobby**: Replaced alarming third-party warning (`ShieldAlert`) with a reassuring clinical privacy badge (`ShieldCheck`). Eliminated nested confirmation modals in favor of a direct 1-tap `Connect with Doctor` action, while preserving inline camera/mic test.
  - **Clean Single-Host Video Lifecycle**: Removed redundant inline `<ConsultationVideo>` mount from `PatientBookingDetail.tsx`, ensuring Daily Call Object is mounted exclusively within the dedicated `/consultation/room/[bookingId]` surface.
  - **Companion Suite Typography & Contrast**: Raised tab typography to 14px with conversational labels (`Doctor Chat`, `My Health Info`, `Next Steps`). Enhanced vital signs contrast and failsafe banner readability.
- **Device Optimization**: Mobile-first for patients (iOS Safari home bar avoidance, large 48px–52px tap targets, thumb-zone controls).
- **Tokens & Primitives Used**: `Button`, `Dialog`, `Tabs`, `Alert`, `SwitchCamera`, `ShieldCheck`, `PhoneOff`, `Mic`, `MicOff`, `Video`, `VideoOff`, `Maximize2`, `cn`, Bayan Teal (`--teal-700`), Brand Navy (`--navy-700`).
- **Upstream Porting Notes**: 100% UI and UX layout improvements. All existing props and TanStack Query / Daily Call Object contracts preserved. Zero backend or API contract changes.

### [2026-10-01] Patient Intake Flow: Mobile Web (iOS Safari) & Senior-Centered Ergonomic Modernization

- **Target Route / Surface**: `/book` (`BookingWizard.tsx`, `IntakeNavFooter.tsx`, `IntakeChoice.tsx`, `DateTimePicker.tsx`, `PersonDataSection.tsx`, `MultiSelectDropdown.tsx`, `MedicalHistoryStep.tsx`, `ConcernSafetyStep.tsx`, `Teleconsult.tsx`, `PainAssessmentStep.tsx`, `ReviewConsentStep.tsx`, `AdditionalInfoSection.tsx`)
- **Files Modified**:
  - `src/features/booking/components/consultation/BookingWizard.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/IntakeNavFooter.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/IntakeChoice.tsx` [MODIFIED]
  - `src/features/booking/components/DateTimePicker.tsx` [MODIFIED]
  - `src/components/blocks/profile/PersonDataSection.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/MultiSelectDropdown.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/MedicalHistoryStep.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/ConcernSafetyStep.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/services/Teleconsult.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/PainAssessmentStep.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/ReviewConsentStep.tsx` [MODIFIED]
  - `src/features/booking/components/consultation/intake/AdditionalInfoSection.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated iOS Safari Auto-Zoom Bug**:
    - Enforced standard `text-base` (16px) minimum font size across all text inputs, textareas, search bars, and numeric inputs (`COMPACT_INPUT`, vital inputs, DOB, search, chief complaint, etc.), completely eliminating iOS Safari's disruptive auto-zooming on focus that previously distorted wizard layouts and trapped elderly users.
  - **Solved iOS Caret Selection & Magnifier Trap**:
    - Removed `select-none` from the outer wizard container (`BookingWizard.tsx`), restoring iOS Safari's native text selection, loupe magnifier, cursor placement, and native copy-paste capabilities critical for elderly users editing narrative fields.
  - **Home Indicator Occlusion & Safe Area Inset Support**:
    - Updated `IntakeNavFooter.tsx` with dynamic safe-area insets (`pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]`), preventing fixed sticky action buttons ("Next: Symptoms", "Confirm and continue") from overlapping the iPhone home indicator swipe bar.
  - **Senior-Friendly Native Date of Birth Picker**:
    - In `DateTimePicker.tsx`, integrated a native `<input type="date">` overlay on mobile viewports while preserving the rich desktop calendar popover. Mobile Safari triggers the familiar native iOS scroll wheel picker with high-contrast text and tactile feedback, eliminating awkward calendar grid navigation for seniors.
  - **Cognitive Load Reduction via Upfront Pain Gate (Step 4)**:
    - Redesigned `PainAssessmentStep.tsx` to lead with a high-contrast binary gate: *"Are you currently experiencing physical pain or bodily discomfort?"*
    - Patients answering "No" are spared the cognitive exhaustion of evaluating 0–10 numeric ratings and multi-question PQRST symptom matrices. If "Yes", the step unfolds a tactile 0–10 scale with 48px touch targets, colored severity badges, and accessible descriptive anchors.
  - **Touch Target Ergonomics (>= 48px)**:
    - Expanded touch targets across `ChipButton`, `ConditionTile`, `ChoiceCard`, `SegmentedToggle`, and red-flag urgency buttons to a minimum height of 48px (`min-h-12`) with active touch response feedback (`active:scale-[0.98]`), accommodating tremors and reduced motor precision.
  - **Plain, Dignified English Localization (Tagalog Clean-up)**:
    - Remediated broken or out-of-place Filipino translations (e.g., *"Kwento ang iyong nararamdaman"*, *"hinanakit"*, *"Ang Simula"*, *"Ang Nararamdaman"*) in `Teleconsult.tsx` to plain, dignified, and clinically authoritative English (*"Tell us what you are experiencing"*, *"Onset: When did it begin?"*, *"Character: What does it feel like?"*, *"Aggravating/Alleviating: What makes it better or worse?"*).
  - **Anti-AI Slop & Contrast Hardening**:
    - Removed native platform emoji (`❌`) in `AdditionalInfoSection.tsx`, replacing it with a Lucide `X` icon.
    - Upgraded review step consent checkbox to a generous 24px box with readable 14px text and high-contrast clinical card surface.
- **Device Optimization**: Mobile Safari (iOS) priority, safe-area compliance, 48px touch ergonomics, responsive adaptation to desktop.
- **Tokens & Primitives Used**: `--surface-card`, `--border-subtle`, `--surface-brand-soft`, `--navy-700`, `--teal-700`, Lucide icons (`Check`, `ShieldCheck`, `AlertCircle`, `CalendarIcon`, `X`, `ChevronRight`), Tailwind CSS v4 safe-area utilities.
- **Upstream Porting Notes**: Component-scoped modifications only across the 12 intake components. 100% preservation of `bookingWizardSchema`, form state structure, step indices, and submission payload contracts. Zero backend, schema, or API breaking changes.

---

### [2026-10-01] Care Continuity: Save Errors Moved to Toast

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (`CareContinuityPanel.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/CareContinuityPanel.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - Replaced the inline red error banner under the action footer with a Sonner `toast.error` ("Couldn't save the recommendation" + server message as description), matching the existing `toast.success` on save. The card no longer shifts height on failure, and the error is consistent with other consultation panels.
  - Removed the now-unused local `error` state and its resets.
- **Device Optimization**: Toast is viewport-anchored, so feedback stays visible in the thumb/desktop zone regardless of scroll position.
- **Upstream Porting Notes**: UI-only; replace the `error` state and banner with `toast.error(...)` in the `catch` of `save`.

---

### [2026-10-01] Care Continuity: 2-Column Clinical Proportions, Restored Identity, & Calendar Popover Redesign

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (`CareContinuityPanel.tsx`, `calendar.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/CareContinuityPanel.tsx` [MODIFIED]
  - `src/components/ui/calendar.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Restored Authoritative Clinical Identity ("Care Continuity")**:
    - Reverted "Reconsultation & Follow-up" back to authoritative **"Care Continuity"** branding per clinical convention, paired with a clear subtitle: *"Follow-up window & directives for patient re-evaluation"*.
  - **Remediated "Too Flat in Length" Aspect Ratio with a 2-Column Clinical Cockpit**:
    - Previously, condensing the panel into 3 single-line rows across a 1000px container resulted in an awkward, ultra-wide ribbon with a stretched 850px text input and unbalanced negative space.
    - Re-architected the card into a harmonious, desktop-dense **2-column grid** (`grid-cols-1 lg:grid-cols-12 gap-5`):
      - **Left Column (`lg:col-span-5` - Return Interval)**: Structured 3-column tactile grid for quick intervals (`+3 Days`, `+1 Week`, `+2 Weeks`, `+1 Month`, `+3 Months`, and `Custom...`), anchored below by a dedicated **Target Date Feedback Tile** rendering the full formatted date (`EEEE, MMMM d, yyyy`), relative distance badge (`· In 2 weeks`), and quick clear action.
      - **Right Column (`lg:col-span-7` - Clinical Directives & Actions)**: Replaced the overly long single-line input with a comfortable, natural-measure `Textarea` (`min-h-[72px]`), paired with quick clinical directive chips (`+ General follow-up`, `+ Symptom re-check`, `+ Review lab results`, `+ Vital signs check`, `+ Medication review`, `+ Clinical clearance`) and an action footer with dirty state detection.
  - **Calendar Popover UI Redesign & Typography Polish**:
    - Fixed Tailwind CSS v4 `--cell-size` calculation bug in `calendar.tsx` where `--spacing(7)` failed to evaluate, restoring proper cell heights, widths, and navigation alignments.
    - Redesigned `CalendarDayButton` to feature crisp Bayan Teal selected tiles (`bg-(--teal-700) text-white font-bold shadow-xs rounded-lg`), clear hover states (`hover:bg-(--surface-warm-soft)`), and accessible disabled strikes.
    - Remediated header text collision (`Select Target DateToday: Sep 30, 2026`) in the popover by enforcing explicit width (`w-[330px]`), structured header flex spacing with today chip badge, an integrated shortcut jump bar (`+3d`, `+1w`, `+2w`, `+1m`, `+3m`) directly inside the popover, and a confirmation footer with `Done` CTA.
- **Device Optimization**: Balanced 2-column desktop clinical workflow, auto-stacking on mobile viewports.
- **Tokens & Primitives Used**: `Button`, `Textarea`, `Calendar`, `Popover`, `PopoverContent`, `PopoverTrigger`, `CalendarClock`, `CalendarIcon`, `CheckCheck`, `Clock`, `FileText`, `sonner`, `cn`.
- **Upstream Porting Notes**: Component-scoped updates to `CareContinuityPanel.tsx` and `src/components/ui/calendar.tsx`. 100% preservation of `fetchFollowUpRecommendation` and `saveFollowUpRecommendation` API contracts. Zero backend or CDS schema changes.

### [2026-09-30] SOAP Summary Cards: Clinical Triage Highlighting, Typography Scaling, & Narrative Truncation Remediation

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (`SoapSummaryCards.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/SoapSummaryCards.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Clinical Narrative Truncation (`truncate`)**:
    - Replaced the single-line `truncate` with `line-clamp-2` and `text-sm font-semibold text-(--text-heading) leading-snug`, preventing multi-word patient complaints from being hidden behind ellipses.
    - Moved the patient verbatim quotation (`patientVerbatim`) to a dedicated styled row with gentle italic styling, ensuring the patient's authentic voice is preserved and readable.
  - **Clinical Abnormality Triage Highlighting**:
    - Previously, vitals were styled passively as generic grey tags with only biological implausibility checks (`<35 || >41°C`), causing clinically elevated readings (e.g., Fever of 38.2°C) to blend into the background.
    - Introduced structured clinical triage logic (`clinicalTriage`):
      - **Fever / Pyrexia (≥ 38.0°C)** & Elevated (≥ 37.5°C): High-contrast amber badge (`bg-amber-50/90 text-amber-950 border-amber-300 ring-1 ring-amber-300/50`) with `(Fever)` label.
      - **Blood Pressure Triage**: Flags hypertensive (≥ 140/90) and hypotensive (< 90 systolic) readings.
      - **Pulse Pressure Sanity Check**: Catches impossible inverted blood pressure (`systolicBp <= diastolicBp`, e.g. 85/95 mmHg) and flags as `(Unverified)`.
      - **Heart Rate Triage**: Flags tachycardia (> 100 bpm) and bradycardia (< 60 bpm).
      - **Hypoxia Triage (SpO₂)**: Flags low oxygen (< 95%) and critical hypoxia (< 92%) with high-contrast critical status badges (`--danger-fg`, `--danger-bg`, `--danger-border`).
  - **Typography & Ergonomic Legibility**:
    - Vital values upgraded to `text-xs sm:text-[13px] font-bold tabular-nums` to ensure instant scanability at desktop arm's length (24–28 inches).
    - Standardized labels to crisp micro-caps (`text-[10px] font-bold uppercase tracking-wider`).
    - Resolved WCAG 2.1 AA contrast failure on flagged vitals by replacing low-contrast `--status-soon` tokens with high-contrast accessible clinical alerts (> 10:1 ratio).
  - **Responsive Spatial Rebalance & Code Cleanliness**:
    - Rebalanced flex layout to `lg:flex-[1.25]` for Subjective and `lg:flex-1` for Objective with top-alignment (`lg:items-start`), preventing vertical centering mismatch when vitals wrap.
    - Added responsive border divider on mobile/tablet screens (`divide-y divide-(--border-subtle)`).
    - Purged 32 lines of unused dead code (`SummaryCard`).
- **Device Optimization**: Desktop clinical cockpit scanability and mobile touch accessibility.
- **Tokens & Primitives Used**: `--surface-card`, `--border-subtle`, `--surface-brand-soft`, `--navy-700`, `--teal-700`, `--surface-warm-soft`, `--danger-fg`, `--danger-bg`, `--danger-border`, `TriangleAlert`, `Thermometer`, `Gauge`, `HeartPulse`, `Wind`, `cn`.
- **Upstream Porting Notes**: Component-scoped updates to `SoapSummaryCards.tsx`. Zero business logic or CDS contract changes.

### [2026-09-30] Deliverables Deck: Mistaken Document Discard, Tab Close Affordance, & Clinical Void Guardrails

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (`DeliverablesDeck.tsx`, `ArtifactCard.tsx`, `AssessmentFirstWorkspace.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Solved Accidental Document Addition Dilemma**:
    - Previously, when a doctor accidentally added an unneeded deliverable (e.g. clicking "+ Add Document" -> "Lab request" or "Imaging request" when no tests were required), there was no affordance to remove or discard the document. The unneeded draft remained in the deck, cluttered the tab bar, inflated the pending signature count, and triggered warnings upon completing the consultation.
  - **Dual Ergonomic Removal Affordances**:
    - **Card Action Bar (`ArtifactCard.tsx`)**: In the draft card footer alongside `Redraft`, added an accessible, discrete **`Discard draft`** action button (`variant="ghost"` with clinical rose hover tint, `<Trash2 className="size-3.5" />`).
    - **Active Tab Close Trigger (`DeliverablesDeck.tsx`)**: On the active tab, added a subtle, accessible close button (`×`) enabling direct removal from the review checklist.
    - **Generating Cancellation (`DeliverablesDeck.tsx`)**: If a document is still drafting, physicians can click **`Cancel drafting`** directly on the placeholder card.
  - **Clinical Safety Guardrails & Protection**:
    - **Mandatory Core Document Protection**: The core consultation `Plan` is strictly non-discardable (`canDiscard={outputType !== 'plan'}`). Only optional deliverables (`Prescription`, `Medical certificate`, `Lab request`, `Imaging request`, `Patient education`) can be discarded.
    - **Clinical Confirmation Dialog (`AlertDialog`)**: Prevents accidental clicks by presenting a reassuring modal clarifying that the unreviewed draft was never visible to the patient and can be re-added anytime from "+ Add Document".
    - **Signed Deliverable Protection (`Void signature & remove`)**: If an unwanted deliverable was mistakenly batch-signed (e.g. via "Sign all"), physicians can void and remove the signed draft before release with an explicit medicolegal attestation warning.
    - **Instant "Undo" Recovery**: Discarding triggers a high-visibility Sonner toast with an **`Undo`** action that instantaneously restores the draft and re-focuses its tab.
  - **Dynamic State Reconciliation & Lifecycle Integrity**:
    - Discarded deliverables immediately update `deckEntries`, decrease the `X awaiting your signature` badge count, and automatically return to the `+ Add Document` catalog.
    - Excluded from `FinishDocumentationControl` so completion warnings no longer report discarded deliverables.
- **Device Optimization**: Desktop clinical cockpit density and tablet touch targets.
- **Tokens & Primitives Used**: `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `Trash2`, `FileX2`, `X`, `Button`, `sonner`, `cn`.
- **Upstream Porting Notes**: Component-scoped updates across `ArtifactCard.tsx`, `DeliverablesDeck.tsx`, and `AssessmentFirstWorkspace.tsx`. Zero business logic or CDS contract changes.

### [2026-09-30] Deliverables Deck: Add Document Button & Rich Clinical Template Menu Redesign

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (`DeliverablesDeck.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Replaced Faint Dashed Ghost Button with Authoritative Action Trigger**:
    - Previously, the `+ Add Document` trigger rendered as a small (~24px tall) dashed outline pill with no visual weight, looking tentative or like a placeholder element.
    - Redesigned into a confident, solid clinical action button (`h-8 sm:h-8.5 px-3.5 gap-2 rounded-xl border border-(--teal-600)/30 bg-white text-(--teal-800) shadow-2xs hover:bg-(--teal-50)/80`) with an icon tile (`Plus`), bold label, an undrafted count badge (`{undraftedTypes.length}`), and a dropdown chevron indicator.
  - **Expanded & Intuitive Clinical Template Dropdown Menu**:
    - Previously, the dropdown menu was a cramped `w-52` (208px) container with bare single-line text (e.g. `+ Patient education`) providing zero clinical context or description.
    - Expanded menu into a spacious, high-scanability clinical catalog (`w-80 sm:w-88 rounded-2xl border border-(--border-subtle) bg-white p-2 shadow-xl`):
      - **Categorized Header**: `ADD CLINICAL DELIVERABLE` with `<FilePlus2 className="size-4" />` and instructional subtitle.
      - **Rich Clinical Cards**: Each undrafted document template features an interactive card layout with a `size-9.5` semantic icon tile, bold document title (`OUTPUT_LABELS`), and a clinical subtitle (`OUTPUT_DESCRIPTIONS`) explaining its exact scope (e.g. *"Personalized Tagalog/English home care guide & red flags"*, *"Work/school clearance with diagnosis & excused rest dates"*).
      - **Add Action Indicator**: An interactive plus button tile that animates to filled teal on item hover.
      - **Reassuring Clinical Footer**: Context note clarifying that newly drafted documents land in editable draft mode for clinician review and digital signature before patient release.
- **Device Optimization**: Desktop clinical cockpit ergonomics — immediate recognition of available document templates without cognitive guesswork.
- **Tokens & Primitives Used**: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `TOOL_ICONS`, `OUTPUT_LABELS`, `OUTPUT_DESCRIPTIONS`, `cn`.
- **Upstream Porting Notes**: Component-scoped updates to `DeliverablesDeck.tsx`. Zero business logic or CDS contract changes.

### [2026-09-30] Care Continuity Panel: Clinical Layout Redesign, Custom Calendar, & Live Patient Preview

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (`src/features/consultation/components/postConsultation/CareContinuityPanel.tsx` & `AssessmentFirstWorkspace.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/CareContinuityPanel.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Replaced Clunky Native HTML Date Input with Custom Intuitive Calendar Picker**:
    - Previously, a browser-native `<input type="date">` was used, which looked discordant, unbranded, and cumbersome for clinicians to use.
    - Integrated a custom, accessible date picker built on `Calendar` (`react-day-picker`) and `Popover` styled with BayanHealth tokens. Features clear month navigation, disabled past dates (`before: startOfToday()`), relative countdown badges (`"In 7 days · Next Wednesday"`), and shortcut quick actions (`Today`, `+1 Week`, `+2 Weeks`, `Close`).
  - **1-Click Clinical Interval Presets**:
    - Clinicians schedule follow-ups using standard medical intervals. Added one-click preset buttons (`+3 Days`, `+1 Week`, `+2 Weeks`, `+1 Month`, `+3 Months`) that instantly compute the target date, update the calendar, and highlight the active duration.
  - **Rapid Charting Reason Chips**:
    - Added one-click clinical directive suggestion chips (`"Symptom reassessment & recovery check"`, `"Review laboratory & diagnostic test results"`, `"Blood pressure & vital signs recheck"`, `"Medication tolerance & dosage titration"`, `"Post-treatment clinical clearance"`) to accelerate documentation while still permitting free-form textarea editing.
  - **Balanced 2-Column Clinical Layout & Live Patient Mobile Preview**:
    - Eliminated the wide empty white void on desktop by introducing a balanced responsive 2-column grid (`grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]`).
    - The right column features a live **Patient App Preview** card that mockups exactly what the patient will see on their mobile home screen (scheduled follow-up date, countdown chip, attending physician note, directives quote box, and patient booking CTA).
  - **Surface & Hierarchy Harmony**:
    - Enforced uniform 1px solid borders, brand navy and teal accents, elevated card header with semantic icon tile (`size-10 rounded-xl bg-(--teal-50) text-(--teal-700)`), status indicator pills (`Active recommendation` vs `Unsaved changes`), and clear actions (`Save recommendation`, `Clear`).
- **Device Optimization**: Desktop clinical cockpit ergonomics with rapid 1-click presets; stacks responsively on narrower screens.
- **Tokens & Primitives Used**: `Calendar`, `Popover`, `Button`, `Textarea`, `date-fns` (`addDays`, `differenceInCalendarDays`, `format`, `parseISO`, `startOfToday`), `cn`.
- **Upstream Porting Notes**: Component-scoped redesign in `CareContinuityPanel.tsx` with optional `doctorName` passed from `AssessmentFirstWorkspace.tsx`. Zero breaking changes to `fetchFollowUpRecommendation` or `saveFollowUpRecommendation` APIs.

### [2026-09-30] Clinical Document Sheets: Placeholder Information Removal & Authentic Clinical Fallbacks

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (Document preview modal and clinical document sheets in `src/features/consultation/components/documents/`)
- **Files Modified**:
  - `src/features/consultation/components/documents/ClinicalDocumentSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PrescriptionSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetFooter.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetHeader.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/MedicalCertificateSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DiagnosticRequestSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/ClinicalReferralSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PatientCareGuideSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/types.ts` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Enforced "Absent, Never a Placeholder" Principle**: Fabricated patient demographics, credentials, and static condition-specific content were removed from printable clinical document templates to prevent misinformation and maintain clinical authority.
  - **Authentic Patient & Physician Identification**:
    - Replaced hardcoded patient names (`"Maria Teresa D. Reyes"`, `"Maria Santos"`), dates of birth (`"Jan 12, 1997"`), and fake case numbers (`"BH-25-05-20-10245"`) with authentic data from `intake` and `consultationId`, safely defaulting to clinical standard em-dashes (`"—"`) when absent.
    - Replaced fake physician credentials (`"Dr. Andrea M. Santos, MD"`, `"SAMPLE-0000000"`) and fake cursive signatures with authentic physician props or an authentic `"Signature pending attestation"` status indicator.
  - **Replaced "SAMPLE" Badges with Clinical "DRAFT" Lifecycle Stamps**:
    - Updated document headers from `"SAMPLE • NOT VALID"` to `"DRAFT • NOT FINAL"` (`bg-amber-50 text-amber-700 border-amber-600`).
    - Updated verification status badges from `"SAMPLE"` to `"DRAFT"` with amber styling, keeping `"ACTIVE"` / `"VALID"` reserved for signed/released documents.
  - **Dynamic Payloads & Generalized Clinical Instructions**:
    - **Diagnostic Requests**: Removed hardcoded CBC and urinalysis tables; now dynamically renders `labPayload.tests` and `imagingPayload.studies` with a clean `"None requested"` empty state.
    - **Prescriptions**: Removed hardcoded `"14 capsules"` fallback and replaced condition-specific GERD warnings with universal emergency medical advice.
    - **Medical Certificates**: Removed hardcoded `"May 22, 2025"` dates and fake `"Acute Upper Respiratory Tract Infection (URTI)"` fallbacks; now accurately binds to `payload.validFrom`, `payload.validThrough`, and `payload.statement`.
    - **Clinical Referrals**: Replaced hardcoded cough/reflux complaints with structured bindings to `planPayload.summary`, `interventions`, and `followUp`.
    - **Patient Care Guides**: Removed hardcoded Tagalog GERD advice in favor of dynamic mapping over `payload.sections` and `payload.warningSigns`.
- **Device Optimization**: Printable 8.5 × 11 in (Portrait) clinical sheets and responsive on-screen modal inspector.
- **Tokens & Primitives Used**: `DocumentSheetHeader`, `DocumentSheetFooter`, `QRCodeSVG`, `SignaturePreview`.
- **Upstream Porting Notes**: Component-scoped template updates. Zero business logic or CDS schema breakage.

### [2026-09-30] Deliverables Deck: Top Stroke Removal & Semantic Icon Tile Highlight Redesign

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (Deliverables Deck Tab Strip - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx`)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Top Stroke (`border-t-2`)**:
    - Previously, a thick colored top border (`border-t-2 border-t-(--navy-600)` or `border-t-(--gold-500)`) was applied to the active tab to color-code document status. This broke the clean physical folder-tab aesthetic and violated anti-AI slop design principles (one-sided glowing/colored strokes).
    - Removed the top stroke entirely. The active tab now features a crisp, uniform 1px solid border (`border border-(--border-subtle) border-b-0 rounded-t-xl -mb-px z-10 bg-(--surface-card)`), cleanly merging into the document body with subtle elevation (`shadow-[0_-2px_6px_rgba(0,0,0,0.03)]`).
  - **Semantic Icon Avatar Tiles for High-Scanability Status Color-Coding**:
    - Instead of relying on a top border line or raw colored icons, each document tab now anchors its icon inside an authoritative **Semantic Icon Avatar Tile** (`size-6 rounded-md border`):
      - **Draft / To sign**: Amber tile (`bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 border-amber-500/25`)
      - **Signed**: Clinical sky/navy tile (`bg-sky-500/12 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300 border-sky-500/25`)
      - **Released**: Vibrant teal tile (`bg-teal-500/12 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300 border-teal-500/25`)
      - **Outdated / Stale**: Crimson tile (`bg-red-500/12 text-red-700 border-red-500/25`)
      - **Generating**: Purple tile with spinner (`bg-purple-500/12 text-purple-700 border-purple-500/25`)
    - When active, the icon tile is highlighted with an elegant focus ring (`ring-1.5 ring-current/20 shadow-2xs`).
  - **Streamlined Status Pills & Clutter Elimination**:
    - Removed duplicate yellow badges (`[To sign]` + `[Draft · Needs review]`) that previously crowded the active tab.
    - Each tab now displays a single, crisp triage capsule (`To sign`, `Ready to sign`, `Signed`, or `Released`) with clinical iconography (`Clock`, `PenLine`, `Check`).
    - The active tab selectively displays `<AiProvenanceChip />` (`AI draft`) without repeating review copy.
- **Device Optimization**: Desktop clinical cockpit ergonomics — immediate recognition of signed vs. pending documents across ambient clinic lighting.
- **Tokens & Primitives Used**: `TOOL_ICONS`, `AiProvenanceChip`, `cn`, semantic color palettes (`amber`, `sky`, `teal`, `red`, `purple`).
- **Upstream Porting Notes**: Component-scoped updates to `DeliverablesDeck.tsx`. Zero business logic or CDS contract changes.

### [2026-09-30] Clinical Feedback Ergonomics: High-Visibility Rich Sonner Toast Redesign

- **Target Route / Surface**: Global Toaster Notification System (`src/components/ui/sonner.tsx`)
- **Files Modified**:
  - `src/components/ui/sonner.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Overhauled Toast Scale, Typography, and Prominence**:
    - Previously, toasts rendered as small 356px white cards in the bottom-right corner, where they were easily overlooked and obstructed by dev overlays or bottom floating controls. The typography was small (`13.5px`) with a tiny 16px icon.
    - Expanded card width to `--width: 460px` (`w-full sm:w-[460px] max-w-[94vw]`) with balanced padding (`p-4 sm:p-4.5`), bold readable typography (`text-[15px] sm:text-base font-semibold leading-snug`), and an elevated `shadow-xl`.
    - **Eliminated Competing "Double X" Visual Conflict & Added Click-to-Dismiss**:
      - Replaced `OctagonXIcon` (stop-sign with an "X") with `CircleAlertIcon` (`!`), the clinical gold standard for error/danger alerts.
      - Removed the visible close button (`closeButton`) to prevent visual clutter and competing glyph semantics.
      - **Instant Click-to-Dismiss**: Enabled tap/click dismissal anywhere on the toast card (`cursor-pointer select-none hover:opacity-95 active:scale-[0.99]`), removing the need for tedious manual swiping/sliding (`swipeDirections={[]}`).
      - Toasts still auto-dismiss after 5000ms if left untouched.
    - Repositioned toasts by default to `position="top-right"` with a generous 5000ms duration so critical clinical notifications appear clearly at eye-level without collision.
  - **Full-Surface Clinical Semantic Color Architecture**:
    - **Error**: High-visibility clinical crimson wash (`!bg-(--danger-bg) dark:!bg-[#3a1f1f]`, crisp 2px solid border `!border-2 !border-(--danger-border) dark:!border-[#e79a9a]`, and deep red typography `!text-(--danger-fg) dark:!text-[#fca5a5]`).
    - **Success**: Calming Bayan teal theme (`!bg-(--status-available-bg)`, `!border-2 !border-(--teal-600)`, `!text-(--status-available-fg)`).
    - **Warning**: Warm clinical amber theme (`!bg-(--status-soon-bg)`, `!border-2 !border-(--gold-600)`, `!text-(--status-soon-fg)`).
    - **Info**: Brand navy clinical theme (`!bg-(--surface-brand-soft)`, `!border-2 !border-(--border-brand)`, `!text-(--surface-brand)`).
- **Device Optimization**: Desktop clinical cockpit scanability — unmistakable error and status recognition from distance and across different ambient lighting conditions.
- **Tokens & Primitives Used**: `var(--danger-bg)`, `var(--danger-fg)`, `var(--danger-border)`, `var(--status-available-bg)`, `var(--status-available-fg)`, `var(--status-soon-bg)`, `var(--status-soon-fg)`, `var(--surface-brand-soft)`, `var(--border-brand)`, `Sonner`, `Toaster`.
- **Upstream Porting Notes**: Component-scoped styling upgrade in `src/components/ui/sonner.tsx`. Fully backwards-compatible with all `toast.error`, `toast.success`, `toast.warning`, and `toast.info` callers.

### [2026-09-30] Clinical Feedback Ergonomics: Error Banner to Sonner Toast Migration

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (Post-Consultation Assessment-First Clinical Workspace)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Persistent Inline Error Banner**:
    - Previously, operational errors from API actions (e.g. *"The server would not accept this action. Refresh to load current state, then try again."*, signing conflicts, or generation issues) were caught and stored in `error` state, rendering as an intrusive, full-width red/pink `<p role="alert">` banner right above the deliverables deck.
    - This caused disruptive layout shifts (CLS), displaced the active clinical workspace downwards, and stayed on screen until a new action was initiated.
  - **Migrated Operational Errors to Non-Intrusive Sonner Toasts**:
    - Converted all operational error handlers in `run`, `generate`, `amend`, `finalize`, `confirm`, `runCandidateSearch`, and `loadPreview` to fire `toast.error(message)`.
    - Fully removed the inline `<p role="alert">{error}</p>` DOM element from the workspace layout.
    - Scoped `initialLoadError` strictly to catastrophic initial consultation load failures (when `!assessment` cannot mount at all), preserving the full-page empty error guard while making all runtime interaction errors toast notifications.
- **Device Optimization**: Zero Cumulative Layout Shift (CLS) on desktop clinical cockpit during rapid action dispatch.
- **Tokens & Primitives Used**: `toast.error`, `Sonner`, `Toaster`.
- **Upstream Porting Notes**: Component-scoped updates to `AssessmentFirstWorkspace.tsx`. No CDS contract or backend API changes.

### [2026-09-30] Doctor Navigation: Archived In-App Chat Tab

- **Target Route / Surface**: Doctor Navigation Sidebar (`src/components/layout/nav-items.ts`)
- **Files Modified**:
  - `src/components/layout/nav-items.ts` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Archived Doctor Chat Sidebar Item**:
    - Removed the "Chat" navigation tab from `DOCTOR_NAV` so it no longer appears in the desktop navigation rail.
    - Declutters the doctor desktop flight deck to focus clinician attention on essential daily workflows (`Dashboard`, `Calendar`, `Consults`, `Med Ed`, and `Profile`).
  - **Preserved Underlying Routes & Components**:
    - Strict non-destructive archive: all underlying page routes (`src/app/doctor/(homepage)/chat/page.tsx`, `src/app/doctor/(homepage)/chat/layout.tsx`, `src/app/doctor/(homepage)/chat/[bookingId]/page.tsx`) and feature components (`src/features/doctor/components/chat/*`) remain intact on disk.
    - The tab can be reinstated at any time simply by uncommenting the entry in `DOCTOR_NAV`.
- **Device Optimization**: Desktop navigation ergonomics (Doctor) — focused 5-destination rail without unused or secondary communication tabs.
- **Tokens & Primitives Used**: `DOCTOR_NAV`, `SidebarContent`.
- **Upstream Porting Notes**: Single configuration change in `src/components/layout/nav-items.ts`. No routing, API, or data hook alterations.

### [2026-09-30] Clinical Triage Ergonomics: Deliverables Lifecycle Color Coding System

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (Post-Consultation Assessment-First Clinical Workspace)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ProtectedToolsRail.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Visual Ambiguity Between Lifecycle Stages**:
    - Previously, "Signed" and "Released" deliverables both used identical teal color styles (`bg-(--status-available-bg) text-(--status-available-fg)` and `<Check className="size-2.5" />`), while the left rail (`ProtectedToolsRail`) rendered drafted, signed, and released items in undifferentiated teal tints (`bg-(--surface-accent-soft)` / `bg-(--status-available-bg)`).
    - Clinicians scanning under time pressure could not immediately tell which documents were still pending their review & signature, which had been attested and ready to release, and which were already live with the patient.
  - **Tri-State Clinical Semantic Color Architecture**:
    - **Drafted / Not Signed (Action Required)**: 🟡 **Warm Amber** (`var(--status-soon-fg)` / `var(--status-soon-bg)` / `Clock` icon). Applied to tab icons, top-tab indicators (`border-t-2 border-t-(--gold-500)`), tab badges (`Clock` + "To sign"), rail item backgrounds and trailing clock icons, header "N awaiting your signature" pill, and finish warning dialog.
    - **Already Signed (Attested / Ready to Release)**: 🔵 **Brand Navy / Clinical Indigo** (`var(--navy-700)` / `var(--navy-100)` / `PenLine` icon). Applied to tab icons, active tab top indicators (`border-t-2 border-t-(--navy-600)`), tab badges (`PenLine` + "Signed"), rail item icon backgrounds and trailing pen icons, artifact card header badge ("Signed by you"), footer action banner ("Signed · Ready to release"), and finish warning dialog.
    - **Already Released (Complete / Dispatched to Patient)**: 🟢 **Bayan Teal / Emerald** (`var(--status-available-fg)` / `var(--status-available-bg)` / `Check` / `CheckCircle2` icon). Applied to tab icons, active tab top indicators (`border-t-2 border-t-(--teal-600)`), tab badges (`Check` + "Released"), rail checkmark icons, artifact card header ("Released"), and footer sharing timestamp.
    - **Outdated / Stale**: 🔴 **Danger Red** (`var(--danger-fg)` / `var(--danger-bg)` / `AlertCircle` icon + "Outdated").
- **Device Optimization**: High-density desktop clinical triage (Doctor) — instant foveal scanning of document signing state without reading fine print.
- **Tokens & Primitives Used**: `var(--status-soon-fg)`, `var(--status-soon-bg)`, `var(--navy-700)`, `var(--navy-100)`, `var(--status-available-fg)`, `var(--status-available-bg)`, `var(--danger-fg)`, `var(--danger-bg)`, `Clock`, `PenLine`, `Check`, `CheckCircle2`, `AlertCircle`.
- **Upstream Porting Notes**: Component-scoped updates across `DeliverablesDeck.tsx`, `ProtectedToolsRail.tsx`, `ArtifactCard.tsx`, and `AssessmentFirstWorkspace.tsx`. Zero changes to CDS contracts, DynamoDB schemas, or TanStack query hooks.

### [2026-09-30] Clinical Focus Ergonomics: In-Call Documents Preview Removal

- **Target Route / Surface**: `/consultation/room/[id]` (Active Video Consultation Room - Doctor Companion Suite)
- **Files Modified / Deleted**:
  - `src/components/consultation/DoctorClinicalCompanionSuite.tsx` [MODIFIED]
  - `src/features/consultation/components/session/DoctorDeliverablesPreviewTab.tsx` [DELETED]
- **Design Intent & Problem Solved**:
  - **Decommissioned Redundant In-Call "Documents Preview" Tab**:
    - During an active telehealth video consultation, the clinician's foveal focus and working memory should be centered on the patient and active clinical history.
    - Clinical deliverables (prescriptions, medical certificates, lab requests, referrals) are governed, synthesized, signed, and released in the dedicated post-consultation cockpit (`/doctor/post-consultation/[id]`). Displaying mock deliverables inside the live call inspector caused unnecessary cognitive split and redundant controls.
    - Streamlined `DoctorClinicalCompanionSuite` into a focused, balanced 2-tab inspector: **Patient Intake** (submitted safety screen, vitals, baseline history) and **Conversation** (in-call encrypted chat).
- **Device Optimization**: Desktop clinical cockpit cognitive focus and distraction-free in-call ergonomics.
- **Tokens & Primitives Used**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `ClipboardList`, `MessagesSquare`.
- **Upstream Porting Notes**: Component-scoped modification in `DoctorClinicalCompanionSuite.tsx` and deletion of `DoctorDeliverablesPreviewTab.tsx`. No data hooks or session logic affected.

### [2026-09-30] Clinical Feedback Ergonomics: Transient Banner to Non-Intrusive Sonner Toast Redesign

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (Post-Consultation Assessment-First Clinical Workspace)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/components/ui/sonner.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Disruptive Inline Banner Layout Shift (CLS)**:
    - Transient action confirmations (such as "Released. Nothing else was changed.", "Signed...", and "Draft saved...") previously rendered as an inline `<p role="status">` banner across the full width between the assessment actions and the deliverables deck.
    - This caused sudden layout shift (~54px) pushing the active clinical review deck down, consumed precious vertical space in the desktop clinical cockpit, and persisted indefinitely until another async action executed.
  - **Redesigned Feedback into Impeccable Non-Intrusive Sonner Toasts**:
    - Replaced the inline banner with rich, accessible Sonner toasts (`toast.success`, `toast.info`, `toast.warning`, `toast.error`).
    - "Released. Nothing else was changed." now dispatches a crisp `toast.success` notification that communicates state clearly, adheres to clinical desktop ergonomics, and automatically departs without shifting the clinician's workspace view.
    - Finalization and batch signing (`handleBatchSign`) coalesce cleanly with stable toast IDs (`finalize-signature`) to prevent notification spamming.
  - **Enhanced Sonner Toaster Primitive with Authoritative Tokens**:
    - Styled `Toaster` in `src/components/ui/sonner.tsx` with BayanHealth tokens (`--teal-600` / `--teal-400` success checkmarks, `--danger-fg` alerts, `--action-primary` info, `--gold-600` warnings).
    - Preserved dark mode token contract (`--popover`, `--border`, `--popover-foreground`) with zero hardcoded hex values.
- **Device Optimization**: Desktop-first clinical cockpit density (Doctor) — zero layout shifting and maximum vertical information density.
- **Tokens & Primitives Used**: `var(--teal-600)`, `var(--teal-400)`, `var(--action-primary)`, `var(--danger-fg)`, `var(--gold-600)`, `var(--popover)`, `var(--border)`, `var(--shadow-card)`, `toast` (Sonner), `CircleCheckIcon`, `InfoIcon`, `TriangleAlertIcon`, `OctagonXIcon`.
- **Upstream Porting Notes**: Component-scoped updates to `AssessmentFirstWorkspace.tsx`, `DeliverablesDeck.tsx`, and `src/components/ui/sonner.tsx`. No changes to CDS contracts, DynamoDB schemas, or TanStack query hooks.

### [2026-09-26] Clinical Workflow & Visual Hierarchy: Doctorflow Optimization & Guided Sign Queue

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (Post-Consultation Assessment-First Clinical Workspace)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/SoapSummaryCards.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PatientDetails.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactPayloadView.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PatientRail.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PostConsultationSkeleton.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/CareContinuityPanel.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Clinical Ergonomics: Inverted Cockpit Layout ("Canvas & Inspector")**:
    - **Natural Eye Path (Foveal Focus)**: In clinical attestation, the physician's job is to review and sign active legal deliverables, not re-read intake data. Placing Patient Intake on the left forced the doctor's eye to bypass already-known intake cards on every saccade.
    - **Left Action Canvas (70%)**: Dedicated to primary active work—Assessment, SOAP Summary ribbon, and the Deliverables Deck with guided signing. The physician's gaze lands naturally on the work that needs to be finalized.
    - **Right Reference Dock (30%)**: Patient Intake is now docked on the right as a collapsible reference inspector (`lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]` or `[minmax(0,1fr)_3.5rem]` when collapsed). Retains full quick-reference access to patient demographics, safety screenings, and intake survey without obstructing the primary workflow.
    - **Zero Cumulative Layout Shift (CLS)**: Updated `PostConsultationSkeleton` to match the 70/30 left-action / right-inspector layout, and updated collapse/expand toggles to `PanelRightClose` / `PanelRightOpen`.
  - **Clinical Cognitive Ergonomics ("Doctorflow") Alignment**:
    - **Root Cause of Cognitive Overload**: Research into EHR human factors reveals that competing primary buttons, ambiguous tab dots (`•`), and bulky retrospective context (S & O cards) create severe decision fatigue. Clinicians were forced to play "whack-a-mole" across 5 tabs, clicking each individually and hunting for sign buttons.
    - **Guided Review & Sign Stepper**:
      - Replaced ambiguous tab dots (`•`) with explicit status badges on every tab: `[✓ Signed]` (green), `[✓ Released]` (teal), `[Clock To sign]` (amber), `[Drafting]`, `[Outdated]`.
      - Implemented automatic queue progression (`handleFinalize`): Signing a document automatically flips the deck to the next pending item, eliminating manual tab switching.
      - Updated document action buttons to dynamically read `Sign & next →` when additional deliverables remain in the queue, with explicit `Next document →` buttons on signed and released items.
      - Added a quick-jump shortcut: `Next to sign: [Document Name] →` in the deliverables header.
    - **1-Click Batch Attestation ("Sign All Reviewed")**:
      - When multiple drafts exist and the physician has a registered signature specimen, an accessible `Sign all (N)` button appears in the deck header.
      - Opens an `AlertDialog` summarizing all deliverables being attested, applying the stored digital signature to all verified drafts in one click.
    - **Reclaimed Vertical Real Estate (APSO Hierarchy)**:
      - Refactored `SoapSummaryCards` from a bulky two-card vertical block into a sleek, single-row clinical status ribbon (`lg:flex-row lg:items-center`).
      - Compact `S` chip with 1-line chief complaint + inline `O` vital chips (`Temp 38.2°C`, `BP 118/76`, `HR 82`, `SpO2 98%`). Reclaimed ~46px of vertical height, placing the active deliverables deck comfortably above the fold.
    - **Calmed Left Rail False Alarms**:
      - Replaced the large green "Clinical alerts (0)" box and warning triangle with a calm, neutral reassurance strip (`ShieldCheck` + "Safety screening clear: Zero patient-reported red flags").
      - Highlighted positive drug allergies with high-priority danger styling (`border-(--danger-border) bg-(--danger-bg)/20 font-bold text-(--danger-fg)`).
    - **Eliminated One-Sided Stroke Gradients in PlanView**:
      - Replaced `border-l-3 border-l-(--teal-600)` with crisp 1px solid semantic card containers (`border border-(--border-subtle) bg-(--surface-card)`).
    - **Harmonized Encounter Closure Hierarchy**:
      - Updated `FinishDocumentationControl`: When documents remain unsigned, the button steps down to a calm outline button displaying `Finish (N pending)`, keeping primary visual momentum on the active deliverables queue.
      - When all documents are signed and released, it lights up in solid green `Finish documentation ✓`.
- **Anti-AI Slop Compliance**: Zero glowing gradient borders, zero platform emojis (clean Lucide SVG icons only: `ShieldCheck`, `Check`, `Clock`, `ArrowRight`, `PenLine`, `PanelRightClose`, `PanelRightOpen`), crisp 1px solid borders, BayanHealth brand tokens.
- **Tokens & Primitives Used**: `var(--action-primary)`, `var(--teal-700)`, `var(--status-available-bg)`, `var(--status-soon-bg)`, `var(--surface-card)`, `Button`, `AlertDialog`.
- **Upstream Porting Notes**: Changes are completely component-scoped to `src/features/consultation/components/postConsultation/`. All TanStack hooks, CDS contracts, and validation props remain untouched.

---

- **Target Route / Surface**: Global Application Canvas, Root Body, Doctor Cockpit, Patient Portal, Auth (`src/styles/bayanhealth-tokens.css`, `src/app/globals.css`, `public/background-pattern.svg`, `src/app/layout.tsx`, `src/app/doctor/post-consultation/layout.tsx`)
- **Files Modified**:
  - `src/styles/bayanhealth-tokens.css` [MODIFIED]
  - `src/app/globals.css` [MODIFIED]
  - `public/background-pattern.svg` [MODIFIED]
  - `src/app/layout.tsx` [MODIFIED]
  - `src/app/doctor/post-consultation/layout.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PostConsultationSkeleton.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Zero Hardcoded Colors Token Architecture**:
    - **Root Cause of Missing Weave**: The original $3819 \times 978\text{px}$ herringbone vector pattern (`public/background-pattern.svg`) was squashed into a 1:1 square (`background-size: 320px 320px`), reduced to an invisible $4\%$ opacity (`opacity="0.04"`), and contained hardcoded dark teal (`fill="#0b3b43"`), which had zero contrast against dark mode obsidian backgrounds (`#0b1117`).
    - **Neutral Stencil Vector**: Stripped all hardcoded hex colors (`fill="#0b3b43"` $\to$ `fill="currentColor"`) and baked opacities from `public/background-pattern.svg`, converting it into a clean, uncolored alpha stencil. Removed dead filter definitions.
    - **Design System Tokens (`bayanhealth-tokens.css`)**:
      - Light Mode: `--weave-color: var(--navy-700);` (Brand Navy `#074972`) with `--weave-opacity: 0.08;` over `--surface-page`.
      - Dark Mode: `--weave-color: var(--teal-500);` (Clinical Teal `#20a38b`) with `--weave-opacity: 0.05;` over `--surface-page`.
    - **CSS `mask-image` Stacking Engine (`globals.css`)**:
      - Rebuilt `.bg-satin` to use `position: relative; isolation: isolate;` with a `::before` pseudo-element.
      - Applied `background-color: var(--weave-color); opacity: var(--weave-opacity);` masked by `-webkit-mask-image: url('/background-pattern.svg')`.
      - Proportional scaling: `-webkit-mask-size: 960px auto; mask-size: 960px auto;` preserving the natural $3.9:1$ herringbone geometry.
      - Fixed viewport coverage: Configured `body.bg-satin::before { position: fixed; }` so the entire document ground is seamlessly textured without layout shifts or scroll clipping.
  - **Universal Canvas Coverage**: Applied `bg-satin` to `<body>` in `src/app/layout.tsx` and the post-consultation layout (`src/app/doctor/post-consultation/layout.tsx`), unifying all clinician and patient routes under one cohesive cultural tactile surface.
- **Anti-AI Slop Compliance**: Zero glowing gradients or arbitrary hex codes. Authentic Filipino textile watermark rendered with crisp 1px borders and clinical card surfaces floating on top.
- **Tokens & Primitives Used**: `var(--weave-color)`, `var(--weave-opacity)`, `var(--surface-page)`, `var(--navy-700)`, `var(--teal-500)`.

---

### [2026-09-26] Brand Integrity & Dark Mode: Logomark Vector Silhouette Restoration

- **Target Route / Surface**: Global Shell, Floating Navigation Sidebar, Document Headers (`src/components/layout/FloatingSidebar.tsx`, `src/components/primitives/Logo/AppLogo.tsx`, Document Sheets)
- **Files Modified / Created**:
  - `public/BayanHealthLogoWithTextDark.svg` [NEW]
  - `src/components/primitives/Logo/AppLogo.tsx` [MODIFIED]
  - `src/components/layout/FloatingSidebar.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetHeader.tsx` [MODIFIED]
  - `src/features/consultation/components/A4Docs/PrescriptionPagedContent.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Eliminated Destructive CSS Filter Silhouette Bug**:
    - **Root Cause**: `src/components/layout/FloatingSidebar.tsx` applied `className="dark:brightness-0 dark:invert"` to `<AppLogo type="withText" />` to make the word "Bayan" visible against dark backgrounds. Because CSS filters apply globally across the rendered SVG image element, `brightness-0` collapsed every color to `#000000` and `invert` made every pixel `#FFFFFF`. This obliterated the brand artwork, turning the logomark (speech bubble with Brand Teal `#18A58C`, inner Brand Navy `#074972` stethoscope icon, and white `#FFFFFF` highlights) into a flat, washed-out monochrome white blob.
    - **Dedicated Dark SVG Asset (`public/BayanHealthLogoWithTextDark.svg`)**:
      - Authored a high-fidelity SVG where the "Bayan" wordmark path is crisp `#FFFFFF` (white), "Health" remains vibrant Brand Teal (`#18A58C`), and the complete logomark vector (speech bubble, stethoscope stroke, crossbar, and dot highlights) retains full brand coloration and clinical authority.
    - **Intelligent `AppLogo` Component Theme Awareness**:
      - Updated `AppLogo` with a `variant?: "auto" | "light" | "dark"` prop (defaulting to `"auto"`).
      - Under `"auto"`, `AppLogo` renders both light and dark SVGs using zero-flicker Tailwind classes (`dark:hidden` / `hidden dark:block`), switching instantly without JavaScript runtime overhead or layout shifts.
      - Enforced `variant="light"` on printed/paged clinical document sheets (`DocumentSheetHeader.tsx`, `PrescriptionPagedContent.tsx`) so that white paper/A4 sheets always print with the classic Navy/Teal logo regardless of the user's current app theme.
    - Removed `dark:brightness-0 dark:invert` from `FloatingSidebar.tsx`.
- **Anti-AI Slop Compliance**: Replaced destructive full-element CSS filter hacks with authentic multi-colored vector assets that preserve brand equity and design tokens.
- **Tokens & Primitives Used**: BayanHealth Brand Navy (`#074972`), Brand Teal (`#18A58C`), `#FFFFFF`, `AppLogo`.

---

### [2026-09-26] Design System Modernization: Hardcoded Color Audit & CSS Token Replacement

- **Target Route / Surface**: Document Sheets, Consultation Tabs, Patient Shell Headers (`/doctor/post-consultation/[id]`, `/consultation/room/[bookingId]`, `/patient/*`)
- **Files Modified**:
  - `src/features/consultation/components/documents/DocumentSheetHeader.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetFooter.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/MedicalCertificateSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DiagnosticRequestSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/ClinicalReferralSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PatientCareGuideSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PrescriptionSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/session/DoctorDeliverablesPreviewTab.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/SignatureField.tsx` [MODIFIED]
  - `src/features/patient/components/homepage/PatientHome.tsx` [MODIFIED]
  - `src/features/patient/components/PatientPageHeader.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Replaced 100+ Arbitrary Hex Colors with Standard Tokens**:
    - Eliminated hardcoded `#074972` (Brand Navy), `#18a58c` (Brand Teal), `#005f73` (Deep Teal), and `#0c1f1b` across clinical document print sheets, modals, and patient headers.
    - Replaced with authoritative CSS variables from `bayanhealth-tokens.css`: `text-(--navy-700)`, `bg-(--navy-700)`, `border-(--navy-700)`, `text-(--teal-700)`, `bg-(--teal-700)`, `border-(--teal-700)`, `bg-(--teal-800)`, `bg-(--teal-100)/30`, and `dark:bg-(--surface-nav)`.
    - Converted signature canvas drawing in `SignatureField.tsx` to dynamically query computed `--navy-700` token values.
  - **Full Production Compliance**: Verified full build compilation (`npm run build`) and zero hardcoded arbitrary color regressions.
- **Tokens & Primitives Used**: `var(--navy-700)`, `var(--teal-700)`, `var(--teal-800)`, `var(--teal-100)`, `var(--surface-nav)`, `bg-slate-900`.

---

### [2026-09-26] Header Layout & Responsiveness Fix: Post-Consultation "Finish Documentation" Overflow

- **Target Route / Surface**: `/doctor/post-consultation/[id]` (Post-Consultation Assessment-First Clinical Workspace)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/WorkspaceChrome.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PostConsultationSkeleton.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Resolved Header Bar & "Finish Documentation" Overflow**:
    - **Root Cause**: On screen widths <= 1280px (such as 1024px laptops/tablets or split screen viewports), the combined width of the patient context header (Back link + Avatar + Name/Identity + "Assessment confirmed" badge) and the right rail (full 3-step Stepper "Review" → "Assess" → "Deliver" + Refresh button + unconstrained `FinishDocumentationControl` with `w-full`) exceeded the viewport width (~1200px required vs 1024px available). Because `body` enforces `overflow-x-hidden`, the rightmost ~80px–180px of the header was silently clipped off, cutting off the "Finish documentation" CTA text and its right pill border.
    - **Header Container Constraints**: Applied `w-full max-w-full min-w-0` to `WorkspaceHeader` and root `post-consultation-workspace` container, preventing horizontal blowout beyond the viewport.
    - **Responsive Workspace Stepper**: Updated `WorkspaceStepper` so that on screens `< xl`, the active phase label is prominently displayed (e.g. `(✓) ── (✓) ── (3) Deliver`) while completed/pending step labels hide smoothly, saving ~180px of horizontal space while preserving crystal-clear clinical progress. On `>= xl` desktop viewports, all 3 phase labels display in full. Scaled connecting line widths adaptively (`w-3 sm:w-4 xl:w-6`).
    - **Ergonomic Action Bar & Sizing**:
      - Updated `FinishDocumentationControl` to accept configurable `size` (`"sm"` in the header, `"default"` at the bottom "Complete Consultation" card) and `className`.
      - Replaced raw unstyled `<button>` in disabled state with shadcn `<Button size={size}>` with consistent `shrink-0 whitespace-nowrap rounded-full` styling, preventing rogue `w-full` blowout in flex containers.
      - Refined the Refresh button with `size="sm" gap-1.5 shrink-0` and responsive label (`<span className="hidden sm:inline">Refresh</span>`).
    - **Cockpit Grid Boundary Protection**: Added `min-w-0 max-w-full` to the 2-column cockpit grid container so large data tables or vitals cards cannot force the workspace width past the viewport.
    - **Zero-Shift Skeleton Synchronization**: Aligned `PostConsultationSkeleton` with the exact responsive stepper and action bar button widths.
- **Device Optimization**: Desktop-first density (Doctor Clinical Cockpit) + tablet/compact screen responsiveness down to 768px/1024px without truncation or horizontal clipping.
- **Tokens & Primitives Used**: `bg-(--surface-card)`, `bg-(--action-primary)`, `text-(--text-heading)`, `text-(--text-muted)`, `border-(--border-subtle)`, `Button`, `Skeleton`.

---

### [2026-09-26] Component / View Redesign: Messages App Master-Detail Layout for Doctor Chat

- **Target Route / Surface**: `/doctor/chat` and `/doctor/chat/[bookingId]`
- **Files Modified**:
  - `src/app/doctor/(homepage)/chat/layout.tsx` [NEW]
  - `src/app/doctor/(homepage)/chat/page.tsx` [MODIFIED]
  - `src/features/doctor/components/chat/DoctorChatShell.tsx` [NEW]
  - `src/features/doctor/components/chat/DoctorChatSidebar.tsx` [NEW]
  - `src/features/doctor/components/chat/DoctorChatEmptyPane.tsx` [NEW]
  - `src/features/doctor/components/chat/DoctorChatRoom.tsx` [MODIFIED]
  - `src/features/doctor/components/chat/DoctorChatList.tsx` [MODIFIED]
  - `src/features/doctor/components/chat/chatDateUtils.ts` [NEW]
- **Design Intent**:
  - Relayouted the `/doctor/chat` tab from an isolated, low-density single-column list of wide cards into a modern, clinical master-detail Messages app layout inspired by Apple Messages, WhatsApp Web, and Telegram.
  - **Desktop-First Ergonomics**: Two synchronized columns spanning the full height of the doctor viewport:
    - **Left Pane (Conversation Sidebar)**: Fixed width (320px–384px) with real-time patient/message search, category triage filters ("All", "Live", "History"), active thread indicators with subtle warm surface ring, patient avatars with live status badges, last message previews, and relative timestamps.
    - **Right Pane (Message Canvas)**: Active message thread with pinned top header (patient name resolved from conversation query cache, video call action CTA, live/connection transport status), grouped message bubbles with date divider pills ("Today", "Yesterday", long dates), timestamps, and pinned bottom composer.
    - **Empty Selection State**: Clean clinical empty preview pane on desktop when no thread is selected with triage statistics and quick "Open recent conversation" action.
  - **Mobile Ergonomics**: Responsive single-pane navigation: `/doctor/chat` displays the conversation list full width; tapping an item navigates to the chat room with a mobile back button (`md:hidden`) returning to the thread list.
  - **Zero Anti-AI Slop**: Zero glowing gradient borders, zero side-tab borders, zero pulsing dots, zero emojis, verified with Impeccable mechanical detector pass (0 defects).
- **Device Optimization**: Desktop-first density (Doctor Clinical Cockpit) + Mobile-responsive view navigation.
- **Tokens & Primitives Used**: `bg-(--surface-card)`, `bg-(--surface-page)`, `bg-(--surface-warm)`, `bg-(--surface-warm-soft)`, `bg-(--action-primary)`, `text-(--text-heading)`, `text-(--text-muted)`, `text-(--text-subtle)`, `border-(--border-subtle)`.
- **Upstream Porting Notes**: Self-contained within `src/features/doctor/components/chat/` and `src/app/doctor/(homepage)/chat/`. The upstream AI agent should copy the new files and update `DoctorChatRoom.tsx`, `DoctorChatList.tsx`, and `page.tsx`.

---

- **Target Route / Surface**:
  - `/doctor/post-consultation/[id]` (Post-Consultation Assessment-First Clinical Workspace)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/PostConsultationSkeleton.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Balanced 30 / 70 Clinical Proportions**: Replaced the cramped fixed `18rem` (288px) left rail with a proportional `minmax(0, 3fr) minmax(0, 7fr)` grid template (`lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]`).
    - **Patient Intake Rail (30%)**: Expands the left rail from 288px to a comfortable ~380px–570px (across typical desktop screens from 1280px to 1920px), eliminating awkward multiline text wrapping in the 2-column Allergies/Medications cards, providing proper whitespace for red-flag screening badges, and enabling effortless clinical scanning of patient history.
    - **Main Documentation Stage (70%)**: Allocates 70% width to the active clinical workspace (SOAP Subjective/Objective cards, Confirmed/Editable Assessment, Deliverables Deck tabs, Care Continuity recommendations, and Authorized Artifact History), creating a balanced, high-density desktop clinical cockpit.
  - **Collapsible Ergonomics Preserved**: When collapsed, the left rail cleanly shrinks to `3.5rem` (`lg:grid-cols-[3.5rem_minmax(0,1fr)]`), allowing the documentation stage to expand dynamically.
  - **Zero-Shift Loading Skeleton**: Synchronized `PostConsultationSkeleton` to match the exact 2-column 30/70 layout, purging obsolete 3-column elements to prevent layout shifts during SSR and client suspense loading.

---

### [2026-09-26] Impeccable Redesign: Professional Clinical Document Preview Lightbox Modal

- **Target Route / Surface**:
  - `/doctor/post-consultation/[id]` (Clinical Document Review & Verification)
  - `/doctor/consultation/[id]` (Live Teleconsultation Room Deliverables Preview)
- **Files Modified**:
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PrescriptionSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/MedicalCertificateSheet.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Fixed 384px Dialog Constraint**: Overrode the inherited `sm:max-w-sm` limitation from `dialog.tsx` with high-priority `!w-[96vw] !max-w-6xl !h-[92vh] !max-h-[94vh]` dimensions, eliminating the cramped 384px sliver layout and double scrollbars.
  - **Professional Inspector Toolbar**: Integrated a dedicated `h-14` dark inspector toolbar (`bg-slate-900 border-b border-slate-800`) featuring:
    - Clinical document badge and title with patient name & case ID.
    - Format indicator (`Standard Clinical Sheet · 8.5 × 11 in (Portrait)`).
    - High-visibility `Print / Save as PDF` primary button (`bg-[#18a58c]`).
    - Dedicated close button without absolute layout collisions (`showCloseButton={false}`).
  - **Centered Paper Lightbox Canvas**: The white physical paper document (`max-w-[800px]`) is rendered centered on a neutral dark gray `#25282a` stage with a realistic deep paper drop shadow (`shadow-[0_20px_60px_rgba(0,0,0,0.5)]`), replicating the inspection experience of Adobe Acrobat and Apple Preview.
  - **Typographic Alignment Fixes**: Refactored the demographic sections of `PrescriptionSheet` and `MedicalCertificateSheet` to use fixed-width CSS grid tracks (`grid-cols-[90px_minmax(0,1fr)]` / `grid-cols-[130px_minmax(0,1fr)]`), preventing multi-line text wrapping of patient names and dates.
  - **Print CSS Isolation**: Verified clean `@media print` rules so physical printers and PDF exports generate zero-chrome, 100% scale clinical sheets.

---

### [2026-09-26] Clinical Document Experience: Modal-First Preview & Authentic Printable Paper Styling

- **Target Route / Surface**:
  - `/doctor/consultation/[id]` (Live Teleconsultation Room & Doctor Companion Suite)
  - `/doctor/post-consultation/[id]` (Post-Consultation Assessment-First Clinical Workspace)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
  - `src/features/consultation/components/session/DoctorDeliverablesPreviewTab.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetHeader.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DocumentSheetFooter.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PrescriptionSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/MedicalCertificateSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/DiagnosticRequestSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/ClinicalReferralSheet.tsx` [MODIFIED]
  - `src/features/consultation/components/documents/PatientCareGuideSheet.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Modal-First Document Preview**: Removed inline document sheet rendering from `ArtifactCard`. The doctor now sees the dense, structured form editor/view by default for maximum clinical productivity. Added an explicit, prominent "Preview Official Document" action button that opens `DocumentSheetModal`.
  - **Ergonomic In-Call Companion**: Replaced the cramped inline A4 sheet in `DoctorDeliverablesPreviewTab` with a sleek overview card list for the 5 patient deliverables, with individual "Preview Document" buttons launching the full-screen modal.
  - **Authentic Printable Paper Transformation**: Stripped out web UI artifacts (nested gray card boxes, UI badge pills, colored card backgrounds) in favor of authentic 8.5"x11"/A4 printable stationery matching the doctor's reference images:
    - Pure white paper foundation (`bg-white`) with clean typographic key-value alignment and solid divider rules.
    - Official BayanHealth letterhead with brand teal rule and validity badges (`SAMPLE • NOT VALID` vs `OFFICIAL • VALID`).
    - High-contrast clinical tables and bulleted instruction sections on clean white paper.
    - Blue cursive digital signature specimen and authentic teal verification box (`qrcode.react`).
    - Dedicated `@media print` CSS rules in `DocumentSheetModal` ensuring zero-chrome physical printing and PDF export.

---

### [2026-09-26] Consultation Flow & Clinical Templates: 2-Column Cockpit & Authentic Patient Deliverables Preview

- **Target Route / Surface**:
  - `/doctor/consultation/[id]` (Live Teleconsultation Room & Doctor Companion Suite)
  - `/doctor/post-consultation/[id]` (Post-Consultation Assessment-First Clinical Workspace)
- **Files Created**:
  - `src/features/consultation/components/documents/types.ts` [CREATED]
  - `src/features/consultation/components/documents/DocumentSheetHeader.tsx` [CREATED]
  - `src/features/consultation/components/documents/DocumentSheetFooter.tsx` [CREATED]
  - `src/features/consultation/components/documents/PrescriptionSheet.tsx` [CREATED]
  - `src/features/consultation/components/documents/MedicalCertificateSheet.tsx` [CREATED]
  - `src/features/consultation/components/documents/DiagnosticRequestSheet.tsx` [CREATED]
  - `src/features/consultation/components/documents/ClinicalReferralSheet.tsx` [CREATED]
  - `src/features/consultation/components/documents/PatientCareGuideSheet.tsx` [CREATED]
  - `src/features/consultation/components/documents/ClinicalDocumentSheet.tsx` [CREATED]
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx` [CREATED]
  - `src/features/consultation/components/session/DoctorDeliverablesPreviewTab.tsx` [CREATED]
- **Files Modified**:
  - `src/components/consultation/DoctorClinicalCompanionSuite.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx` [MODIFIED]
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx` [MODIFIED]
- **Design Intent & Problem Solved**:
  - **Decommissioned Redundant 3rd Column (`ProtectedToolsRail`)**: The 336px (`21rem`) rail crowded the assessment-first post-consultation workspace. All its vital functions were cleanly relocated:
    - On-demand drafting moved directly into `DeliverablesDeck` via an intuitive "+ Add Document" dropdown menu and empty-state quick starts.
    - Safety gate status moved into `DeliverablesDeck`'s header badge.
    - Final completion dock integrated into the workspace header and as a sticky bottom completion bar.
  - **Clinical Paper Sheets (Authentic Patient Deliverables)**:
    - Designed 5 pixel-perfect, high-fidelity clinical templates matching physician-provided reference specifications:
      1. **Electronic Prescription (Rx)**: Structured medication table with Sig, Qty, Route, Refills, and special instructions.
      2. **Medical Certificate**: Official diagnosis, rest/suspension dates, fit-to-return criteria, and teleconsultation disclaimers.
      3. **Diagnostic Request**: Segregated sections for Laboratory and Imaging investigations with patient prep checklists.
      4. **Clinical Referral**: Target specialty, urgency triage, clinical summary, and red flags.
      5. **Patient Care Guide (Gabay sa Pagpapagaling)**: Culturally grounded Tagalog recovery guide with numbered tips, warning signs, and medication guidance.
    - Complete with official BayanHealth crest header, validity badges ("SAMPLE • NOT VALID" draft vs. "OFFICIAL • VALID"), attending physician credentials, signature specimen canvas, and verification QR code block (`qrcode.react`).
  - **Dual-View & Full-Viewport Print Inspection**:
    - `ArtifactCard` now provides a dual-view toggle: "Patient Sheet" (authentic paper rendering) and "Form View" (structured editor / raw payload).
    - Added full-screen modal preview (`DocumentSheetModal`) with native 1-click `window.print()` support.
  - **In-Consultation Live Deliverables Preview**:
    - Added a 3rd tab to `DoctorClinicalCompanionSuite` ("Documents Preview") so physicians during a live call can view what the patient will receive in real time with authentic formatting, providing familiarity and clinical reassurance before finalizing notes.
- **Device Optimization & Impeccable Craft**:
  - Converted the cramped 3-column desktop layout into an expansive 2-column cockpit (`lg:grid-cols-[18rem_minmax(0,1fr)]`), reclaiming over 336px for diagnostic evaluation and deliverables deck.
  - Responsive paper containers adapt with smooth horizontal scrolling or modal zoom.
  - Strict Anti-Slop enforcement: Crisp 1px solid borders (`border-slate-200`), BayanHealth brand colors (`#074972` Navy, `#18a58c` Teal, warm cream surfaces), zero platform emojis, and accessible Lucide vector icons.
- **Upstream Porting Notes**:
  - Component-scoped changes with zero breaking contract alterations; all payloads strictly adhere to `CdsProtectedArtifactPayload` schemas from `openapi.generated.ts`.

---

### [2026-09-26] Doctor Shell & Dashboard: Decommission Physician UI Demo Mode & Restore Live Operational States

- **Target Route / Surface**:
  - `/doctor` (Doctor Operational Flight Deck & Triage Hub)
  - Doctor Homepage Shell Layout (`src/app/doctor/(homepage)/layout.tsx`)
- **Files Modified**:
  - `src/app/doctor/(homepage)/layout.tsx` [MODIFIED]
  - `src/components/layout/ClinicianDemoBar.tsx` [DELETED]
  - `src/features/doctor/components/homepage/DoctorCommandBar.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/ActiveEncounterCommandCenter.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorRecentConsultations.tsx` [MODIFIED]
- **Design Intent**:
  - **Decommissioned Demo Navigation Bar**: Removed the sticky `ClinicianDemoBar` ("Physician UI Demo Mode" live preview banner with shortcut buttons) from the doctor layout now that the clinical evaluation demo is concluded.
  - **Restored True Operational States**:
    - `DoctorCommandBar`: Reverted hardcoded demo physician identity and demo shift metrics so the cockpit displays the authentic logged-in clinician profile, real shift metrics, and live duty switch state.
    - `ActiveEncounterCommandCenter`: Reverted forced active encounter fixture so the card displays its intended idle state ("No consultation currently in room") when no encounter is in progress.
    - `DoctorPatientQueue`: Removed forced injection of demo cases so the triage table reflects actual pool requests and appointments, showing the clean standby panel when the queue is clear.
    - `DoctorRecentConsultations`: Removed forced injection of demo items so the consultation history truthfully reflects settled records.
- **Device Optimization**:
  - Desktop-first density: Reclaims 52px of vertical viewport real estate on `/doctor` previously occupied by the demonstration banner, giving clinicians immediate visual priority to patient triage and agenda rows.
- **Tokens & Primitives Used**:
  - Preserved semantic tokens (`--surface-card`, `--border-subtle`, `--text-heading`, `--text-muted`, `--status-available-fg`).
- **Upstream Porting Notes**:
  - Remove `ClinicianDemoBar` from layout and ensure doctor homepage components read authentic state.

---

### [2026-09-26] Tooling & Governance: Impeccable Skill Integration & V2 UI Changelog Initialization

- **Target Route / Surface**:
  - Global Agent Tooling & UI Governance (`AGENTS.md`, `.agents/skills/impeccable`, `CHANGELOG_UI_V2.md`)
- **Files Modified**:
  - `CHANGELOG_UI_V2.md` [CREATED]
  - `AGENTS.md` [MODIFIED]
  - `UI_UX_AGENT.md` [MODIFIED]
  - `UI_HANDOFF.md` [MODIFIED]
  - `README.md` [MODIFIED]
  - `.agents/skills/impeccable/*` [INSTALLED]
  - `skills-lock.json` [CREATED]
- **Design Intent & Problem Solved**:
  - **Initialized CHANGELOG_UI V2**: Created `CHANGELOG_UI_V2.md` to serve as the active logging destination for all forthcoming UI/UX iterations, modernizations, and responsive bugfixes.
  - **Integrated Impeccable Design Skill**: Installed `pbakaus/impeccable` into the project repository to equip agents with 23+ UI craft commands (audit, polish, adapt, clarify, colorize, etc.) and anti-pattern detection rules against AI slop.
- **Upstream Porting Notes**:
  - Upstream synchronization agent should now monitor `CHANGELOG_UI_V2.md` for all new UI additions and component updates.
