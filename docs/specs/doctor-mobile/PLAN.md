# Doctor Mobile: UX Plan

> Status: **Phases 0–5 shipped; Phase 6 (validation with doctors) pending** (see "Implementation log" at the end) · Date: 2026-10-08 · Scope: every `/doctor/*` flow plus `/consultation/room/*` and `/doctor/post-consultation/*` below the `lg` breakpoint (< 1024px).
> Fork rules apply: UI only. No API, contract, store, or business-logic changes. Every shipped change is logged in `CHANGELOG_UI_V2.md`.

---

## 1. Job and audience

**Who:** Licensed Philippine physicians on BayanHealth. Mobile users skew younger, but the floor is a doctor with medium-to-little tech comfort. They use the app **on the go**: walking between wards, in a clinic hallway, in a car (as a passenger), at home at night. That means one hand, interrupted attention, a mid-range Android phone, and patchy mobile data.

**Mode:** *Operate*. The doctor comes to complete a task, not to browse. Speed, safety, and "what do I do next" outrank expression. The brand shows in precise details, not decoration.

**What doctors must be able to do fully on a phone (confirmed):**

| # | Job | Today's desktop surface |
|---|-----|-------------------------|
| 1 | Go on/off duty, see and triage incoming requests, accept/decline | `/doctor` → `DoctorCommandBar`, `DoctorPatientQueue`, `TriageDetailsModal`, `AcceptConsultModal` |
| 2 | Start/rejoin a consult, run video or chat, glance at intake | `/consultation/room/[bookingId]` → `ConsultationRoom`, `PatientIntakeReferenceTab`, `ConsultationChatPanel` |
| 3 | Finish documentation: Assess → draft → sign → release | `/doctor/post-consultation/id` → `AssessmentFirstWorkspace`, `DeliverablesDeck`, `ArtifactCard`, `Signatures` |
| 4 | Manage schedule, history, profile, signature, KYC | `/doctor/schedule`, `/doctor/history`, `/doctor/profile`, `/doctor/kyc` |

## 2. The problem today

1. **No navigation on phones.** `src/app/doctor/(homepage)/layout.tsx` hides the sidebar below `lg`, and nothing replaces it (the patient side has `NavBar`, the doctor side has none). A doctor on a phone is stranded on whatever page they land on.
2. **Desktop interaction models leak onto the phone.** Popovers (`AppointmentPopover`, `AvailabilityPopover`, `ShiftInspectorPopover`, `SchedulePopover`), centered dialogs, a week `TimeGrid`, and side-by-side rails collapse into long single-column stacks. Primary actions end up mid-page or off-screen.
3. **Too many equal-weight panels.** On a phone the "flight deck" becomes a scroll of cards with no single answer to *"what should I do right now?"*
4. **The post-consult workspace is a dense 70/30 two-rail editor.** Stacked on a phone, patient context (allergies!) scrolls away from the Rx being written.

## 3. Design thesis

**"One screen, one job, one big next step."** Each mobile screen answers one question and gives the doctor one obvious primary action in the thumb zone. Everything else is one tap away in a bottom sheet, never a hover, never a hidden gesture.

Six rules every screen must pass:

1. **Next action first.** The top of every screen states the status in plain words; the bottom holds the one primary button (sticky, safe-area aware, ≥ 48px, full width).
2. **Sheets, not popovers.** Every popover/dialog becomes a bottom sheet below `lg` (vaul `Drawer`, already installed). Desktop keeps its dialogs and popovers unchanged.
3. **Same destinations, different layout.** Mobile reuses `DOCTOR_NAV` exactly, the same rule the patient side follows, so a doctor who learned desktop is never lost.
4. **Safety stays pinned.** Allergies, red flags, and the patient's identity stay visible wherever a clinical decision is made (triage, consult, Rx).
5. **Gestures are shortcuts, never the only way.** Every swipe or drag has a visible button that does the same thing.
6. **Interruption-proof.** The doctor will be pulled away mid-task. Every screen shows where they are ("Step 2 of 3"), what's saved, and how to get back (a persistent "Return to consult" bar).

## 4. Information architecture

### Bottom bar (new, below `lg`)

Rendered from `DOCTOR_NAV`, with `comingSoon` items filtered out, exactly like the patient `NavBar`:

```
┌──────────┬──────────┬──────────┬──────────┐
│  ⌂ Today │ ▦ Calendar│ ▶ Consults│ ◯ Profile │
│   (3)    │          │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

- "Dashboard" is labelled **Today** on mobile only if we change `DOCTOR_NAV` for both breakpoints (recommended: rename to "Today" everywhere, which is one string in `nav-items.ts`). Otherwise keep "Dashboard".
- **Count badge on Today** = waiting requests, from the existing `useDoctorQueueSummary`. It's a solid count chip, not a pulsing dot.
- The bar is hidden inside the consult room and the post-consult workspace. Those are focused, full-screen tasks with their own exit.

### Persistent "live encounter" bar

If an encounter is active (`useActiveEncounter`), a slim bar sits directly above the bottom nav on every doctor screen:
`● In consult · Maria Santos · 12:04   [Return]`. This is how an interrupted doctor gets back in with one tap.

### Header

`DoctorHeader` compacts on mobile into a 56px bar: page title (left) and a notifications bell (right, existing `DoctorNotification` opened as a sheet). The theme toggle moves into Profile.

## 5. Screen-by-screen plan

### 5.1 Today (`/doctor`): triage between rounds

```
┌─────────────────────────────────┐
│ Good afternoon, Dr. Reyes       │
│ ┌─────────────────────────────┐ │
│ │ ON DUTY          [■■■■ ON ] │ │  ← big labelled switch, plain status
│ │ Patients can request you now│ │
│ └─────────────────────────────┘ │
│ NEXT UP                          │
│ ┌─────────────────────────────┐ │
│ │ URGENT · waiting 6 min      │ │  ← single "Next action" card
│ │ Sofia Hernandez, 7F         │ │
│ │ Fever 38.8°C × 2d, cough    │ │
│ │ ⚠ No known allergies        │ │
│ │ [ Review & accept      → ]  │ │
│ └─────────────────────────────┘ │
│ WAITING (2)                      │  ← compact rows, tap = triage sheet
│  Manuel Tan, 34M · Diarrhea ·4m │
│  ⚠ Penicillin                   │
│  Ramon Dela Cruz · 11:15 sched  │
│ LATER TODAY                      │
│  11:15  Ramon Dela Cruz  Video  │
│  14:00  —  free                 │
├─────────────────────────────────┤
│ ⌂Today  ▦Calendar ▶Consults ◯Me │
└─────────────────────────────────┘
```

- **Duty switch** (`DoctorDutyCard` / `DoctorCommandBar`): a full-width card with the switch and one sentence of consequence ("Patients can request you now" / "You're hidden from on-demand. Scheduled visits still happen."). Turning it off asks for confirmation if requests are waiting.
- **Next action card** is picked by fixed priority and computed in the view from existing hooks (no new data):
  1. active encounter → **Return to consult**
  2. accepted, not started → **Start consult** (with the existing `NoShowControl` beneath)
  3. ready-to-start scheduled → **Start consult**
  4. waiting on-demand request (most urgent / longest wait) → **Review & accept**
  5. next scheduled today → **View briefing**
  6. nothing → empty state: "You're all caught up. Wala pang naghihintay." plus a duty hint.
- **Waiting list:** one row per request (`queueCard.ts` data): name, age/sex, chief complaint, severity *text* badge (Urgent / Soon / Routine, using `--severity-*` tokens; color is never the only signal), wait time, allergy flag. Rows only open the triage sheet; there are no inline Accept buttons on mobile, which prevents a mis-tap accepting the wrong patient.
- **Metrics ribbon** (completed, live queue, payout) collapses to one tappable line under the greeting: "4 done · 3 waiting · ₱3,400 pending".
- **Recent consultations** move off Today (they live in Consults) to keep the screen short.
- `ScheduleCollisionBanner` stays as an inline alert directly above Next Up.

### 5.2 Triage → Accept (sheet flow)

```
┌─────────────────────────────────┐
│ ▬▬▬                              │  ← drag handle (and an ✕ button)
│ Sofia Hernandez · 7 F · URGENT  │
│ ⚠ Allergies: none reported      │  ← pinned, never scrolls away
│─────────────────────────────────│
│ Chief complaint                 │
│ Fever 38.8°C × 2 days, barking  │
│ cough at night                  │
│ Vitals  Temp 38.8 · HR 118 ·    │
│         SpO2 98%                │
│ Red flags   ▸ none flagged      │
│ Triage answers (mother) ▸       │  ← collapsible sections
│ Meds / history ▸                │
├─────────────────────────────────┤
│ [ Not now ]  [ Accept patient ] │  ← sticky footer, thumb zone
└─────────────────────────────────┘
```

- `TriageDetailsModal` + `BookingRequestContent` / `ReadyIntakeContent` render inside a full-height bottom sheet below `lg`, with snap points at 90% and 100%.
- Footer: **Not now** just closes the sheet. **Decline** appears only for scheduled requests, where `ScheduledRequestsCard` already supports it. On-demand requests have no decline today, and this plan doesn't add one.
- **Accept** opens the existing `AcceptConsultModal` content (its current Cancel / Confirm pair, unchanged) as a *second, short* sheet that names the patient and the consequence. It's the same confirm step, just mobile-shaped.
- After accepting, the sheet closes and the Next action card turns into **Start consult**, so the doctor can see the state change.

### 5.3 Consult room (`/consultation/room/[bookingId]`): video + pull-up intake

Confirmed model: **video fills the screen; intake is a pull-up sheet.**

```
┌─────────────────────────────────┐
│ Sofia H. · 7F · 12:04   [End]   │  ← slim top bar; End is red, top-right
│                                 │
│         PATIENT VIDEO           │
│                    ┌────┐       │
│                    │self│       │
│                    └────┘       │
│                                 │
│  [mic]  [cam]  [chat]  [flip]   │  ← controls, 56px circles
├─────────────────────────────────┤
│ ▬▬▬  Fever 38.8 ×2d · ⚠ None    │  ← PEEK (always visible):
│ Temp 38.8 · HR 118 · SpO2 98    │     complaint, allergy, vitals
└─────────────────────────────────┘
      ↑ swipe or tap "Intake ▴" → 60% → 100%: full intake, history, meds
```

- `ConsultationRoom` below `lg`: video stage at full width/height. `PatientIntakeReferenceTab` moves into a vaul drawer with **three snap points**: peek (≈ 88px: chief complaint, allergy line, vitals), half (60%), full. The peek is non-dismissible, so the doctor always sees allergies.
- **Chat** (`ConsultationChatPanel`) opens as a full-height sheet from the chat control. An unread count shows on the control. Chat is also the fallback when video fails: the video stage shows "Video unavailable. Continue in chat" with one button (matches the scenario in `During Consultation.md`).
- **Google Meet path:** when video opens externally, the room shows a "Video is open in Google Meet" card with **Back to Meet** and the same intake peek, so BayanHealth stays the clinical cockpit.
- **End consult:** tapping End opens a confirmation sheet: "End the consult with Sofia? Next you'll write the assessment." with **End & document** (primary) and **Keep talking**. A Meet leave event never ends the consult (per the clinical-state boundary). This button is the only way.
- Respect `env(safe-area-inset-*)` (already partly done in `ConsultationRoom`). Keep the screen awake while in the room only if this is already supported; otherwise list it as an upstream proposal.

### 5.4 Post-consult (`/doctor/post-consultation/id`): Review → Assess → Deliver

The workspace already has three phases (`workspacePhase.ts`: `review | assess | deliver`). On mobile, **each phase becomes its own full screen** with a stepper and a sticky footer:

```
┌─────────────────────────────────┐
│ ←  Sofia H. 7F  ⚠None   [i]     │  ← patient chip; [i] opens PatientRail sheet
│ ● Review ── ○ Assess ── ○ Deliver│  ← Step 1 of 3
│─────────────────────────────────│
│ (phase content)                 │
├─────────────────────────────────┤
│ Saved 2s ago        [ Next → ]  │
└─────────────────────────────────┘
```

**Patient context everywhere:** the top bar always shows name, age/sex, and the **allergy line**. `[i]` opens `PatientRail` / `PatientDetails` as a sheet. This replaces the desktop left rail.

**Step 1 · Review:** `SoapSummaryCards` stacked as collapsible S/O sections, with intake highlights and the audio trail (`AudioTrail`, `AudioMarkers`) if present. Footer: **Write assessment →**.

**Step 2 · Assess (the gate):**
- One text field (≥ 16px, which avoids iOS zoom) that is both the diagnosis and the search (the existing single-field behavior in `AssessmentFirstWorkspace`). `CandidatePicker` suggestions render as full-width tappable rows *below* the field, each showing the ICD code and name.
- Below the field, a calm explainer: "Prescriptions, certificates and requests unlock after you confirm." (This is the gate in plain language, not "CDS gate token".)
- Footer: **Confirm assessment** (primary). On confirm, the phase collapses to a one-line summary bar (as desktop already does) and moves to Deliver.

**Step 3 · Deliver:** a **checklist**, not a deck of equal cards:

```
│ Assessment: Acute URI (J06.9) ✎ │
│─────────────────────────────────│
│ Plan                    Draft ▸ │
│ Prescription      Ready to sign ▸│
│ Medical certificate  Not started▸│
│ Lab request          Not started▸│
│ Imaging request      Not started▸│
│ Patient education       Signed ✓│
├─────────────────────────────────┤
│ 1 of 3 signed   [ Release to patient ] (disabled until signed) │
```

- Each row is a `DeliverablesDeck` entry (`deriveDeckEntries`) with a **text status**: Not started / Drafting… / Draft / Ready to sign / Signed / Released / Out of date (stale after an assessment change). Tapping a row opens that artifact full-screen (`ArtifactCard` → `ArtifactPayloadEditor`).
- Rows the doctor doesn't need can be removed ("Not needed" in the row's overflow menu, using the existing `discardedTypes` behavior), so the list only shows what's left.
- **Prescription editor (mobile):** one medicine per card, fields stacked (drug, strength, sig, frequency, duration, qty). The allergy line stays pinned above the list. "+ Add medicine" sits at the bottom. The A4 preview (`PrescriptionPagedPreview`) is a "Preview as patient sees it" sheet, not inline.
- **Signing:** **Sign** opens a sheet: summary of what's being signed, the doctor's saved signature specimen (`SignaturePreview`), and **Sign prescription** (primary). If no specimen is saved, the sheet routes to Profile → Signature and back. No drawing on the phone mid-flow.
- **Release** is a separate, final, confirmed step: "Send signed documents to Sofia? She'll see them in her Health tab." It stays distinct from signing, mirroring the server's finalize/release split.
- **Finish later:** the back arrow always says what's kept ("Your drafts are saved. Finish from Consults → Needs documentation."). This relies on existing server persistence, not new local storage.

### 5.5 Calendar (`/doctor/schedule`)

The week `TimeGrid` and month grid don't work at 360px. Below `lg`:

```
┌─────────────────────────────────┐
│ October 2026          [Month ▾] │
│ Mo Tu We Th Fr Sa Su            │  ← week strip, swipe or ‹ › buttons
│  6  7 [8] 9 10 11 12  · dots    │
│─────────────────────────────────│
│ 08:00–12:00  Available (on-call)│
│ 11:15  Ramon Dela Cruz · Video ▸│
│ 12:00–13:00  Blocked: lunch    ▸│
│ 14:00  free slot                │
├─────────────────────────────────┤
│ [ + Block time ] [ Availability ]│
└─────────────────────────────────┘
```

- **Day agenda list** (reuses `calendarEntries.ts`, `slotPlan.ts`, `ActiveDaySlotList`) under a week strip. Month view becomes a compact dot calendar (`monthAggregation.ts`); tapping a day jumps to its agenda.
- Every popover (`AppointmentPopover`, `AvailabilityPopover`, `ShiftInspectorPopover`, `SchedulePopover`, `MonthOverflowPopover`) renders its *same content* in a bottom sheet below `lg`.
- `BlockTimeDialog` becomes a sheet with large time pickers (native `<input type="time">` for familiarity and accessibility).
- `CalendarLegend` moves behind an "ⓘ What do the colors mean?" sheet; entries also carry text labels.

### 5.6 Consults / History (`/doctor/history`)

- Segmented control at the top: **Needs documentation** (default when count > 0) · **Completed** · **All**. "Needs documentation" is the doctor's to-do list for unfinished post-consult work (filtered from existing `CompletedConsultations` / history data; no new API).
- Rows: patient, date, diagnosis, document status. Search field sticky at the top.

### 5.7 Profile, signature, KYC (`/doctor/profile`, `/doctor/kyc`)

- Profile becomes a settings-style list: Identity & licence (PRC/PTR/S2 shown read-only), **Signature**, Availability defaults, Appearance (theme toggle moved here), Sign out.
- **Signature capture**: a full-screen canvas sheet with "Turn your phone sideways for more room" hint, **Clear**, and **Save**.
- KYC (`DoctorKycView`): a vertical stepper. Each document is a row with status, and upload uses the native file/camera picker ("Take photo of licence"). Rejected items explain why in plain words with a **Re-upload** button.

## 6. Cross-cutting system work

| Piece | What | Where |
|-------|------|-------|
| `DoctorMobileNav` | Bottom bar from `DOCTOR_NAV` + Today count badge, hidden in room/post-consult | `src/features/doctor/components/DoctorMobileNav.tsx`, mounted in `doctor/(homepage)/layout.tsx` |
| `LiveEncounterBar` | "In consult · Return" bar above the nav | `src/features/doctor/components/LiveEncounterBar.tsx` (reads `useActiveEncounter`) |
| `ResponsiveSheet` | Same API as Dialog. Renders `Dialog` at `lg+`, vaul `Drawer` below. Wraps the existing `CustomBottomModal` pattern | `src/components/ui/responsive-sheet.tsx` |
| `StickyActionBar` | Bottom-pinned primary action with safe-area padding + "Saved" status slot | `src/components/ui/sticky-action-bar.tsx` |
| `PatientSafetyStrip` | Name · age/sex · allergy line, reused in triage, room peek, post-consult header, Rx editor | `src/features/doctor/components/PatientSafetyStrip.tsx` |
| `StatusText` | Text + icon status chip (Draft / Ready to sign / Signed / Out of date / Urgent…) | `src/components/ui/status-text.tsx` |
| Offline banner | "No connection. Changes will save when you're back online." (`navigator.onLine` only, UI-level) | in `DoctorMobileNav` shell |

**Ergonomics floor (every screen):** 48px minimum targets (56px for consult controls); primary action in the bottom 40%; 16px minimum input text; `h-dvh` + safe-area insets; no hover-only affordances; no tooltip-only meaning; text labels under nav icons; focus rings retained; `prefers-reduced-motion` honored (sheet transitions become fades).

**Irreversible or high-stakes actions** (Accept, End consult, Sign, Release, go off duty with waiting patients) always get a confirmation sheet that names the patient and the consequence. Low-stakes actions (save, collapse, filter) never do.

## 7. Copy

- Clinical English for all labels, buttons, and statuses: "Accept patient", "Start consult", "Confirm assessment", "Sign prescription", "Release to patient".
- **Taglish only in helper and empty-state lines**, e.g. "You're all caught up. Wala pang naghihintay." / "Saved na. You can finish this later."
- Verbs on buttons; no jargon such as "gate token", "artifact", "CDS". The Deliver list says "Prescription", not `prescription` payload names.

## 8. Build order

Each phase ships on its own, is logged in `CHANGELOG_UI_V2.md`, and leaves desktop pixel-identical (`lg+` untouched).

| Phase | Deliverable | Why this order |
|-------|-------------|----------------|
| **0. Shell** | `DoctorMobileNav`, `LiveEncounterBar`, compact header, `ResponsiveSheet`, `StickyActionBar`, `PatientSafetyStrip`, `StatusText` | Unblocks everything; fixes "stranded on mobile" immediately |
| **1. Today + triage + accept** | 5.1, 5.2 | Highest on-the-go value: don't miss urgent patients |
| **2. Consult room** | 5.3 | Completes the accept → consult loop |
| **3. Post-consult** | 5.4 | Heaviest; depends on the shared strip/sheet/action bar |
| **4. Calendar** | 5.5 | Mostly sheet conversions plus the day agenda |
| **5. Consults, Profile, KYC** | 5.6, 5.7 | Lower frequency on the go |
| **6. Validate** | §9 | Before declaring done |

## 9. Validation

**Viewports:** 360×800 (mid-range Android, the primary target), 390×844, 430×932, and 768×1024 (tablet portrait, where the mobile layout still applies). Desktop 1440 must show no diff.

**Task-based test with 3–5 doctors** (at least one self-described "not techy"), one-handed and standing, using the demo data:

| Task | Target |
|------|--------|
| Go on duty → accept the urgent request → start consult | ≤ 5 taps, < 30 s, no wrong-patient accepts |
| During consult, find the patient's allergies and current meds | < 5 s, without leaving the video |
| Confirm assessment → sign Rx → release | < 2 min for a routine case |
| Get pulled away mid-Rx, come back and finish | Finds the way back unaided |
| Block 12:00–13:00 tomorrow | < 30 s |

Also: an axe/Lighthouse accessibility pass on every route, a reduced-motion check, and a slow-3G throttle check for loading/skeleton states.

## 10. Out of scope here → upstream proposals

These need backend or product work, so they're recorded for the main repo and **not** built in this fork:

- Push or ringing alerts for new on-demand requests (biggest on-the-go gap: today the doctor must have the page open).
- Installable PWA / home-screen app.
- Rx favorites, templates, and "repeat last prescription".
- Voice dictation for the assessment and plan.
- Offline draft queueing beyond the UI banner.
- Screen wake-lock during consults.

## 11. Open decisions (do not invent)

1. **S2 / dangerous-drug prescriptions on mobile.** PH rules cited online mention a "wet/secure signature" for dangerous drugs, and it's unconfirmed how a remote e-signature applies. Should the mobile Rx flow warn about or block S2 drugs? (Needs the clinical lead.)
2. **"Dashboard" vs "Today"** as the nav label on both breakpoints.
3. **On-demand decline.** There's no decline action for on-demand requests today (only "not now"). Should one exist? That's a product/backend decision, so it goes upstream.
4. **Tablet (768–1023px).** Treat as mobile layout (this plan), or introduce a two-pane middle layout later.

---

### Research notes

- Mobile EHR research consistently finds the small screen and in-chart navigation are physicians' biggest barriers, and most prefer a *simplified* mobile version over a full EHR replica ([Becker's](https://www.beckershospitalreview.com/healthcare-information-technology/91-of-physicians-are-interested-in-mobile-ehrs.html), [MobiHealthNews](https://mobihealthnews.com/node/108586)). Epic Haiku is positioned the same way: workflow-focused, not a full EHR ([Mindbowser](https://mindbowser.com/epic-haiku-mobile-ehr-access/), [Geisinger](https://geisinger.org/patient-care/for-professionals/epic-haiku-and-canto-mobile-apps)). → One job per screen.
- Text entry on phones is the central pain and a source of errors ([Aalto thesis](https://aaltodoc.aalto.fi/items/6831c537-87d4-464e-9c19-9dad139a8a6f), [Nuance/Haiku](https://mobihealthnews.com/node/106151)). Usability problems correlate with prescribing errors on handhelds ([Kushniruk et al.](https://pubmed.ncbi.nlm.nih.gov/23920515)). → Structured Rx cards, suggestions over free typing, pinned allergies.
- Physicians prefer larger screens for reviewing lots of data, and phones for portability ([UVic thesis](https://dspace.library.uvic.ca/items/eb47a66d-5761-4f78-8a32-45135cdb4ac6/full)). → Progressive disclosure with sheets and collapsible sections.
- For users with lower IT literacy, *directed interaction with fewer options* and *error prevention over efficiency* work best ([UPM Ageing Lab](https://ageinglab.ctb.upm.es/en/ux-and-usability-for-older-users-en)). → One primary button, confirmations on irreversible steps.
- Doximity Dialer's adoption came from one-tap start on the doctor's own phone with no setup ([Doximity press](https://press.doximity.com/articles/doximity-launches-dialer-video), [Fierce Healthcare](https://www.fiercehealthcare.com/practices/doximity-launches-telehealth-app-for-providers)). → The "Next action" card and one-tap Return to consult.
- Thumb-zone guidance (largely from Hoober's observational work) supports bottom navigation with 3–5 items and actions in the lower screen ([Parachute](https://parachutedesign.ca/blog/thumb-zone-ux/), [AppMySite](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)). Treat it as a model to validate on devices, not a law.
- PH competitor SeriousMD started iPad-first for doctors ([SeriousMD blog](https://seriousmd.com/blog/?p=225)), so phone-first doctor tooling in PH is relatively open ground.
- PH e-prescription rules are spread across DOH-NPC JMC 2020-0001, FDA Circular 2020-007, and DOH-DILG-PHIC JAO 2021-0001, and the S2 signing rules for telemedicine are unclear ([UP Law JMC](https://law.upd.edu.ph/wp-content/uploads/2020/05/DOH-NPC-JMC-No-2020-0001.pdf), [JAO 2021-0001](https://law.upd.edu.ph/wp-content/uploads/2022/06/DOH-DILG-PHIC-Joint-Administrative-Order-No-2021-0001.pdf), [Respicio](https://www.respicio.ph/commentaries/prescription-requirements-for-doctors-names-and-pharmacists-legal-remedies-in-the-philippines)). → Open decision #1.

---

## Implementation log

### 2026-10-08 · Phases 0–1

Shipped as described in `CHANGELOG_UI_V2.md`. Where the build deliberately departed from the plan above:

- **Responsive CSS on existing components, no new primitives yet.** The custom triage/accept modals became bottom sheets through breakpoint classes plus a portal, which keeps upstream diffs small. `ResponsiveSheet`, `StickyActionBar`, `StatusText` and `PatientSafetyStrip` will be built when Phases 2–3 first need them, not ahead of time.
- **There's no separate "Next action" card.** `ActiveEncounterCommandCenter` already covers priorities 1–2 (active or accepted encounter), and the queue below it covers 3–4. A second card would duplicate them.
- **Inline Accept stays on queue rows.** Every accept already passes through `AcceptConsultModal`'s confirmation, so a mis-tap is caught there. Rows just got bigger, wrapping targets.
- **There's no allergy line on queue rows.** Bookings and intake-queue entries carry no allergy or age/sex field (see `ActiveEncounterCommandCenter`'s doc comment). Allergies appear only where the data exists: the pool triage sheet ("as submitted").
- **"Dashboard" label kept** until open decision #2 is made.
- **Desktop (`lg+`) is unchanged.** Tablet (640–1023px) keeps centered dialogs at desktop sizing, pending open decision #4.
- **Verified** at 360×800 and 768×1024 (mocked demo data, headless Chrome) and at 1440×900 for desktop parity. No horizontal overflow, and the Impeccable detector and ESLint are clean.

### 2026-10-08 · Phase 2 (consult room)

- **The consult-room model was changed from a pull-up sheet to stacked video and panel with an Expand toggle.** A drag sheet with snap points would have meant either a modal drawer (wrong: it blocks the call controls) or new gesture code. The room already stacks video above the panel on phones and already had a compact video strip for the patient's chat focus. Reusing it gives the same result (intake or chat can take the screen while the call continues) with a visible button instead of a gesture, which fits rule 5.
- **The peek is `RoomSafetyStrip`.** It shows allergies and the red-flag summary, pinned above the tabs at every breakpoint. Vitals and the chief complaint stay at the top of the Intake tab, where they already were.
- **End confirmation was added at every breakpoint**, not just on mobile, because the single-tap irreversible end was a safety gap everywhere.
- **The Google Meet path (§5.3) isn't built.** Meet isn't integrated yet (`GOOGLE_MEET_INTEGRATION.md`), so there's no state to design against.
- **Verified** at 360×800 (default, expanded, chat, end confirmation) and 1440×900. No overflow, the detector is clean, and there are no new lint warnings.

### 2026-10-08 · Phase 3 (post-consult)

- **Not built: three separate full-screen steps.** The workspace derives its phase from server state and already collapses settled steps (a confirmed Assessment becomes a one-line bar), so the phone keeps one scrolling column. Splitting it into routed screens would have meant restructuring a ~1,900-line component that owns the assessment gate, which is too much risk for a UI fork. What makes the column work on a phone: a sticky header (identity, allergy warning, stepper, Intake, Refresh) and a sticky Finish bar.
- **Not built: the Deliver checklist.** The existing tab strip already shows a text status per document (To sign / Signed / Released / Outdated), which was the checklist's purpose. Phones get a roomier strip (the badge moves to its own line, tabs are at least 44px) rather than a second representation of the same state.
- **Not built: a mobile signing redesign.** At 360px the sign dialog already reads attest, then sign, then lock, with the primary action disabled until attestation.
- **Not built: S2 handling.** Prescribing is unchanged and open decision #1 still stands.
- **Verified** at 360×800 (top, scrolled, Intake sheet, sign dialog) and 1440×900. No overflow, the detector is clean, and there are no new lint problems.

### 2026-10-08 · Phases 4–5 (calendar, consults, profile)

- **Calendar.** Not built: the week strip or dot-month calendar. The existing Day view plus a phone default of Day covers the need. Two blockers the plan didn't anticipate were fixed: the grid couldn't be scrolled by finger (`touch-none`), and phones had no visible way to add availability. The four popovers become bottom sheets through their shared base. Month view on phones still scrolls sideways, which is acceptable for an occasional planning view.
- **Consults.** Already worked on a phone, so it was left unchanged. Not built: the "Needs documentation" segment (§5.6). It needs a filter over data this screen doesn't currently load separately, which is a data question, not a layout one.
- **Profile / KYC.** Found and fixed: there was no sign-out or theme control on phones. Not built: signature-capture redesign and KYC stepper. The existing signature dialog and credentials section render inside the 44px tab layout, and their redesign is a separate, lower-priority pass.
- **Verified** at 360×800 and 1440×900 for each surface. No overflow, the detector is clean, and there are no new lint problems.

### Still open

1. S2 / dangerous-drug prescriptions on mobile (unchanged behavior today).
2. "Dashboard" vs "Today" label.
3. On-demand decline action (backend).
4. Tablet layout (640–1023px currently gets phone sheets below `sm` and desktop-sized controls above).
5. Phase 6: task-based test with 3–5 doctors on real phones (§9).

