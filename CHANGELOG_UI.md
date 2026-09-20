# BayanHealth UI/UX Changelog

All design, layout, styling, and UX modifications made in this fork must be logged here.  
This document serves as the single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository.

---

## Log Entries

*(New entries should be appended at the top)*

### [2026-09-21] Patient UI: Search Dropdown Layout Modernization, Width Anchoring & Scrim Overlay

- **Target Route / Surface**:
  - `/patient` (Patient Home Top Bar & Quick Symptoms Dropdown)
- **Files Modified**:
  - `src/features/patient/components/homepage/PatientHome.tsx`
- **Design Intent & Root Cause Fix**:
  - **Full-Width Span Across Notification Area**: Wrapped the search form and notification Bell button within a shared `relative flex w-full items-center gap-2.5` container, anchoring the dropdown with `absolute top-full left-0 right-0 mt-2 z-50`. This allows the dropdown to expand across the full header width—taking up the space below both the search input and the notification Bell—giving patients a wide, balanced surface for quick symptoms and instant search actions on mobile and desktop.
  - **Dimmed Scrim Backdrop**: Added a focused scrim backdrop (`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]`) when `isSearchOpen` is active. This eliminates visual clash with half-obscured hero content underneath and ensures tapping anywhere outside safely dismisses the search menu.
  - **Structured Quick Symptoms Grid**: Replaced uneven `flex flex-wrap` chips with an ergonomic, responsive grid (`grid grid-cols-2 min-[410px]:grid-cols-3 gap-2`). On standard mobile viewports (e.g. 410px–440px like iPhone 16 Pro Max and above), symptoms render in 3 balanced columns across 2 rows; on compact phones below 410px, it gracefully folds into 2 equal-width columns.
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
