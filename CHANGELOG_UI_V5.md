# BayanHealth UI/UX Changelog (V5)

All design, layout, styling, and UX modifications made in this fork must be logged here.
This document is the active single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository. It supersedes [`CHANGELOG_UI_V4.md`](./CHANGELOG_UI_V4.md), [`CHANGELOG_UI_V3.md`](./CHANGELOG_UI_V3.md), [`CHANGELOG_UI_V2.md`](./CHANGELOG_UI_V2.md) and [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

> **Historical References**:
> - For UI changes logged between 2026-11-03 and 2026-11-23 (clinical pilot feedback, micro-interactions, post-consult follow-up), refer to [`CHANGELOG_UI_V4.md`](./CHANGELOG_UI_V4.md).
> - For 2026-10-01 to 2026-10-23, refer to [`CHANGELOG_UI_V3.md`](./CHANGELOG_UI_V3.md). For 2026-09-26 to 2026-10-01, refer to [`CHANGELOG_UI_V2.md`](./CHANGELOG_UI_V2.md). Earlier entries are in [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

V5 opens with the **patient chart**: a versioned "Past medical history" that the doctor builds at the first consultation and refers back to at every later one.

---

## Log Entries

### [2026-11-27] Post-consult: Resizable Patient Panel

The right-hand patient panel (intake, lab results, past medical history) was a fixed 17–21rem column. With the chart in it, doctors asked to make it wider than the SOAP column when they are reading history.

- **Target route**: `/doctor/post-consultation/id`, desktop only (1024px and up). Phones are unchanged; there the panel is a bottom sheet.
- **Behaviour**:
  - A **16px drag handle** replaces the grid gap between the SOAP column and the panel.
  - The handle is a 1px line that shows on hover, with a small grip that stays in view while the page scrolls.
  - Dragging left widens the panel.
  - **Limits**: the panel is at least 17rem (272px), and the default is 21rem (336px) as before. The SOAP column is never narrower than 30rem (480px); below that the Plan & documents deck clips.
  - **Double-click** resets the width.
  - The width is saved in this browser (`localStorage` `bh:post-consult:rail-width`), so it carries over to the next patient. It is re-clamped when the window resizes.
  - When the panel is collapsed, the handle is hidden.
- **Keyboard and screen readers**:
  - The handle is a focusable `role="separator"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.
  - ← widens and → narrows, by 32px (96px with Shift).
  - Home resets to the default; End goes to the widest allowed.
- **Files**:
  - `postConsultation/RailResizeHandle.tsx` (new): `useResizableRail()` and `RailResizeHandle`. The container ref is a callback ref, because the grid mounts only after the workspace loads.
  - `postConsultation/AssessmentFirstWorkspace.tsx`:
    - The expanded grid is now `lg:grid-cols-[minmax(0,1fr)_auto_var(--rail-w)] lg:gap-x-0`, with `--rail-w` set inline.
    - The handle is `order-2` and the rail wrapper is `order-3`.
    - The collapsed grid is unchanged.
- **Verified**:
  - `tsc` and `eslint` are clean.
  - In headless Chrome at 1850px, End widened the panel from 336px to 1322px, with the SOAP column held at 480px. The width persisted.

### [2026-11-27] Patient Chart: Versioned Past Medical History

**The problem.** At a first consultation the doctor has only the intake. At the second, they had nothing better: no record of what was learned last time. This entry adds a patient chart. It follows the clinic's two paper templates, the *Medical History Information Sheet* and the I–VIII *Medical History Template*.

- **First consult**: the chart is pre-filled from the intake. The doctor completes it in the call, then saves it as **version 1** after the call.
- **Later consults**: the doctor opens the latest version. They update what changed or mark sections reviewed, and save **v2, v3…**.
- **Saved versions** are read-only and can be compared.

> **New feature, approved by the user for this fork on 2026-11-27.** No API path, OpenAPI schema or generated type changed. The backend has no history API yet, so all data goes through **one seam file** (`features/consultation/lib/patientHistory/api.ts`). Demo bookings work end to end. Real bookings pre-fill from the intake and show a plain "needs a server update" reason in place of saving. See **Backend dependencies** below.

#### Research behind the layout

- **Separate history sections, each with "Mark as reviewed"**: Epic, PCC and Practice Fusion all keep Medical / Surgical / Family / Social history apart. Each section can be marked reviewed, which records a dated review even when nothing changed. CMS counts past, family and social history (PFSH) as a required history element, so "reviewed, no change" is real work that needs a timestamp.
  - University of Iowa Epic support, "History": https://epicsupport.sites.uiowa.edu/node/756
  - PCC Learn, "Family Medical History": https://learn.pcc.com/help/family-medical-history/
  - Practice Fusion, Social history: https://help.practicefusion.com/s/article/What-is-in-the-Social-history-section-on-the-patient-Summary
- **"Changed since you last looked"** spares a clinician from re-reading what they already reviewed. Sources: patent US20160132645, https://patents.justia.com/patent/20160132645, and Belden et al., *Inspired EHRs: Designing for Clinicians*, http://inspiredehrs.org/Inspired_EHRs_Designing_for_Clinicians.pdf.
- **History in a right-hand chart panel next to the note**: eClinicalWorks clinician guide, http://www.crossoverministry.org/wp-content/uploads/2019/02/FINAL-eClinicalWorks-Clinician-Training-Guide_SL-FINAL-2.pdf. This matches our call-room side panel and post-consult rail.

**How the research is applied:**
- Allergies come first in every view.
- Every section has a status in words: *From intake · confirm*, *Not reviewed today*, *Reviewed today*, *Updated today*, *Not recorded*.
- Saved versions record *Updated / Reviewed / Carried forward / Patient-reported / Not recorded* per section.
- A version picker, plus a **Changes since vN** toggle. A changed value shows the new value in bold, with "Was: ~~old~~" underneath. The section gets a solid 2px navy left rule and an "N changes" status. There is no color-only signal, no glow and no gradient.

#### Information architecture (both templates merged, in clinical reading order)

| Section | Fields | Filled from intake today |
|---|---|---|
| Allergies | Drug / other allergies with reaction; No known allergies; Latex yes/no | `allergies` (negative statements such as "NKDA" become *No known allergies*) |
| Demographics | DOB (with age), sex, address, nationality, occupation, marital status | `demographics.dateOfBirth`, `demographics.sex` |
| Past medical history | 29-condition checklist grouped by system (the sheet's list merged with the 12 contract conditions, reusing `KNOWN_CONDITION_LABELS`); cancer type; other; **maintenance medicines**; serious injuries / illnesses | `structuredMedicalHistory.knownConditions`, `.other`, `.currentMedications` (or legacy `medications`) |
| Surgical history | Operation · year · complication rows; No operations | `structuredMedicalHistory.details` (the intake's "surgery or hospital stay in the last 2 years" answer) |
| Family history | Condition × relative (mother, father, sibling, child, grandparent, other); other | – |
| Gynecologic history | G and TPAL, LMP, cycle interval and duration, contraceptive use. **Hidden for male patients only** | `reproductiveHealth.lastMenstrualPeriod` |
| Social history | Tobacco never/former/current with packs/day × years, giving **pack-years (computed)**; alcohol; other substances; sexual history (active, partners, contraception); lives alone | – |

The template's *chief complaint*, *present history* and *review of systems* belong to the visit, not the chart. They stay in the Intake tab and the SOAP note and are not versioned.

**Returning patients.** When today's intake disagrees with the latest version, the section shows an attention line, for example "Intake today lists: Sulfa drugs", "New on intake: Asthma", or "LMP on intake today: 10 Nov 2026". A new allergy is never buried under a carried-forward chart.

#### Layout per platform

**Doctor, desktop (1024px and up): dense clinical cockpit**
- The panel adapts to its **container**, not the viewport (`@container`). The same component sits in a 21rem rail, a ~36rem call tab and a 42rem drawer.
- Rows are two-column `dl` lists (label / value) at 13px with 1px dividers. Controls are 32px.
- Every section is open. *Edit* expands that section's editor in place, one at a time, and *Done* closes it.

**Doctor, phone and tablet (below 1024px)**
- Each section collapses to a **48px** header row, and one opens at a time.
- Every control is 48px with 16px text, so iOS never zooms.
- The version picker is a native `<select>`, so the phone opens its own OS picker. This replaces the planned bottom sheet: it needs no extra layer and is easy to reach with the thumb.
- Save sits in a sticky footer above the safe-area inset.

**Patient (phone first, read-only)**
- One 48px row per section that opens in place, with 16px text.
- Plain words: "2 pregnancies, 2 living children" instead of G/TPAL. No pack-years.
- "Updated 14 August 2026 by Dr. …"
- "Something wrong or missing? Tell your doctor at your next consultation."
- No editing, per the intake-content rule: this fork adds no new patient questions.

#### Where it appears

1. **Doctor queue, once a booking is accepted** (`/doctor`)
   - Ready rows get a chip: **"New patient · no chart"** or **"Chart v2 · 14 Aug"** (`StatusText`).
   - The "View intake" drawer is now two tabs: **Intake | Past medical history**. The history tab is read-only and opens on the latest version with **Changes from the previous version** switched on.
   - On a first consult, the history tab says the chart is built in the call and saved as version 1 after it.
   - The **Active Encounter** card (a just-accepted on-demand patient) gets the same chip, plus a **View intake** button that opens the same drawer.
2. **During the call** (`/consultation/room/{bookingId}`)
   - The doctor side panel has a fourth tab, **Past medical history**. The label shortens to "Past history" up to xl, and to "History" on phones. It sits after Intake.
   - The tab is `keepMounted`, so an open editor survives a tab switch.
   - The tab is editable. The draft autosaves to this device (`localStorage` `bh:pmh-draft:<bookingId>`) and survives a reload.
   - Its footer says the chart is saved as version N from the post-consult workspace.
   - **Phone tab bar**: with four tabs, the tab icons hide below `sm`. The Expand / Show video toggle becomes a 44px icon-only button; its label stays for screen readers. Without this, "Chat" slid under the toggle at 390px.
3. **Post-consult side panel** (`/doctor/post-consultation/id`)
   - In the rail, under Lab results, there is an open-by-default **Past medical history** disclosure. It shows the in-call draft with **Save as version N**.
   - Save opens a `ResponsiveSheet` that lists each section's status. It states how many sections were not reviewed today, which are saved as *Carried forward*. It warns when sections are still as the patient entered them, which are saved as *Patient-reported*.
   - After a save, the meta line reads "Saved as vN for this consultation. Only save again if something changed", so the doctor does not create an accidental extra version.
   - The collapsed rail shows a second vertical label, **History**, plus "Draft" while a draft is unsaved.
   - On a phone (where the rail is hidden), a **History** pill sits next to the Intake pill in the header. It has an attention dot while a draft is unsaved and opens the same panel in the existing bottom modal.
   - The **Finish** sheet adds one line under the final record: "Past medical history: draft not saved". It is a reminder, not a gate.
4. **Patient Health → Overview** (`/patient/health`)
   - A **My medical history** card sits under Health identity.
   - With nothing saved, the card reads: "Your doctor fills this in with you during a consultation. Once it is saved, you can read it here."

#### Files

- **New, pure logic** (`src/features/consultation/lib/patientHistory/`):
  - `types.ts`: the chart shape, `HistoryVersion`, `HistoryDraft`, section states.
  - `labels.ts`: section titles (doctor and patient), the condition list grouped by system, relatives, status wording and tones.
  - `model.ts`: `emptyHistory`, `historyFromIntake`, `packYears`, `sectionRows` (`doctor` | `patient` wording), `startDraft`, `draftSectionState`, `versionSectionStates`, `intakeNotes`, `visibleSections`.
  - `diff.ts`: `diffSection`, `diffHistory`, `countChanges`.
  - `api.ts`: **the backend seam**. Covers `fetchPatientHistory`, `savePatientHistoryVersion` and `fetchMyPatientHistory`.
  - `demo.ts`: seeded charts.
    - Ramon (`demo-sch-ramon`) has v1 (Mar) and v2 (Aug). v2 adds an amlodipine allergy, changes metformin and adds high cholesterol.
    - Maria (`demo`, `preview`, `demo-active-encounter`) has v1 with gynecologic history.
    - Manuel (`demo-req-manuel`) is a first consult with no chart.
  - `draftStore.ts`: the per-booking draft in `localStorage`, with a listener set so two panels on one page stay in step.
  - `model.test.ts`: 16 vitest cases covering the intake mapping, NKDA handling, pack-years, G/TPAL wording, the diff (including a removed operation), draft states and intake notes.
- **New hook**: `features/consultation/hooks/usePatientHistory.ts`. It exports:
  - `usePatientHistory`: the draft, saved versions, the intake, the actions and save;
  - `usePatientHistoryRecord`: read-only;
  - `useHasHistoryDraft`.
- **New components** (`features/consultation/components/patientHistory/`):
  - `PatientHistoryPanel.tsx`: modes `read` | `edit`, with `saveEnabled`.
  - `HistoryEditors.tsx`: one editor per section.
  - `HistoryStatusChip.tsx`
  - `PatientHistoryRailSection.tsx`
- **Patient side**: `features/patient/components/health/MyMedicalHistoryCard.tsx` (new). Mounted in `HealthOverviewTab.tsx`.
- **Dev-only preview**: `app/redesign/patient-chart/page.tsx` and `patientHistory/PatientChartPreview.tsx`. They show the queue chip and drawer tab for Ramon (returning, v1 → v2) and Manuel (first consult), because the live queue only lists backend bookings. Like `/redesign/diagnoses`, the page returns `notFound()` in production.
- **Modified**:
  - `components/consultation/DoctorClinicalCompanionSuite.tsx`: fourth tab.
  - `features/doctor/components/homepage/DoctorPatientQueue.tsx`:
    - `QueueRowShell` gains an optional `meta` slot.
    - The ready row shows the chip.
    - `ViewIntakeDrawer` is exported, gains `triggerClassName`, and shows the Intake | Past medical history tabs.
  - `features/doctor/components/homepage/ActiveEncounterCommandCenter.tsx`: chip and drawer.
  - `features/consultation/components/postConsultation/PatientRail.tsx`:
    - The history section.
    - The collapsed "History" label.
    - A new `doctorName` prop.
  - `features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx`:
    - The phone History pill and its bottom modal.
    - `doctorName` passed to the rail.
    - The Finish-sheet reminder, which reads `bookingId` from the URL.

#### Verified

- `tsc --noEmit` is clean. `eslint` is clean on the changed files, apart from two existing warnings in `AssessmentFirstWorkspace.tsx` that this change did not touch.
- `vitest`: 105 tests pass, 16 of them new.
- Headless Chrome over CDP:
  - Desktop (1440px) and phone (390px, touch emulation).
  - **Call room**: History tab, editing Social history.
  - **Post-consult rail**: Mark reviewed, then Save → confirm → v2. The picker lists v2 and v1, and the toast reads "Chart saved as version 2".
  - **Post-consult on a phone**: the History pill opens the sheet.
  - **Queue preview**: the chip and the v1 → v2 diff.
  - **Patient card on a phone** (`?chartPreview=maria`).
  - No console errors.
- **Not seen**: the live doctor queue with real bookings (it needs a backend session), and dark mode.

#### Upstream porting notes

- Port the `patientHistory` lib and components as they are. Only `api.ts` needs to change once the backend exists.
- All three doctor surfaces key the chart by **`bookingId`**, because none of them holds a `patientId` today. The backend resolves the patient and checks that the caller is the assigned doctor.
- The `chartPreview` query parameter on `/patient/health` only works in development. It shows the patient card with a demo chart (`?chartPreview=ramon`) and is ignored in production.
- Statuses reuse `StatusText`. Confirmations reuse `ResponsiveSheet`. No new tokens were added.

#### Backend dependencies (not doable in this UI fork)

1. **Patient history store with versions** (append-only). Proposed endpoints:
   - `GET /v1/bookings/{bookingId}/patient-history` returns `{ versions: HistoryVersion[] }`. It is for the assigned doctor only.
   - `POST /v1/bookings/{bookingId}/patient-history/versions` takes `{ data, sections }` and returns a `HistoryVersion`. The server stamps `version`, `savedAt` and `savedBy`.
   - `GET /v1/patients/me/history` returns `{ versions }` for the patient (read-only). The client may show the latest version only.
   - Shape: see `features/consultation/lib/patientHistory/types.ts`.
2. **Concurrency**: reject a save whose base version is not the latest (409), so two doctors cannot fork the chart. The UI already treats a draft based on an older version as stale.
3. **Optional**: an `intake` → chart prefill on the server, so the patient's own record and the doctor's first draft agree.

---

> Earlier V4 entries remain in [`CHANGELOG_UI_V4.md`](./CHANGELOG_UI_V4.md).
