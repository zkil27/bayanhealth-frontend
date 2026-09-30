---
target: doctor mobile screen (iOS/Android web)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:C:\\dev\\youi\\bayanhealth-frontend\\src\\features\\doctor\\components\\homepage\\DoctorHome.tsx"
target_fingerprint: "sha256:c131165180cbe807b081ca92f304c67df8062ab6676523dd422fdbbd35b74101"
target_path: "C:\\dev\\youi\\bayanhealth-frontend\\src\\features\\doctor\\components\\homepage\\DoctorHome.tsx"
timestamp: 2026-09-30T15-05-18Z
slug: doctor-components-homepage-doctorhome-tsx-3f8547b6
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Command bar has live stat tickers, but `UpcomingTodayCard` is buried deep below settled consults; doctor cannot see upcoming day agenda without long scrolling. Polling REST lacks socket/push status. |
| 2 | Match System / Real World | 3 | Clinical terms ("On-demand walk-in", "Intake", "No-show 10m countdown") match practice, but calendar drag-to-create treats a phone touch screen like a desktop mouse pointer. |
| 3 | User Control and Freedom | 1 | **Critical Failure**: On mobile, `<aside>` is `hidden lg:flex` and `DoctorHeader` returns `null` on all doctor routes. Zero mobile navigation bar or drawer exists! Once a doctor taps into `/doctor/schedule` or `/doctor/profile`, they are trapped with no way back. |
| 4 | Consistency and Standards | 2 | Inconsistent with Patient experience (`PatientShell` has a polished bottom `NavBar`, `100dvh`, and safe-area insets). Doctor profile features redundant double-navigation (nav list + tab bar stacked together). |
| 5 | Error Prevention | 2 | Good backend safety gates (collision warnings, accept confirmation modal), but catastrophic mobile touch targets: `QueueRowShell` crams destructive "NoShow" icon button 6px away from "Start" button in sub-48px targets. |
| 6 | Recognition Rather Than Recall | 2 | Calendar toolbar removed the "+ Add availability" button in favor of canvas drag-and-drop; Day view "+ Add Shift" rail is hidden on mobile. Doctors must memorize how to create availability. |
| 7 | Flexibility and Efficiency | 1 | Keyboard accelerators (`D`, `W`, `M`, `T`) are desktop-only; mobile web has zero touch shortcuts, no swipe gestures (e.g. swipe-to-review or swipe-to-accept), and no pull-to-refresh. |
| 8 | Aesthetic and Minimalist Design | 2 | Strict anti-slop adherence, but mobile presentation suffers from an infinite monolithic single-column scroll with cramped row layouts and severe horizontal text squeezing. |
| 9 | Error Recovery | 3 | Informative error recovery on claim races ("Another doctor accepted this request first") and calendar refresh retries. Native `window.confirm` for no-show assertions is crude. |
| 10 | Help and Documentation | 3 | Good contextual microcopy ("Walk-ins are handled via live queue", "Waiting out the ten-minute window"), but lacks guidance for mobile gestures or calendar operations. |
| **Total** | | **21/40** | **Acceptable Band (20–27)** |

#### Design Specificity Verdict

**LLM assessment**: Authentically Clinical in Intent, Severely Compromised in Mobile Ergonomics.
The visual and domain vocabulary is bespoke and deeply anchored in Philippine clinical healthcare (PRC accreditation, DOH telehealth standards, Tagalog greetings, Peso currencies, and strict adherence to BayanHealth Brand Navy and Teal). However, the interface exhibits an acute desktop bias: components designed for high-density 1440px cockpit displays simply collapse into a 1,500px single-column stack on phones. Most egregiously, desktop mouse interactions (`touch-none` pointer drag) were forced onto mobile touchscreens, and the desktop navigation rail was hidden without mounting any mobile navigation replacement.

**Deterministic scan**: Automated AST and token scan executed over all doctor surfaces (`src/features/doctor` and `src/app/doctor`) via `.agents/skills/impeccable/scripts/impeccable.cmd detect --json`. Returned **0 violations** (100% clean rule pass on forbidden glows, fake emojis, and token adherence). However, static DOM/CSS analysis flagged:
- Hardcoded `minWidth: 760` in `DoctorScheduleView.tsx:592` forcing overflow panning on small viewports.
- Pointer event hijacking via `touch-none` in `TimeGrid.tsx:369` disabling mobile vertical scroll.
- Total navigation omission below `lg` breakpoint in `DoctorLayout.tsx:35` and `header.tsx:47-55`.
- Missing `env(safe-area-inset-bottom)` padding with `viewportFit: "cover"` in `layout.tsx` and drawer footers.

**Visual overlays**: Skipped in this runtime (no browser automation/mutable DOM injection sandbox available). Fallback signal verified HTTP 200 on port 3000 alongside deep static code inspection.

#### Overall Impression
BayanHealth's doctor side possesses exceptional clinical authenticity, crisp solid typography, and rock-solid safety gates, but running it on mobile web (iOS Safari & Android Chrome) currently yields a severely degraded, disorienting experience. A doctor on call using their phone is effectively trapped on whichever page they land on, forced to navigate multi-action queue rows that cram buttons into unclickable 32px targets, and unable to scroll their calendar without fighting touch-drag conflicts.

#### What's Working
1. **Clinical Authority & Strict Anti-AI Slop**: Beautiful, clean 1px borders, deep brand navy headers, teal accents, and warm cream cards completely free of neon SaaS glows or native platform emojis.
2. **Multi-Modal Triage Safety Gates**: Triage details inspection and explicit confirmation modals (`TriageDetailsModal`, `AcceptConsultModal`) protect physicians against accidental commitments and gracefully resolve race conditions when another clinician claims a walk-in first.
3. **Collision & No-Show Guardrails**: `ScheduleCollisionBanner` dynamically warns doctors of upcoming appointments within 20 minutes of accepting a walk-in, and `NoShowControl` prevents premature abandonment with an honest 10-minute cooldown timer.

#### Priority Issues

- **[P0] Zero Mobile Navigation Chrome (Stranded Clinician)**:
  - **Why it matters**: In `DoctorLayout.tsx`, `<aside>` is `hidden lg:flex`, and `DoctorHeader` returns `null` for all primary doctor routes. Doctors accessing via mobile web have zero persistent navigation bar, drawer, or bottom nav. Navigating into `/doctor/schedule` or `/doctor/profile` leaves them trapped with no way to return to the active triage queue without browser back buttons.
  - **Fix**: Mount a dedicated mobile bottom navigation bar (`DoctorNavBar`) modeled after `DOCTOR_NAV` with `env(safe-area-inset-bottom)` safe-area padding, mirroring the mobile-first architecture of `PatientShell`.
  - **Suggested command**: `$impeccable adapt`

- **[P0] Calendar Grid Gesture Hijack & Missing Mobile Shift Creator**:
  - **Why it matters**: `TimeGrid.tsx` enforces `touch-none` and pointer capture on day columns for mouse dragging. On mobile touchscreens, vertical swipes intended to scroll the page instead trigger accidental slot selection and freeze page scrolling. Additionally, the "+ Add availability" button was removed from the toolbar and the Day View "+ Add Shift" cockpit is `hidden lg:flex`, leaving mobile doctors with no functional way to add shifts.
  - **Fix**: Disable pointer drag-to-create on touch viewports (`pointer: coarse`). Restore a mobile-friendly "+ Add Shift" floating action button (FAB) or toolbar action that triggers a dedicated bottom sheet (`AvailabilityPopover`/`Drawer`).
  - **Suggested command**: `$impeccable adapt`

- **[P1] Hazardous Sub-48px Touch Targets & Action Cramming in Queue Rows**:
  - **Why it matters**: In `DoctorPatientQueue.tsx`, `QueueRowShell` places avatar, patient name, queue badge, and 2-3 action buttons ("Review", "Accept Consult", "View", "No-Show", "Start") on a single horizontal row. On 375px screens, available width shrinks to ~255px, crushing text and placing the destructive "No-Show" icon button 6px away from "Start" in sub-48px (`h-8`, 32px) targets, risking mis-taps during stressful emergency triage.
  - **Fix**: On `< sm` mobile viewports, stack actions vertically below patient metadata into full-width 48px tap targets, or tuck secondary inspection actions into a mobile context menu.
  - **Suggested command**: `$impeccable layout`

- **[P1] Inverted Mobile Information Architecture (Buried Daily Agenda)**:
  - **Why it matters**: In `DoctorHome.tsx`, the two-column desktop cockpit stacks into a single column where `UpcomingTodayCard` is rendered dead last—below `DoctorRecentConsultations` (past settled encounters). Doctors checking their phones need immediate visibility into upcoming obligations for the day, not a history archive.
  - **Fix**: Re-order the mobile hierarchy to elevate `UpcomingTodayCard` immediately under `ActiveEncounterCommandCenter`, ahead of `DoctorPatientQueue`, or introduce a top-level mobile Segmented Switcher ("Queue & Triage" vs "Today's Schedule").
  - **Suggested command**: `$impeccable layout`

- **[P2] Redundant Double-Navigation in Doctor Profile**:
  - **Why it matters**: In `DoctorProfileView.tsx`, the mobile single-column layout renders `DoctorIdentitySummaryCard` (which contains 3 vertical tab navigation buttons) directly stacked above `<main>`'s 3-tab segmented control for the exact same tabs.
  - **Fix**: Conditionally render only the segmented tab bar on mobile (`block lg:hidden`), suppressing the aside navigation list on viewports below `lg`.
  - **Suggested command**: `$impeccable distill`

#### Persona Red Flags

- **Alex (Impatient Power User Clinician)**: Trapped on `/doctor/schedule` with no keyboard shortcuts and no mobile navigation to return to the active triage queue. Cannot quickly add availability on mobile without fighting a desktop drag gesture.
- **Casey (Distracted Mobile Clinician on Rounds / In Transit)**: One-handed thumb use while walking between hospital wards. Tapping "Start" risks triggering "No-Show" due to 32px touch targets separated by 6px. Scrolling down to see upcoming appointments takes multiple long flings past settled past records.
- **Sam (Accessibility-Dependent Clinician)**: At 150% browser zoom or with mobile screen readers enabled, `QueueRowShell` content clips horizontally; 32px touch targets violate WCAG 2.5.5; `window.confirm` modal halts accessibility focus flows.

#### Minor Observations
- **Orphaned Component**: `src/features/doctor/components/history/DoctorHistory.tsx` is an unused schedule drawer unreferenced by `/doctor/history` (which renders `CompletedConsultations.tsx`). It should be archived.
- **Viewport Safe-Area Clamping**: `src/app/layout.tsx` sets `viewportFit: "cover"`, but doctor layout and drawer footers lack `pb-[env(safe-area-inset-bottom)]`, causing buttons to overlap iPhone home indicators and Android gesture pills.

#### Questions to Consider
- What if `/doctor` on mobile presented a high-clarity 2-tab segmented cockpit ("Live Queue" vs "Today's Agenda") rather than an endless vertical scroll?
- Could availability creation on mobile be a rapid 2-tap "Quick Shift" bottom drawer rather than requiring touch-grid interaction?
- What if doctor mobile navigation matched the bottom bar pattern already proven on the patient side?
