# BayanHealth UI/UX Changelog: Micro-Interaction Pass (MI)

This log covers the micro-interaction and feedback-motion pass on branch **`ui/micro-interactions`**. Entries use the schema in [`UI_UX_AGENT.md`](./UI_UX_AGENT.md) §6. The upstream agent should port them following [`UI_HANDOFF.md`](./UI_HANDOFF.md). [`CHANGELOG_UI_V4.md`](./CHANGELOG_UI_V4.md) is still the main log and points here.

The theme is "calm certainty". Every tap gets a fast, physical response from the control itself. The few outcomes that matter (booking confirmed, doctor accepted, consult complete, document signed or released) get one drawn mark that plays once. The CEO's benchmark is Grab:

| From Grab | Decision |
| --- | --- |
| Tactile pill presses | Kept |
| Fast chip responses | Kept |
| Trip-tracker timeline that fills | Kept |
| Skeleton handover | Kept |
| Radar pulses while searching | Left out: the repo bans pulsing dots, and they raise anxiety while a sick patient waits |
| Confetti and coin bursts | Left out: celebrating a medical outcome trivialises it |
| Haptics | Left out: the web Vibration API does not work on iOS Safari, so the feel would differ by phone |

No logic, API, contract, schema or payload changed anywhere in this pass. No dependency was added.

---

## Log Entries

### [2026-11-05] Motion Foundation: Tokens, Keyframes, Reduced Motion and the Guard Test

- **Target Route / Surface**: App-wide.
- **Files Modified**:
  - `src/styles/bayanhealth-tokens.css`: new `--dur-select: 160ms`. Comments on `--dur-fast` (press) and `--dur-select` (selection).
  - `src/app/globals.css`: a new `@theme inline` block, one `@media (prefers-reduced-motion: reduce)` block, and a `fade-only-reduced` keyframe. The comment on `html` no longer mentions `TapFeedback`.
  - `src/styles/motion-guard.test.ts` (new).
- **Animation tokens** (Tailwind utilities `animate-*`):

  | Utility | Keyframe | Timing |
  | --- | --- | --- |
  | `animate-check-draw` | `stroke-draw` | 160ms, `--ease-out` |
  | `animate-success-ring` | `stroke-draw` | 360ms |
  | `animate-success-check` | `stroke-draw` | 240ms, 280ms delay |
  | `animate-success-ring-sm` | `stroke-draw` | 200ms |
  | `animate-success-check-sm` | `stroke-draw` | 160ms, 160ms delay (320ms total) |
  | `animate-fill-down` | `fill-down` (`scaleY` 0 to 1) | 400ms |

  `stroke-draw` moves `stroke-dashoffset` from 1 to 0. Opacity starts at 0, so a round line cap does not show as a dot while a delayed stroke waits. Shapes use `pathLength="1"` with `stroke-dasharray: 1`. With no animation, the stroke rests fully drawn.
- **Reduced motion (WCAG 2.3.3)**: movement and scaling are removed. Colour and opacity stay, so every state change remains visible.
  - Every `--tw-enter-*` / `--tw-exit-*` translate, scale, rotate and blur variable is reset on `[class*="animate-in"]`, `[class*="animate-out"]`. Each tw-animate-css entrance becomes a plain fade. This covers popovers, selects, dropdowns, tooltips, tabs, and the step and toast fades.
  - `scale: none` on `[data-starting-style]` / `[data-ending-style]`, so Base UI dialogs and alert dialogs fade without growing. Their resting `-translate-1/2` centring is untouched. That is why `translate` is not reset globally: resetting it would throw dialogs off-centre for one frame.
  - `translate: none` only on `[data-slot="sheet-content"]` while it is starting or ending, so sheets fade instead of sliding 2.5rem.
  - `animation: none` on `.animate-pulse` (skeletons, the video live dot), `.animate-cursor-tap-ping`, every stroke-draw utility, and `animate-fill-down`.
  - The sign-up step slides (`.animate-slide-from-right/left`) become a 0.3s fade.
  - `.scroll-smooth` becomes `scroll-behavior: auto`.
  - Drawer swipe transforms are not touched. The user drives that movement.
- **HoldToRelease safety (critical)**: `HoldToReleaseButton` (`ArtifactCard.tsx`) releases a document when its inline 2-second width transition ends. No rule in this pass, global or reduced-motion, touches `transition` or `transition-duration`. If one did, a single tap could release a document to the patient. The guard test enforces this.
- **Guard test** (`npm test`, 7 tests):
  - the reduced-motion block resets all ten movement variables;
  - every custom `.animate-*` class and `--animate-*` token in `globals.css` has a reduced-motion rule;
  - no reduced-motion block in any `src/**/*.css` contains `transition` or `transition-duration`;
  - every `@keyframes` in `globals.css` animates only `transform`, `opacity`, `scale`, `translate` or `stroke-dashoffset`;
  - no `animate-ping` / `animate-bounce` anywhere in `src`;
  - `layout.tsx` does not render `<TapFeedback`.
- **Performance budget**: new motion uses only transform, opacity, scale, translate and stroke-dashoffset. There is no animated blur or shadow and no `will-change`. The existing `Reveal` grid-rows animation and the HoldToRelease width transition are the only exceptions, and both predate this pass.
- **Device Optimization**: Both.
- **Upstream Porting Notes**: Port this entry first. The `@theme` block uses `--dur-*` / `--ease-out` from `bayanhealth-tokens.css`, so port the token line with it. **Do not add** a blanket `* { transition-duration: 0.01ms !important }` reduced-motion snippet in the main repo. It breaks the hold-to-release safety.

### [2026-11-05] Press Feedback: Global Tap Ripple Unmounted, Controls Press Themselves

- **Target Route / Surface**: App-wide.
- **Files Modified**:
  - `src/app/layout.tsx`: `<TapFeedback />` and its import removed, with a comment in their place. **`src/components/blocks/TapFeedBack.tsx` and its `cursor-tap-ping` keyframes are kept, unmounted, not deleted**, in case the main repo still uses them. The keyframe has a reduced-motion rule anyway.
  - `src/components/ui/button.tsx`: base gains `duration-(--dur-fast) ease-(--ease-out)`. The 1px press nudge is unchanged. No tap-highlight class was added, because `html` already sets `-webkit-tap-highlight-color: transparent` globally.
  - `src/features/booking/components/BrandUI.tsx` (`BrandCtaButton`): pressed state `enabled:active:translate-y-[2px] enabled:active:bg-(--action-primary-active) enabled:active:shadow-none`, with `motion-reduce:enabled:active:translate-y-0`. The inset "key" edge collapses and the pill sinks into it. Transition: background-color, box-shadow and translate over 120ms. Disabled is unchanged.
  - `src/features/booking/components/consultation/intake/IntakeNavFooter.tsx`: the Back button gets the shared intake press (below).
  - `src/features/patient/components/homepage/PatientHome.tsx`: the service tiles press to `active:scale-[0.97]` with `active:translate-y-0`, which cancels the hover lift. Under reduced motion there is no hover lift and no press scale.
- **Design Intent**: The ripple fired on every pointerdown anywhere, desktop included. It drew a teal circle over whatever was tapped and had no reduced-motion guard. Feedback now comes from the pressed control.
- **Device Optimization**: Patient mobile first (the CTA, tiles and Back are the main thumb targets). Doctor buttons keep their dense 1px nudge.
- **Tokens & Primitives Used**: `--dur-fast`, `--ease-out`, `--action-primary-active`, `--shadow-btn-inset`.
- **Upstream Porting Notes**: Check the main repo for other `TapFeedback` mounts before removing this one.

### [2026-11-05] Intake Choices: Drawn Checks, Radio Dot, Sliding Yes/No

- **Target Route / Surface**: `/patient/booking/getBooking/[bookingId]` (intake). Every use of `IntakeChoice`.
- **Files Modified**:
  - `src/features/booking/components/consultation/intake/IntakeChoice.tsx`:
    - New shared `PRESS` constant: colour, border, ring and scale ease over 120ms, `enabled:active:scale-[0.98]`, and `motion-reduce:enabled:active:scale-100`.
    - `ChipButton` / `ConditionTile`: the check is now `DrawnCheck` (Lucide `check` geometry) and draws in over 160ms.
    - `ChoiceCard`: the radio dot enters with `zoom-in-40 fade-in` over 160ms.
    - `SegmentedToggle`: one `data-slot="segmented-indicator"` highlight slides between options (`translate`, 200ms) instead of each button repainting. It mounts at its option on the first answer, so it never slides in from the left. Its width and offset come from the grid's 4px padding and gaps, computed inline. The `role="radiogroup"` / `role="radio"` / `aria-checked` markup is unchanged. The selected button keeps its weight and colour.
  - `src/features/booking/components/consultation/intake/SafetyScreenFields.tsx` (`AnswerButton`): press state only. The safety answers and the emergency path get no other motion.
  - `src/hooks/use-motion-moment.ts` (new): `useChangedSinceMount(value)`.
- **Behaviour detail**: checks and dots animate only when the answer changes after the control mounts. Answers restored from the intake draft, or shown again after Back, appear settled, so returning to a page does not replay a burst of animation.
- **Device Optimization**: Patient, mobile first. Targets are unchanged (48px or more).
- **Tokens & Primitives Used**: `--dur-fast`, `--dur-select`, `--dur-base`, `--ease-out`, `--safe-bg`, `--safe-fg`, `--surface-nav-accent`, `DrawnCheck`.
- **Upstream Porting Notes**: Props, handlers and ARIA are unchanged. Port `success-mark.tsx` and `use-motion-moment.ts` first.

### [2026-11-05] Bottom Navs: Sliding Active Pill and Icon Press

- **Target Route / Surface**: Patient shell (`NavBar`, below `lg`) and doctor shell (`DoctorMobileNav`, below `lg`).
- **Files Modified**:
  - `src/features/patient/components/NavBar.tsx`: one `data-slot="patient-nav-indicator"` pill (`--surface-accent-soft`) slides to the active tab (`translate`, 250ms). The active Link no longer paints its own background. Icons press to `scale-90` through `group/tab`. `aria-current="page"` is unchanged. Under reduced motion the pill moves without sliding.
  - `src/features/doctor/components/DoctorMobileNav.tsx`: icon press only (with its queue badge), `duration-(--dur-fast)`.
- **Design Intent**: The bar shows where you went instead of repainting two tabs. The pill is mounted at its tab, so it never slides in from the edge on first paint.
- **Device Optimization**: Patient mobile first. Doctor stays quiet.
- **Upstream Porting Notes**: `NavBar` must stay mounted across routes (it is, in `PatientShell`) for the slide to show.

### [2026-11-05] Status Feedback: "Saved" Settles, Blocked Reason Arrives Calmly

- **Target Route / Surface**: Intake header, intake action bar, the doctor's notes (Notes tab in the room, and the post-consult workspace).
- **Files Modified**:
  - `intake/AuthenticatedIntakeForm.tsx`: the save status is keyed by its text. "Saved on this device" changing to "Saved" fades in over 200ms, and its check redraws. The `aria-live` `<p>` is unchanged.
  - `intake/IntakeNavFooter.tsx`: the `blockedReason` alert is keyed by its text and enters with a 150ms fade and a 4px rise. It is colour and icon only. **There is no shake anywhere.**
  - `postConsultation/ClinicalNotesCard.tsx` (`NotesSaveState`): the text crossfades over 150ms. The `aria-live` span is unchanged.
- **Design Intent**: The status used to swap in place and looked like a flicker. Now it visibly settles.
- **Device Optimization**: Both. The doctor's version is opacity only and at most 150ms.

### [2026-11-05] Intake Pages Slide in the Direction of Travel

- **Target Route / Surface**: Intake sheet.
- **Files Modified**:
  - `intake/stepDirection.ts` (new): pure `stepDirection(prev, next)` and `stepEnterClass(direction)`.
  - `intake/stepDirection.test.ts` (new).
  - `intake/AuthenticatedIntakeForm.tsx`:
    - A UI-only `stepMotion` state, adjusted during render, records which way the page moved.
    - The step body is wrapped in `<div key={currentKey} data-slot="intake-step-body">`, which enters with a fade and a 12px slide over 220ms: from the right on Continue, from the left on Back or an earlier rail step.
    - `<main>` gains `overflow-x-hidden`, so the slide never flashes a horizontal scrollbar.
- **Not changed**: `navigateTo`, `focusHeading`, the save logic, the step keys, and focus moving to the `<h1>`. The step components already remounted per page, so the keyed wrapper changes no state lifetimes.
- **Reduced motion**: pages fade only.

### [2026-11-05] Skeleton-to-Content Handover

- **Target Route / Surface**: `/patient/booking/getBooking/[bookingId]`, `/patient` (home), `/patient/health` (overview).
- **Files Modified**:
  - `patient/PatientBookingDetail.tsx`: the hand-rolled `animate-pulse bg-gray-400` skeleton is replaced with `<Skeleton>`, keeping the same geometry. This removes a hard-coded palette colour and gains the reduced-motion fallback. The loaded page root fades in over 150ms. It persists across the 30s poll, so it fades only once.
  - `homepage/PatientHome.tsx`: the activity section fades in over 150ms after its loading block.
  - `homepage/HomePanel.tsx`: loaded children sit in a wrapper that repeats the section's column and gap (`flex min-h-0 flex-1 flex-col gap-3`), and they fade in over 150ms. The empty state fades the same way.
  - `health/HealthOverviewTab.tsx`: the identity metrics grid and the medicines list fade in over 150ms.
- **Not changed**: query hooks, loading conditions, and `healthStates.tsx` (its pulse rows are already covered by the global reduced-motion rule; the content belongs to the other tabs).
- **Rule**: handover is a fade with no movement, so nothing shifts as data lands.

### [2026-11-05] SuccessMark and Play-Once Memory; Booking Confirmed

- **Target Route / Surface**: Booking wizard, confirmation step.
- **Files Added / Modified**:
  - `src/lib/motionMoments.ts` (new, pure): `hasSeenMoment`, `markMomentSeen`, `claimMoment`.
    - Keys are `bh:moment:v1:{event}:{id}` in `sessionStorage`. They hold no health details.
    - Missing or blocked storage counts as "seen", so the mark renders static. A skipped animation is safe; a replaying one is not.
  - `src/lib/motionMoments.test.ts` (new, 7 tests).
  - `src/hooks/use-motion-moment.ts` (new): `useIsClient`, `usePlayOnce(key)`, `useChangedSinceMount(value)`. `usePlayOnce` reads on mount and marks the moment seen in an effect. It is false while server-rendering and hydrating, so there is no hydration mismatch.
  - `src/components/ui/success-mark.tsx` (new):
    - `SuccessMark`: Lucide `circle-check` geometry. The ring draws from 12 o'clock, then the check. `md` is about 520ms and `sm` about 320ms. Props: `momentKey` (required), `size`, `animate` (false renders static). It is `aria-hidden`, because the heading carries the meaning.
    - `DrawnCheck`: the drawn Lucide `check`.
  - `consultation/ConfirmationStep.tsx`:
    - `CheckCircle2` is replaced by `SuccessMark`. On-demand bookings use the key `doctor-accepted:{id}` (the same event `FindingStep` marks); scheduled bookings use `booking-confirmed:{id}`.
    - While the mark plays, the intake receipt and the doctor card reveal with a 250ms fade and 4px rise, at 120ms and 180ms (a 60ms stagger).
    - `isReview` renders everything static.
- **Device Optimization**: Patient mobile first. One mark plays at a time, because each event has a single key shared across the screens that show it.

### [2026-11-05] Waiting Timeline Fills; Doctor Accepted and Consultation Complete

- **Target Route / Surface**: Booking wizard, finding and completed steps.
- **Files Modified**:
  - `consultation/FindingStep.tsx`:
    - The stage list is extracted into a `FindingStage` row component, keyed by position. It used to be keyed by label, and a stage's label changes as it completes, so remounting would have skipped the motion.
    - When a stage completes while the patient watches, its dot fills (200ms colour), its check draws, and the connector below fills downward with `animate-fill-down` (`scaleY`, `origin-top`, 400ms) toward the next stage, like a trip tracker.
    - A stage already done when the screen opened renders settled. The current stage stays a solid dot. **There is no pulse.**
    - The "Your assigned doctor" heading (when not reviewing) shows `SuccessMark`, keyed `doctor-accepted:{id}`. `StepHeading` gains an optional `icon` prop; by default it shows `UserSearch` as before.
    - `motion-reduce:animate-none` was added to the assigned and failed branches.
  - `consultation/CompletedStep.tsx`:
    - `CheckCircle2` is replaced by `SuccessMark`, keyed `consult-complete:{id}`.
    - `motion-reduce:animate-none` was added to the declined and cancelled fades.
- **Not changed**: the stage copy, the `sr-only` "(done)/(now)/(next)" labels, the `aria-live` message, `WaitingJeepney`, and the emergency surfaces (`EmergencyCareCard`, the safety hard stop), which stay still.

### [2026-11-05] Doctor: Signed / Released Mark, Calmer Tabs

- **Target Route / Surface**: `/doctor/post-consultation/id` (Deliverables), and every `Tabs` panel.
- **Files Modified**:
  - `postConsultation/ArtifactCard.tsx`:
    - The "Released to the patient" line uses `SuccessMark size="sm"` (about 320ms), keyed `released:{artifactId}`.
    - The non-releasable "Signed and kept in your records" line gains the same mark, keyed `signed:{artifactId}`.
    - Both animate only when the status changed while the card was open (`useChangedSinceMount(artifact.lifecycleStatus)`). Reopening an older document shows them static.
    - **`HoldToReleaseButton` is not modified.**
  - `src/components/ui/tabs.tsx` (`TabsContent`): 300ms fade with an 8px drop becomes a 150ms fade with a 4px drop, eased out.
- **Not changed**: queue accept (toast plus the existing spinner, no row animation), and the `primary` Button press.
- **Device Optimization**: Doctor desktop first. Everything is 150ms or less except the 320ms release mark.

### [2026-11-05] Booking Header: Intake Subtitle Removed

- **Target Route / Surface**: `/patient/booking/getBooking/[bookingId]`, the header during the intake.
- **Files Modified**: `src/features/booking/components/patient/PatientBookingDetail.tsx` (`BookingContextBar`).
- **What changed**: the intake subtitle "Complete intake to match with a PRC-licensed physician." was removed. During intake the header now shows only the back button, "{Service} Intake" and the Draft badge. After intake, the subtitle (doctor · appointment time) is unchanged.
- **Design Intent**: at 390px the line was cut off mid-word ("…PRC-licensed physic…"), so patients could not read it. It also repeated what the screen already says: the title names the intake, the Draft badge marks it unfinished, and the intake's own header shows "Step X of Y". Removing it also makes the header one line shorter on mobile. Requested by the user.
- **Note**: "PRC-licensed" is a trust message. It still appears on Home ("100% PRC-licensed doctors").
- **Device Optimization**: Patient mobile first.
- **Upstream Porting Notes**: Copy and markup only. If the main repo wants the PRC reassurance during intake, place it inside the intake body where it can wrap, not in a truncated header line.

### [2026-11-05] Patient Cancel Confirmations: Bottom Sheet on Mobile

- **Target Route / Surface**: `/patient/booking/getBooking/[bookingId]`, two confirmations: "Cancel this request?" (waiting for a doctor) and "Cancel this booking?" (after a doctor accepts).
- **Files Modified**:
  - `src/features/booking/components/consultation/FindingStep.tsx` (`OnDemandWaitPanel`)
  - `src/features/booking/components/consultation/ConfirmationStep.tsx` (`PostAcceptanceCancelPanel`)
  - `src/components/ui/responsive-sheet.tsx` (phone header alignment)
- **Problem**: both used a small centred `AlertDialog` on every screen size. On a phone that meant 32px buttons far from the thumb and centred text. Every other confirmation in the app uses `ResponsiveSheet`: a bottom sheet below `lg`, a dialog on desktop.
- **What changed**:
  - Both now use `ResponsiveSheet`.
  - On phones: a bottom sheet with title and copy left-aligned, and the two actions stacked full width at 48px under the thumb, the confirm first.
  - On desktop: the standard dialog with a close button and a footer row, the confirm on the right.
  - The confirm button is the `primary` Button (teal pill). "Keep waiting" / "Keep booking" is `outline`.
  - The trigger is a plain `Button` that opens the sheet.
  - Unchanged: copy, the `pastGrace` wording, `cancel()`, the `disabled`/`Cancelling…` state, and every `data-slot`.
- **Shared fix**: on a phone, `ResponsiveSheet` centred its description under a left-aligned title (the drawer primitive's `group-data-[swipe-axis=y]:text-center` beat `text-left`). The header now overrides it, so the description lines up with the title. This also fixes the doctor sheets that use `ResponsiveSheet` (sign, discard, batch sign, Send to ER, clear assessment, Finish).
- **Verified**: headless Chrome at 390×844, light and dark, and 1440×900. Both phone buttons measure 340×48 and sit at the bottom of the sheet; desktop buttons are 44px. Typecheck clean, ESLint 0 errors.
- **Device Optimization**: Patient mobile first.
- **Upstream Porting Notes**: Behaviour is unchanged. `AlertDialog` closed itself on its action; the confirm now closes the sheet and then calls `cancel()`, the same order.

### [2026-11-05] Verification

- `npm run typecheck`: clean.
- `npm test`: 68/68 across 9 files, of which 17 tests are new (`motion-guard` 7, `motionMoments` 7, `stepDirection` 3).
- ESLint on every changed file: 0 errors. The one warning (`ClinicalNotesCard.tsx:154`, set-state-in-effect) predates this pass.
- Impeccable `detect` ran on the changed `.tsx`/`.css` files and reported no findings. It is regex-only on source, so the element rules did not run.
- **Headless Chrome through the DevTools protocol**, on a temporary dev-only harness route (since deleted). It ran at 390×844 and 1440×900, light and dark, with normal and reduced motion:
  - The hold probe (an inline 2000ms transition) reads `2s` in every mode, reduced motion included.
  - The pressed `BrandCtaButton` reads `translate: 0 2px` with its inset shadow gone. Under reduced motion it reads `translate: 0` and keeps the colour change.
  - **Normal motion**:
    - the chip check runs `stroke-draw`;
    - the segmented indicator transitions `translate` (sampled mid-slide at about 90%);
    - the timeline runs `fill-down` and `stroke-draw`.
  - **Reduced motion**: none of those animations run. Only the colour transitions remain.
  - **Frame sampling of the confirmation mark**: the ring draws from 0 to about 330ms, the check from 280ms to about 460ms, and the doctor card fades in from 180ms to about 400ms.
  - **CPU throttled 4×** (dev build), during the mark plus a chip tap: 40 frames in 700ms, median 16.6ms, p95 18.6ms, no frame over 50ms.
- **Not verified**:
  - A live run against the backend (real polling into accepted and completed, a real release).
  - `NavBar` sliding between real routes (it needs a signed-in patient). Its geometry matches `SegmentedToggle`, which was verified.
  - Paint flashing.
  - A full `next build`. The dev server compiled the CSS, and the new keyframes ran.
- **Screen recording for the Grab comparison**: not captured, because the tooling here takes stills only. To record it, open the booking flow on an Android phone (or Chrome DevTools device mode at 390px) and use the phone's screen recorder. Record: pick chips, then Continue, then the waiting timeline, then doctor accepted. Put it side by side with Grab's book-to-tracking flow.

---

## Upstream Porting Order

1. `bayanhealth-tokens.css` (`--dur-select`), then `globals.css` (the `@theme` block, the reduced-motion block, `fade-only-reduced`), then `motion-guard.test.ts`.
2. `src/lib/motionMoments.ts` and its test, `src/hooks/use-motion-moment.ts`, `src/components/ui/success-mark.tsx`.
3. `button.tsx`, `BrandUI.tsx`, `tabs.tsx`, then `layout.tsx` (unmount `TapFeedback`; keep the file).
4. `IntakeChoice.tsx`, `SafetyScreenFields.tsx`, `IntakeNavFooter.tsx`, `stepDirection.ts` and its test, `AuthenticatedIntakeForm.tsx`.
5. `NavBar.tsx`, `DoctorMobileNav.tsx`.
6. Screens: `ConfirmationStep`, `FindingStep`, `CompletedStep`, `PatientBookingDetail`, `PatientHome`, `HomePanel`, `HealthOverviewTab`, `ClinicalNotesCard`, `ArtifactCard`.

Each file's diff is UI-only and component-scoped. Keep `HoldToReleaseButton` byte-identical.
