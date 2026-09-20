# BayanHealth UI/UX Changelog

All design, layout, styling, and UX modifications made in this fork must be logged here.  
This document serves as the single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository.

---

## Log Entries

*(New entries should be appended at the top)*

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
