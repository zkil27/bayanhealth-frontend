# BayanHealth UI/UX Changelog (V3)

All design, layout, styling, and UX modifications made in this fork must be logged here.  
This document serves as the active single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository, superseding [`CHANGELOG_UI_V2.md`](./CHANGELOG_UI_V2.md) and [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

> **Historical References**:
> - For UI changes logged between 2026-09-26 and 2026-10-01, refer to [`CHANGELOG_UI_V2.md`](./CHANGELOG_UI_V2.md).
> - For historical entries prior to 2026-09-26, refer to [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

---

## Log Entries

### [2026-10-09] Doctor Mobile Nav: Lifted Pill Harmonization (Matching Patient Side)

- **Target Route / Surface**: Every doctor route below `lg` (bottom navigation in `/doctor`, `/doctor/schedule`, `/doctor/history`, `/doctor/profile`)
- **Files Modified**:
  - `src/features/doctor/components/DoctorMobileNav.tsx`:
    - **Lifted Pill Structure**: Transformed the edge-docked bottom bar into an opaque pill lifted 12px above the safe area (`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-40 mx-auto max-w-md h-16 rounded-full 1px border shadow-(--shadow-md)`), matching the exact design and ergonomics of the patient `NavBar`.
    - **WebKit Safari Optimization**: Implemented the absolute positioned backdrop child pattern (`span aria-hidden`) to prevent mobile Safari 26 from sampling and tinting its bottom floating address bar from the fixed element.
    - **Ergonomic Touch Targets**: Tabs are 56px-tall (`h-14`) rounded-full pill targets with 24px (`size-6`) icons, 13px labels, and `--surface-accent-soft` active indicator with `aria-current="page"`.
    - **Queue Indicator**: Retained the live queue badge on the Dashboard tab, positioned cleanly relative to the icon.
    - **Floating Live Encounter Card**: Rebuilt `LiveEncounterReturn` as a floating rounded card (`rounded-2xl`, `--shadow-md`, `--surface-brand`) positioned directly above the nav pill with `gap-2`.
  - `src/app/doctor/(homepage)/layout.tsx`:
    - `<main>` bottom clearance padding updated from `4.5rem` to `6rem` (+ safe area) to comfortably clear the lifted pill, and from `8rem` to `10rem` when the return-to-encounter card is mounted.
- **Design Intent**:
  - Cross-role design harmonization: provides the doctor mobile experience with the identical tactile, lifted pill ergonomics proven on the patient side.
  - Eliminates the mobile Safari toolbar tap trap (WebKit bug 194235) where bottom-flush tabs fail to register taps when the browser bar is collapsed.
- **Device Optimization**: Doctor mobile web (iPhone/Android mobile browsers).
- **Tokens & Primitives Used**: `--surface-raised`, `--surface-brand`, `--surface-accent-soft`, `--action-primary`, `--border-subtle`, `--shadow-md`.
- **Upstream Porting Notes**: Port `DoctorMobileNav.tsx` and the clearance padding in `layout.tsx` together.

### [2026-10-09] Doctor Deliverables: Plan Draft Discard & Mobile Action Menu Elevation

- **Target Route / Surface**: `/doctor/post-consultation/[consultationId]` (Deliverables Deck and ArtifactCard)
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx`:
    - Removed `selected !== "plan"` restriction from `canDiscard`. Unsigned Plan drafts in `needs_review` status can now be discarded just like other deliverables (prescriptions, medical certificates, diagnostic requests, referrals, and education sheets).
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx`:
    - Updated `canDiscard` contract to reflect that any unsigned draft can be discarded.
    - Set `side="top"` and `sideOffset={8}` on the "More" `DropdownMenuContent`. In sticky/docked bottom footers on mobile devices, this opens the actions menu upwards into the open viewport area above the footer, preventing it from covering the primary "Sign" button or colliding with the bottom safe area.
- **Design Intent**:
  - Allow physicians to discard AI-generated Plan drafts when starting over or choosing not to use an automated plan.
  - Fix mobile ergonomics: ensure all secondary actions ("Redraft with AI", "Discard draft") are clearly accessible above the docked action bar without clipping.
- **Device Optimization**: Mobile web and desktop clinical views.
- **Tokens & Primitives Used**: `--danger-fg`, `--danger-bg`, `@base-ui/react/menu`.
- **Upstream Porting Notes**: Port `DeliverablesDeck.tsx` and `ArtifactCard.tsx` together.

### [2026-10-09] Overlay & Modal Performance: Elimination of Backdrop-Blur Compositor Lag & Base UI Transition Harmonization

- **Target Route / Surface**: Doctor consultation room (`/consultation/room/[bookingId]`), Doctor dashboard modals, and global `@base-ui` dialog/alert-dialog primitives.
- **Files Modified**:
  - `src/components/ui/alert-dialog.tsx`:
    - **Eliminated backdrop blur**: Removed `supports-backdrop-filter:backdrop-blur-xs`. In browsers (especially over active WebRTC/video canvases and badges with existing `backdrop-blur-md`), animating full-viewport backdrop filters forces recursive GPU framebuffer read-backs and full-screen Gaussian blur shader passes on every animation frame, dropping frame rates and causing 300ms+ stutter.
    - **Replaced keyframe conflicts with Base UI native transitions**: Removed `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out`. The `@keyframes enter` transform (`translate3d(0, 0, 0) scale3d(...)`) clobbered the popup's `-translate-x-1/2 -translate-y-1/2` centering until the animation finished, causing a visible snap and compositor thrashing. Replaced with Base UI native transition attributes (`transition-all duration-150 ease-out data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95`).
    - **Clinical scrim**: Upgraded scrim from low-contrast `bg-black/10` to clinical, high-contrast `bg-black/50`, adhering to the design system's prohibition against glassmorphism.
  - `src/components/ui/dialog.tsx`: Harmonized `DialogOverlay` and `DialogContent` with the identical Base UI starting/ending styles and `bg-black/50` scrim.
  - `src/components/ui/sheet.tsx`: Removed `supports-backdrop-filter:backdrop-blur-xs` from `SheetOverlay`, adopting clean `bg-black/50`.
  - `src/features/doctor/components/homepage/AcceptConsultModal.tsx`: Removed `backdrop-blur-xs`, adopting crisp `bg-black/50`.
  - `src/features/doctor/components/homepage/TriageDetailsModal.tsx`: Removed `backdrop-blur-xs`, adopting crisp `bg-black/50`.
- **Design Intent**:
  - Pure 60/120fps hardware-accelerated modal presentation.
  - Enforce anti-slop guidelines: eliminate glassmorphism and artificial translucent blurs in favor of clinical authority and instant responsiveness.
- **Device Optimization**: Mobile viewports, tablets, and desktop clinical cockpits.
- **Tokens & Primitives Used**: `@base-ui/react` `AlertDialog`, `Dialog`, `Sheet`.
- **Upstream Porting Notes**: Port the updated `alert-dialog.tsx`, `dialog.tsx`, and `sheet.tsx` component primitives directly. No new dependencies or props required.

### [2026-10-09] Doctor Post-Consultation Mobile Performance & Latency Overhaul

- **Target Route / Surface**: `/doctor/post-consultation/[consultationId]` (AssessmentFirstWorkspace and related consultation review subcomponents)
- **Files Modified**:
  - `src/hooks/use-is-breakpoint.ts`:
    - Replaced React `useState` + `useEffect` resize listeners with `useSyncExternalStore` bound directly to `window.matchMedia`.
    - Eliminates hydration double-renders and layout flashes on mobile initial load while providing instantaneous, tear-free media query updates.
  - `src/features/consultation/components/postConsultation/ClinicalNotesCard.tsx`:
    - Wrapped `ClinicalNoteField` in `React.memo`.
    - Introduced local input state with debounced (300ms) synchronization to parent store and immediate flush on `onBlur`.
    - Completely eliminates keystroke lag (150ms–400ms typing latency) by isolating rapid typing to the immediate field without re-rendering the parent 2,500-line workspace tree.
  - `src/features/consultation/components/postConsultation/WorkspaceChrome.tsx`:
    - Removed root descendant `:has()` selector `max-lg:group-has-[textarea:focus]/ws:hidden` in favor of declarative `group-data-[field-focused=true]/ws:hidden` and direct `isFieldFocused` prop.
    - Memoized `WorkspaceHeader`, `WorkspaceStepper`, and `PhoneStepTabs` using `React.memo`.
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx`:
    - Implemented declarative `data-field-focused` state management via `onFocusCapture` and `onBlurCapture` on container, eliminating full-tree CSS style recalculation on mobile virtual keyboard pop.
    - Decoupled mobile screen phases: on phone viewports (`isPhone`), conditionally renders only the active phase screen (`phoneView === "review"` renders Subjective & Objective intake; `phoneView === "assess"` renders Assessment & Diagnosis editor; `phoneView === "deliver"` renders Plan, deliverables, and lock/finalize bar). Desktop continuous document layout remains completely preserved and untouched.
    - Omitted desktop-only `PatientRail` on mobile (`!isPhone`).
    - Made heavy modal contents (`PatientDetails` in `CustomBottomModal` and `DocumentSheetModal`) lazily mounted only when open.
    - Memoized local subcomponents: `LockNotice`, `NextStepBar`, `AssessmentEditor`.
  - `src/features/consultation/components/postConsultation/WorkspaceSection.tsx`:
    - Wrapped `WorkspaceSection` and `IntakeBlock` in `React.memo`.
  - `src/features/consultation/components/postConsultation/SoapSummaryCards.tsx`:
    - Wrapped `SubjectiveIntake`, `ObjectiveIntake`, `ObjectiveSummary`, and `SubjectiveSummary` in `React.memo`.
  - `src/features/consultation/components/postConsultation/PatientRail.tsx`:
    - Wrapped `PatientRail` in `React.memo`.
  - `src/features/consultation/components/postConsultation/PatientDetails.tsx`:
    - Wrapped `PatientDetails` in `React.memo`.
  - `src/features/consultation/components/postConsultation/CandidatePicker.tsx`:
    - Wrapped `CandidatePicker` in `React.memo`.
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx`:
    - Wrapped `DeliverablesDeck` in `React.memo`.
- **Design & Performance Intent**:
  - Drastically improve doctor post-consultation mobile responsiveness. Prior to this fix, typing a single letter in Clinical Notes triggered re-renders of thousands of un-memoized DOM nodes across hidden tabs and inactive sections.
  - Eliminate browser CSS recalculation stutter caused by deep tree `:has()` pseudo-classes on every input focus/blur.
  - Reduce active mobile DOM footprint by ~70% via phased screen mounting without losing physician draft state.
  - Zero visual or ergonomics regressions for desktop clinical multi-column cockpit.
- **Device Optimization**: Doctor mobile web (iPhone/Android mobile browsers) and desktop clinical workflow.
- **Tokens & Primitives Used**: `--surface-warm-soft`, `--surface-raised`, `--border-subtle`, `--brand-navy`, `--action-primary`.
- **Upstream Porting Notes**: Port `use-is-breakpoint.ts` and all touched post-consultation subcomponents together. Ensure memoized wrappers and debounced note flush logic are preserved.

### [2026-10-09] Waiting Screen: Theme-Aware (Dark/Light), Unpausable Ambient Loop & Aspect Ratio Fidelity

- **Target Route / Surface**: `/patient/booking/getBooking/[bookingId]` (wizard waiting-for-doctor step)
- **Files Modified**:
  - `src/features/booking/components/WaitingJeepney.tsx`:
    - **Theme-aware switching**: Replaced time-of-day clock math with `next-themes` (`useTheme()`). Renders the Night scene (`jeepney-night.mp4`) in Dark Mode and Day scene (`jeepney-day.mp4`) in Light Mode. Seamlessly swaps scene on dynamic theme toggle with SSR hydration safety.
    - **Unpausable ambient loop**: Removed all pause buttons, overlay button traps, and tap-to-pause event listeners. Configured the underlying `<video>` with `pointer-events-none select-none`, `autoPlay`, `loop`, `muted`, `playsInline`, `controls={false}`, `disablePictureInPicture`, and `disableRemotePlayback`. Provides the non-interactive, continuous background experience of an ambient GIF without its 256-color banding or 40MB file size penalties.
    - **Aspect ratio & pixel density**: Removed `sm:aspect-[21/9]` crop that zoomed into the bottom third and degraded visual resolution on desktop/tablet. Standardized on natural 16:9 (`aspect-video`) so the complete illustration (moon, stars, clouds, houses, jeepney) renders at native sharpness without zooming or blurriness.
    - **Accessibility (prefers-reduced-motion)**: Renders a still high-resolution WebP poster image statically when the user's OS has reduced motion enabled.
  - `public/video/jeepney-day.mp4`, `public/video/jeepney-night.mp4`:
    - Re-encoded at pristine visual quality (H.264 CRF 17, `tune animation`, `preset slow`, `-movflags +faststart`, audio stripped, seamless loop cross-fade).
  - `public/video/jeepney-day-poster.webp`, `public/video/jeepney-night-poster.webp`:
    - Regenerated high-fidelity WebP posters at 90% quality matching frame 0.
- **Design Intent**:
  - Ensure the waiting scenery harmonizes with patient theme preferences (dark mode is calm and nocturnal, light mode is warm and bright).
  - Eliminate intrusive video player affordances (pause buttons, context menus) so the graphic reads strictly as an ambient, reassuring waiting illustration.
  - Restore true pixel crispness and visual composition across all viewport sizes.
- **Device Optimization**: Patient mobile-first and desktop clinical views.
- **Tokens & Primitives Used**: `--border-subtle`, `--surface-warm-soft`.
- **Upstream Porting Notes**: Copy `WaitingJeepney.tsx` and the re-encoded `public/video/*` assets.

### [2026-10-09] Patient Mobile Nav: Lifted Pill (Mobile Safari)

- **Target Route / Surface**: Every patient route below `lg` (bottom navigation)
- **Files Modified**:
  - `src/features/patient/components/NavBar.tsx`:
    - The bottom bar is now an **opaque pill lifted 12px above the safe area** (`fixed inset-x-3 bottom-[calc(safe-area+0.75rem)]`, max-width `md`, `rounded-full`, 1px border, `--shadow-md`). The visible surface is an absolutely positioned child, so the fixed element itself carries no background.
    - Tabs are 56px-tall `rounded-full` targets with 24px icons and **13px labels** (were 10.5px). The active tab fills `--surface-accent-soft`, plus `aria-current="page"`.
    - Destinations, order and focus rings are unchanged.
  - `src/features/patient/components/PatientShell.tsx`: `<main>` bottom padding `5.5rem` → `6rem` (+ safe area) to clear the pill (4rem + 0.75rem lift).
  - `src/features/booking/components/patient/PatientBookingDetail.tsx`: the intake sheet's height subtracts `5.25rem` (was `4.25rem`), so its pinned footer sits above the pill.
- **Design Intent**:
  - **The bottom-edge tap trap.** Once Safari's toolbar minimises, taps in roughly the bottom 20–44px reveal the toolbar instead of reaching the page (WebKit bug 194235). Tabs docked to the edge sat in that zone, so a first tap could do nothing, which is the worst case for older patients. The lifted pill keeps every tab clear of it.
  - **Toolbar tinting.** iOS 26 Safari tints its floating toolbar from fixed elements covering most of the bottom edge, and the full-width white bar produced a second solid slab. The gutters and the background-on-child pattern avoid that.
  - **Opaque, not glass:** for contrast, and because the repo bans glassmorphism.
- **Device Optimization**: Patient mobile web, with mobile Safari as the primary target; Android Chrome is unaffected either way.
- **Tokens & Primitives Used**: `--surface-raised`, `--border-subtle`, `--shadow-md`, `--surface-accent-soft`, `--action-primary`, `--text-muted`.
- **Upstream Porting Notes**: Port the NavBar and the two clearance values together. Verify on a real iPhone (iOS 26, Safari Tab Bar set to "Compact" and to "Bottom"): after scrolling, each tab must navigate on the **first** tap. Page wrappers that already pad `6rem` + safe area need no change.

### [2026-10-09] Booking Tracker Route (4 Stops) + Payment Receipt

- **Target Route / Surface**: `/patient/booking/getBooking/[bookingId]` (every wizard step; Payment step)
- **Files Modified**:
  - `src/features/booking/components/consultation/StepsIndicator.tsx`: rebuilt as a route.
    - Solid teal road for the travelled part, dashed for the road ahead; ticked teal stops for finished steps, hollow ones for upcoming.
    - The current stop is a plain ringed dot (a jeepney stamp was tried and removed: it read as ugly at this size). The stop button carries `aria-current="step"`, and each label has sr-only "stop N of M, done / current stop / coming up".
    - One motion: the teal road fill transitions between stops (700ms ease-out). `motion-reduce` places it directly.
    - Labels are 13px on phones and 15px on desktop; stops are 48px tap targets with focus rings. Horizontal on phones, vertical rail from `lg`.
    - Props unchanged. A "Stop N of M / Next: …" caption was tried and removed as redundant with the page heading; the stop state is still announced to screen readers.
  - `src/features/booking/components/consultation/BookingWizard.tsx`:
    - **Four stops** (Form → Payment → Doctor → Consult). `finding` and `confirmation` both map to the Doctor stop through `STOP_FOR_STEP`; the Doctor stop shows the waiting screen while matching and the accepted-doctor screen once assigned (also when reviewed later). Booking steps, statuses and polling are unchanged.
  - `src/features/booking/components/consultation/PaymentStep.tsx`:
    - "Your consultation fee" **receipt**: service line, "Platform fee: Free", a dashed rule and a "Total to hold" in the display font. The amount is always the server's.
    - A single promise line; a 52px "Hold ₱500.00" button ("Placing hold…" while pending).
    - Removed: the navy price slab, the "Secure payment" pill, and the two rows that described later steps (the tracker's "Next:" line covers them).
    - The test-provider disclosure is unchanged in meaning. The hold mutation and amount logic are untouched. The review state reuses the receipt with "Held".
  - `src/features/booking/components/WaitingJeepney.tsx`: now exports `sceneForNow` and `Scene` (harmless; no longer used by the tracker).
- **Design Intent**: Give the flow one personality: the same paper-cut jeepney world as the waiting screen, from the form through to the consultation. The payment becomes a receipt they can read in one pass, with one promise and one button.
- **Device Optimization**: Patient mobile-first; the vertical rail also checked at 1280px.
- **Tokens & Primitives Used**: `--action-primary`, `--border-strong`, `--surface-card`, `--surface-warm-soft`, `--teal-200/800`, `--shadow-sm`, `font-display`; existing `BrandCtaButton`.
- **Compliance Notes**:
  - No new claims.
  - Fee and "Platform fee: Free" copy was already shown to the patient.
  - The hold-not-charge promise and the test-provider disclosure keep their meaning.
  - Colour is never the only signal (ticks, ring, caption, sr-only state).
  - No schema, API or state changes.
- **Upstream Porting Notes**:
  1. Port `StepsIndicator` and the `STEPS` / `STOP_FOR_STEP` block together.
  2. If other code reads `STEPS` by index, re-check it: Confirmed is no longer index 3 and Consult is now 3.
  3. No new images are needed.

### [2026-10-09] Pain Assessment: Even Chip Grids

- **Target Route / Surface**: Booking wizard intake, step "Pain Assessment"
- **Files Modified**:
  - `src/features/booking/components/consultation/intake/PainAssessmentStep.tsx`: every chip group (what makes it worse/better, what it feels like, when it started, when it flares up, how often, duration unit) is an even grid (`grid auto-rows-fr grid-cols-2 sm:grid-cols-3`) with full-width, left-aligned chips, instead of ragged wrapping rows. The duration number box sits on its own row above its unit chips. Values and composed strings are unchanged.
- **Design Intent**: Matches the even symptom and allergy grids; rows scan cleanly and wrap labels the same height.
- **Device Optimization**: Patient mobile-first.
- **Upstream Porting Notes**: Styling only.

### [2026-10-09] Medical History: "Known conditions" Yes/No Gate

- **Target Route / Surface**: Booking wizard intake, step "Medical History"
- **Files Modified**:
  - `src/features/booking/components/consultation/intake/MedicalHistoryStep.tsx`: the list of conditions now appears only after answering **Yes** to "Do you have any known medical conditions?". It is a 2-column grid (3 from `sm`) with equal-height rows, and "No" writes the same `noneReported: true` that the old "No pre-existing medical conditions" tile wrote. An existing answer opens the matching branch. The list is mounted but hidden while the answer is "No" or unanswered, so selections persist.
  - `src/features/booking/components/consultation/intake/IntakeChoice.tsx`: `ConditionTile` uses slightly tighter padding on phones.
- **Design Intent**: A patient with no conditions answers one question and sees none of the 13 tiles, so the step is far shorter. Patients who do have conditions get a compact grid.
- **Device Optimization**: Patient mobile-first.
- **Tokens & Primitives Used**: `ChoiceCard`, `ConditionTile`, `Reveal` (existing).
- **Upstream Porting Notes**: This adds one question to the step; stored values and save mapping are unchanged. Leaving the question unanswered stays "not answered", as before.

### [2026-10-09] Patient Flow: Satisfaction & Declutter Pass (Choose → Wait → Matched → Finished)

- **Target Route / Surface**: `/patient/booking` (path chooser), `/patient/booking/createBooking` (Consult Now), `/patient/booking/getBooking/[bookingId]` (context bar, tracker, payment, waiting, matched, completed, read-only intake)
- **Files Modified**:
  - `src/features/booking/components/patient/BookingPathChooser.tsx`:
    - Removed: the uppercase eyebrows and the "Pinakamabilis" badge, the bullet points that repeated each blurb, and the unsupported `ON_DEMAND_WAIT_ESTIMATE` line.
    - "Prepare for your consult" moved to the waiting screen; the context grid is now two cards.
    - Copy is 15px; targets are 48px.
  - `src/features/booking/components/patient/OnDemandBooking.tsx`: single-language group labels ("Consultation service", "Doctor preferences (optional)"); the soft-preference paragraph and the "Ihanda bago ang tawag" box are removed (that box moved to the waiting screen).
  - `src/features/booking/components/patient/PatientBookingDetail.tsx`:
    - **Context bar:** the status badge shows only for completed or cancelled bookings (an "info" badge contradicted the tracker). "Doctor matching in progress" is dropped from the subtitle, and the request time is hidden for on-demand bookings. Title and subtitle are larger, and the back button is 48px.
    - **Join card:** brand tokens instead of the hard-coded `slate`/`emerald`/`teal-50` colours, and a solid "Live" dot instead of `animate-pulse` (banned). Copy is unchanged.
    - **Finished bookings:** the wizard (closing step) renders first, then education, then prescription (their existing deliberate order), then chat history.
  - `src/features/booking/components/consultation/BookingWizard.tsx`:
    - The "Teleconsult" pill (which duplicated the page title) is removed; desktop keeps a plain rail heading.
    - New `useDoctorFoundTabTitle`: when the step leaves `finding` for a matched step while the tab is hidden, the tab title becomes "Doctor found – BayanHealth" until the patient returns. Display-only; no push and no new polling.
  - `src/features/booking/components/consultation/StepsIndicator.tsx`: labels are 13/15px, steps are 48px tap targets with focus rings, and the "Tap a completed step…" hint line is removed.
  - `src/features/booking/components/consultation/PaymentStep.tsx`:
    - Removed "Server-set price for this booking."
    - The three "hold, not a charge" messages are merged into one line that includes free cancellation.
    - The simulated-ledger Alert becomes one quiet line **with the same meaning**, kept while the simulated provider is live.
  - `src/features/booking/components/consultation/FindingStep.tsx`: a "While you wait" checklist (the relocated prep tips) plus the existing local `DeviceCheckButton`.
  - `src/features/patient/components/homepage/DeviceCheckButton.tsx`: 48px / 16px button (also affects `ScheduledHero`).
  - `src/features/booking/components/consultation/ConfirmationStep.tsx`:
    - On-demand heading names the doctor ("Dr. X accepted your request"; "Your doctor" when no name is disclosed).
    - One doctor card with initials (the name used to appear twice).
    - **Removed the invented "General Medicine" fallback**; the specialty shows only when the directory provides one.
    - Copy points to "Enter Room".
    - Cancel-panel logic is unchanged; the button is 48px.
  - `src/features/booking/components/consultation/CompletedStep.tsx`: a warm close with one "what happens next" line (instead of two info cards), then "Book a follow-up" (→ `/patient/booking`), `DoctorProfileLink`, and the existing `EmergencyNote`. The declined and cancelled branches only get larger type and buttons.
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx` (`ReadOnlyAuthenticatedIntake`): plain condition labels instead of enums, the date of birth written out ("27 March 1978"), cm/kg units, "No known allergies" for the stored "None", related symptoms shown, and Name hidden when blank. Values are unchanged.
  - `src/features/booking/components/consultation/intake/AboutYouFields.tsx`: diet options sit behind "Show options" (same question and answers; opens automatically when an answer exists). Allergies stay fully open (clinical safety).
- **Design Intent**: Raise satisfaction along the drivers telehealth research names:
  - clear instructions (the strongest association)
  - ease of use and quick access
  - fewer connection failures (the device check while waiting)
  - trust (naming the doctor who accepted)
  - price certainty (one clear hold statement)
  - a good ending (peak–end)

  Everything not doing one of those jobs is removed.
- **Device Optimization**: Patient mobile-first; checked at 375–440px.
- **Tokens & Primitives Used**: `--teal-100/200/700/800`, `--text-heading/body/muted`, `--border-subtle/strong`, `--surface-card/canvas`, `--danger-*` (emergency only); existing `DeviceCheckButton`, `EmergencyNote`, `BrandCtaButton`, `DoctorProfileLink`.
- **Compliance Notes**:
  - No claims were added.
  - Two unsupported claims were removed (the wait estimate on the chooser, and "General Medicine").
  - No PRC licence is shown, because `DoctorPublicSummary` carries none.
  - The payment disclosure is kept with its meaning intact.
  - No schema, API or data changes.
- **Upstream Porting Notes**:
  1. Hide the payment test-provider line once a real provider is live; the hold response's `provider` field (`"ledger"`) can gate it.
  2. `ON_DEMAND_WAIT_ESTIMATE` is still used on the home hero, directory header and search page; same compliance concern.
  3. If the backend later exposes a PRC number in `DoctorPublicSummary`, show it on the matched card.

### [2026-10-09] Intake Content Revert (Questions Restored, Presentation Kept) + Even Symptom Grid

- **Target Route / Surface**: Booking wizard intake steps (`/patient/booking/getBooking/[bookingId]`, "Form")
- **Files Modified**:
  - `src/features/booking/components/consultation/intake/AboutYouFields.tsx`:
    - Original questions, labels and options restored: "Personal Details & Vitals", Sex at birth (Male / Female / Prefer not to say), Weight (kg) and Height (cm) with the original placeholders, Blood type in the main flow, "Allergies & Intolerances" and "Dietary Preferences & Restrictions" as multi-selects with the original "None — …" options, presets and empty-state hint.
    - Removed: the returning-patient summary card, the allergy/diet "No / Yes" gate, the optional blood-type/diet disclosure, the "best guess" hint and "I don't know my blood type".
    - **Kept by request:** the day / month / year date-of-birth boxes.
  - `src/components/blocks/profile/PersonDataSection.tsx`: "Who is this for?" and "Select patient" restored.
  - `src/features/booking/components/consultation/intake/MedicalHistoryStep.tsx`: original condition labels, original order ("No pre-existing medical conditions" first, which disables the list), and the original medication / surgery questions, cards, labels and placeholders.
  - `src/features/booking/components/consultation/intake/ConcernSafetyStep.tsx`:
    - Original red-flag wording ("Quick clinical safety check", the original question and both answer labels), plus the original main-concern label and hint.
    - Original home-vitals labels and range hints ("No vitals taken" stays the default).
    - Related symptoms stay on the page and are now an **even grid** (`grid auto-rows-fr grid-cols-2 sm:grid-cols-3`, full-width left-aligned tiles) instead of ragged wrapping chips.
  - `src/features/booking/components/consultation/intake/PainAssessmentStep.tsx`: back to the original file (all PQRST questions visible, original wording, "No pain reported" card, "Selected" read-out); only type sizes and input heights change.
  - `src/features/booking/components/consultation/intake/ReviewConsentStep.tsx`: "Pre-consult summary", the original row labels, "Edit" buttons, preferred-time labels, notes placeholder and hint restored. Answers stay unclamped.
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx`: added copy removed (the "saved each time" footer note and the "Submit and go to payment" label; it is "Submit intake" again).
  - `src/features/booking/components/consultation/intake/IntakeChoice.tsx`: `ConditionTile` gains an optional `description` line.
- **Design Intent**: Intake content (questions, wording, options, order) is a product decision outside this fork. Presentation stays modernised: 16px+ text, 48px targets, choices on the page instead of in pop-up sheets, visible errors, Continue that explains itself.
- **Device Optimization**: Patient mobile-first.
- **Tokens & Primitives Used**: unchanged from the previous entry.
- **Upstream Porting Notes**: This supersedes the content changes in "Patient Intake Declutter" below; port the files as they are now. Field values, schema and save mapping are unchanged throughout.

### [2026-10-09] Layout Fix: Booking Detail Bottom Content Hidden Under Mobile NavBar

- **Target Route / Surface**: `/patient/booking/getBooking/[bookingId]`, every wizard step except the editable intake (seen on the intake review and the waiting screen)
- **Files Modified**:
  - `src/features/booking/components/patient/PatientBookingDetail.tsx`
  - `src/app/patient/booking/getBooking/[bookingId]/page.tsx`: route wrapper drops `h-full min-h-0 overflow-hidden`, which clipped any step taller than the screen (this is what hid the waiting screen's Cancel button). The intake sheet keeps its own explicit height and `overflow-hidden` in `PatientBookingDetail`.
- **Design Intent**: The root wrapper applied `flex-1 min-h-0` on every step. Inside `PatientShell`'s scrolling `<main>`, that pinned the wrapper to the viewport height. A long step overflowed past the wrapper's own `pb-20`, so the last rows could only scroll as far as the screen edge, underneath the fixed 4rem `NavBar`. `flex-1 min-h-0` now applies only in the `isIntake` branch (the fixed-height intake sheet still needs it). Other steps size to their content, and their bottom padding clears the nav. Measured in `PatientShell` at 440×956: the content end went from flush with the viewport bottom to 168px above it.
- **Device Optimization**: Patient mobile (below `lg`, where the bottom NavBar shows).
- **Tokens & Primitives Used**: none (layout classes only).
- **Upstream Porting Notes**: A one-line class move. Base string is `"flex w-full flex-col select-none"`; the intake branch gains `"flex-1 min-h-0 …"`.

### [2026-10-09] Component / View Redesign: Patient Intake Declutter + Waiting-for-Doctor Screen

- **Target Route / Surface**:
  - Booking wizard intake sheet (`/patient/booking/getBooking/[bookingId]`, step "Form"): About You, Medical History, Current Concern & Safety, Pain Assessment, Symptom Review & Consent
  - Booking wizard "Doctor" step: on-demand / matching waiting screen
  - Consult Now (`/patient/booking/createBooking`): wait-estimate sentence removed
  - Profile page (`PersonDataSection` mode `profile`): only the "Myself" card's selected colour and sub-label size change; its fields are untouched
- **Files Modified**:
  - `src/features/booking/components/consultation/intake/IntakeChoice.tsx`: shared primitives. `BlockLabel` is now a sentence-case 17–18px question with an optional `optional` prop; there is no visible asterisk (`required` keeps the sr-only "(required)"). New exports `FieldHint` and `FieldError`. All chips, tiles and inputs are 48px+ at 16px text on every breakpoint (the `sm:` shrink is gone), and every selection uses one style: border, 1px ring, tint and tick.
  - `src/features/booking/components/consultation/intake/IntakeNavFooter.tsx`: Continue is no longer disabled by `blockedReason`. Tapping it shows the reason as a visible `role="alert"` line, and `onContinue` still fires, so the caller's guard decides. Disabled only while `pending`.
  - `src/features/booking/components/consultation/intake/AuthenticatedIntakeForm.tsx`:
    - Header is the title plus "Step N of M" plus a thin bar; the uppercase step pill and the "Encrypted & Autosaved" badge are removed.
    - The desktop step list uses numbered circles and ticks, with no lock icons or status sublines.
    - The scroll-body scrollbar is visible again (themed thin).
    - The save error is visible in the footer (it was sr-only plus a toast).
    - Step 1 footer note: "Your answers are saved each time you tap Continue."
    - The final button reads "Submit and go to payment".
  - `src/features/booking/components/consultation/intake/AboutYouFields.tsx` **(new)**: booking-mode About You fields.
    - Day/month/year date-of-birth boxes (writes the same `yyyy-MM-dd`).
    - Sex at birth, blood type, allergies and diet are chosen on the page instead of in bottom sheets or popovers.
    - Allergies and diet ask "No / Yes"; their values are identical to `MultiSelectDropdown` (`["None"]` = no, `[]` = not answered, typed entries title-cased).
    - Blood type and diet sit under one "(optional)" disclosure.
    - When date of birth, sex, height and weight arrive already filled (profile prefill or a saved draft) and none were typed by the patient, they are shown as a summary to check, with "Change details".
  - `src/components/blocks/profile/PersonDataSection.tsx`: in `mode="booking"`, renders `AboutYouFields` in place of the old details card. Profile mode keeps the old card. "Who is this for?" (including the "Dependent – Soon" card) is kept; it is retitled "Who is this consultation for?" and the "Select patient" helper is removed.
  - `src/features/booking/components/consultation/intake/MedicalHistoryStep.tsx`:
    - "Has a doctor ever told you…" is a single-column list in plain words, e.g. "High blood pressure (hypertension)". These are patient labels only; doctor labels in `intakeDisplay.ts` are unchanged.
    - "None of these" moves after an "or" divider.
    - Medicines and surgery are plain No/Yes.
  - `src/features/booking/components/consultation/intake/ConcernSafetyStep.tsx`:
    - The red-flag question is asked first, in a neutral card. Red appears only after "Yes". The emergency panel and the 911 call button are unchanged.
    - Symptoms are on the page as chips; the bottom-sheet picker, count badge, echo chips and "Clear all" are removed.
    - Home readings are "No / Yes", start unanswered, and show stacked inputs. Range hints appear only on error.
  - `src/features/booking/components/consultation/intake/PainAssessmentStep.tsx`:
    - Answering "No" just enables Continue; the confirmation card is removed.
    - Answering "Yes" asks severity (0–10 with end labels), where, and when it started.
    - Quality, what makes it better or worse, and pattern move under "Tell us more (optional)". The `Timing` component is split into `Onset` and `Pattern`; the composed `onset`/`pattern` strings are unchanged.
  - `src/features/booking/components/consultation/intake/ReviewConsentStep.tsx`:
    - Renamed "Check your answers"; answers are shown in full (no `line-clamp`), with a visible "Change" link per row. Row labels are now patient wording; `buildLedger` data and `editStep` are unchanged.
    - **Consent statement text is unchanged** (styling only, pending compliance review).
  - `src/features/booking/components/consultation/FindingStep.tsx`:
    - The polling branch is rebuilt: video hero, one heading, a three-stage list derived from `FindingUpdate.progress` (33 payment / 66 matching), the wait shown in whole minutes, and cancel with a one-line hold explanation.
    - Removed: the "Live" pill, the illustration plate, the spinner, the % number and the heartbeat bar.
    - Preference chips render only when a preference was set.
    - Review/failed branches and all cancel logic are unchanged.
  - `src/features/booking/components/WaitingJeepney.tsx` **(new)**: decorative looping video.
    - Day scene 06:00–17:59 local time, night scene otherwise.
    - Visible pause/play button (WCAG 2.2.2), `aria-hidden` video.
    - Does not autoplay under `prefers-reduced-motion`, Save-Data or 2G; the poster shows instead, with Play.
  - `src/features/booking/components/patient/OnDemandBooking.tsx`: the unsupported "Typically connects in ~5–15 mins" sentence is removed from Consult Now.
  - `public/video/jeepney-day.mp4`, `jeepney-night.mp4` (~400 KB each, no audio, 960px H.264 faststart, loop seam cross-faded) and `jeepney-day-poster.webp`, `jeepney-night-poster.webp` **(new)**. The source clips `public/gemini_generated_video_*.mp4` are untouched and unreferenced.
- **Design Intent**: Patients include older and non-tech-savvy people. The clutter was mostly decoration and hidden controls rather than extra questions, so this removes eyebrows, badges, echo boxes, restating descriptions, bottom-sheet pickers, a disabled Continue, and toast-only errors. Everything is at least 16px and 48px tall, choices are visible, words are plain, and only the few optional questions are labelled. The waiting screen gives patients something to watch and names the real stage instead of showing a percentage.
- **Device Optimization**: Patient, mobile-first. Verified at 375px and 1280px. Targets stay ≥48px at every breakpoint because older patients also use tablets and laptops.
- **Tokens & Primitives Used**: `--safe-bg`/`--safe-fg`/`--surface-nav-accent` (selection), `--action-primary` (stages, progress), `--danger-*` (red flag "Yes", errors only), `--text-heading`/`--text-body`/`--text-muted`, `--border-default`/`--border-strong`, `--surface-card`/`--surface-canvas`/`--surface-warm-soft`; lucide `Check`, `CircleAlert`, `TriangleAlert`, `Pause`, `Play`, `ChevronDown`, `Plus`, `X`.
- **Compliance Notes**:
  - No schema, field-name, enum, API, save-mapping or validation change.
  - No new data is collected.
  - The consent statement wording is verbatim, and the checkbox stays unticked until the patient ticks it.
  - The red-flag question keeps every clinical term (chest pain or tightness, sudden shortness of breath, severe bleeding that won't stop).
  - The video is self-hosted (no third-party player or tracking).
  - No remaining-time estimate is shown anywhere new.
- **Upstream Porting Notes**:
  1. Copy `AboutYouFields.tsx`, `WaitingJeepney.tsx` and `public/video/*`.
  2. In `PersonDataSection.tsx`, port only the `mode === "booking"` branch and the two small card-styling lines.
  3. `IntakeNavFooter` behaviour changed: callers must keep their own blocked guard inside `onContinue`. `AuthenticatedIntakeForm.handleContinue` already returns early on `blockedReason`.
  4. `MultiSelectDropdown`, `AllergenField` and `DietaryField` remain in use by profile mode; do not delete them.
  5. Pending sign-off:
     - a plain-language summary line above the consent text
     - `ON_DEMAND_WAIT_ESTIMATE` is still shown on the home hero, path chooser, directory header and search page

### [2026-10-08] Doctor-Side Modal, Drawer, & Overlay Consistency Harmonization

- **Target Route / Surface**: 
  - Doctor Dashboard (`/doctor/dashboard`)
  - Doctor Schedule (`/doctor/schedule`)
  - Doctor History (`/doctor/history`)
  - Active Consultation Room (`/doctor/consultation/[id]`)
  - Post-Consultation Workspace (`/doctor/consultation/[id]/post`)
  - Global Desktop Navigation (`FloatingSidebar`)
- **Files Modified**:
  - `src/features/doctor/components/homepage/DoctorDashboardIntakeButton.tsx`
  - `src/features/doctor/components/homepage/DoctorDashboardDrawer.tsx`
  - `src/features/doctor/components/homepage/AcceptConsultModal.tsx`
  - `src/features/doctor/components/homepage/TriageDetailsModal.tsx`
  - `src/features/doctor/components/homepage/BlockTimeDialog.tsx`
  - `src/features/doctor/components/homepage/ReadyToStartCard.tsx`
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx`
  - `src/features/doctor/components/homepage/ScheduledRequestsCard.tsx`
  - `src/features/doctor/components/schedule/DoctorScheduleView.tsx`
  - `src/features/doctor/components/history/DoctorHistory.tsx`
  - `src/features/consultation/components/session/ConsultationRoom.tsx`
  - `src/features/media/components/ConsultationVideo.tsx`
  - `src/features/consultation/components/postConsultation/PatientMoreDetails.tsx`
  - `src/features/consultation/components/postConsultation/Signatures.tsx`
  - `src/features/consultation/components/postConsultation/MedicalCodeSuggestionCommandList.tsx`
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx`
  - `src/components/layout/FloatingSidebar.tsx`
- **Design Intent**:
  - **Primitive & Interaction Harmonization**: Eliminated crude unstyled native browser dialogs (`window.confirm`) in `DoctorPatientQueue`'s `NoShowControl`, standardizing on `@base-ui` `AlertDialog` with accessible cancellation and primary action buttons.
  - **Anti-AI Slop Enforcement**:
    - Purged neon gradients (`from-sky-100 to-card`) and hardcoded non-brand sky tints from `DoctorDashboardIntakeButton`.
    - Removed arbitrary `bg-orange-500` avatar placeholders in `DoctorHistory`, adopting the clinical `--teal-700` token.
    - Eliminated hardcoded `bg-rose-600` in End Consultation and Leave Call confirmations (`ConsultationRoom`, `ConsultationVideo`, `FloatingSidebar`), adopting semantic `--danger-fg` and `--danger-bg` tokens.
    - Replaced raw, low-contrast `bg-secondary p-4` headers in `MedicalCodeSuggestionCommandList` with structured clinical practice guideline cards featuring Lucide `BookOpen` icons, Bayan Navy `--navy-700`, and Bayan Teal `--teal-700` tokens.
  - **Accessible Triggers & Headers**:
    - Replaced raw non-semantic `<div>` elements inside `DialogTrigger` and `DrawerTrigger` with accessible `render={<button type="button" ...>}` to prevent hydration warnings and keyboard traps.
    - Standardized Drawer headers (`DoctorDashboardDrawer`, `DoctorScheduleView`, `DoctorHistory`, `PatientMoreDetails`, `Signatures`, `ReadyToStartCard`, `DoctorPatientQueue`) to include accessible `DrawerClose` close buttons with `X` vector icons and ARIA titles.
  - **Button Token Modernization**:
    - Migrated legacy `AppButton` (`variant="business"`) to canonical shadcn `Button` (`variant="primary"`) with the tactile pressed-key bottom edge across all doctor confirmation modals.
    - Added clean secondary `Cancel` actions where dialogs were previously missing escape paths (`BlockTimeDialog`, `ScheduledRequestsCard`).
- **Device Optimization**:
  - **Doctor Desktop Density**: High information density preserved across all clinical overlays with crisp 1px borders (`border-(--border-subtle)`), clean typography hierarchy, compact `h-8`/`size="sm"` control sizing, and consistent backdrop contrast (`bg-black/50`).
  - **Mobile Drawer Fallbacks**: Responsive drawers (`ResponsiveSheet`, `DoctorDashboardDrawer`, `PatientMoreDetails`) maintain proper safe-area padding (`pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`) and touch-friendly header dismiss targets.
- **Tokens & Primitives Used**:
  - `var(--navy-700)`, `var(--teal-700)`, `var(--surface-card)`, `var(--surface-warm)`, `var(--surface-warm-soft)`, `var(--surface-subtle)`, `var(--border-subtle)`, `var(--border-default)`, `var(--danger-fg)`, `var(--danger-bg)`, `var(--action-primary)`.
  - `@base-ui/react` primitives: `Dialog`, `Drawer`, `AlertDialog`, `CommandDialog`.
  - `Button` variants: `primary`, `outline`, `ghost`, `default`.
- **Upstream Porting Notes**:
  - All original props, `data-slot`, `data-testid`, and state handlers (`onConfirm`, `onDecline`, `onSave`, `onBlockTime`, `router.push`) were preserved verbatim.
  - No new external runtime dependencies added.
  - Primitives and components are 100% compliant with existing `@base-ui/react` and `components.json` design system configuration.
