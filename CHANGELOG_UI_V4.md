# BayanHealth UI/UX Changelog (V4)

All design, layout, styling, and UX modifications made in this fork must be logged here.
This document is the active single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository. It supersedes [`CHANGELOG_UI_V3.md`](./CHANGELOG_UI_V3.md), [`CHANGELOG_UI_V2.md`](./CHANGELOG_UI_V2.md) and [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

> **Historical References**:
> - For UI changes logged between 2026-10-01 and 2026-10-23, refer to [`CHANGELOG_UI_V3.md`](./CHANGELOG_UI_V3.md).
> - For 2026-09-26 to 2026-10-01, refer to [`CHANGELOG_UI_V2.md`](./CHANGELOG_UI_V2.md). Earlier entries are in [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

V4 opens with the response to the **clinical pilot feedback review** (deck "Clinical feedback & IT action points", reviewed 2026-11-03). Each entry below names the pilot item it answers.

---

## Log Entries

### [2026-11-03] Consult Room: Notes Tab (Write S and O During the Video Call)

- **Target Route / Surface**: `/consultation/room/[bookingId]`, assigned doctor only. The patient's view is unchanged.
- **Pilot item**:
  - P1 "Editable clinical notes";
  - "Allow doctors to edit patient-entered complaints during video consultation";
  - "Consider editable Subjective and Objective fields during the interview".
- **Files Added / Modified**:
  - `src/features/consultation/components/session/RoomNotesTab.tsx` (new):
    - "Your notes" heading, save status, and a one-line privacy note;
    - the same `ClinicalNoteField` S and O fields as the post-consult workspace;
    - a "Not saved. Your text is still here." alert with **Try again** after a failed save;
    - a footer: "Assessment and documents come after you end the call."
    - States: "Notes open when the consultation starts." before a consultation exists, and "Notes are saved only in a live consultation." in demo.
  - `src/components/consultation/DoctorClinicalCompanionSuite.tsx`:
    - Tabs are now **Intake | Notes | Chat**, and Intake stays the default.
    - The Notes tab shows an attention icon (with "(not saved)" for screen readers) while a save has failed, so it is visible from any tab.
    - The Notes panel is `keepMounted`, so half-typed text survives a tab switch.
    - New optional props: `notes`, `notesAvailable`, `demo`. Without `notes`, the tab is not drawn.
  - `src/features/consultation/components/session/ConsultationRoom.tsx`:
    - Owns `useClinicalNotes`, called before the early returns. It fetches only when the viewer is the booking's assigned doctor and a `consultationId` exists, because the endpoint is assigned-physician only.
    - It reads the intake through the same `["booking-intake", bookingId, idToken]` query key the header already uses, so there is one request.
    - The End consultation confirmation now **saves pending notes first** and says so ("Your notes are saved first and carry over.").
    - If that save fails, the dialog stays open with "Your notes didn't save. If you end now, the unsaved text is lost." and offers **Try saving again** / **End anyway**. Ending is never blocked.
  - `src/features/consultation/components/postConsultation/ClinicalNotesCard.tsx` (`useClinicalNotes`):
    - `save()` now resolves `true` / `false`, and waits for an in-flight save before saving anything typed after it.
    - New `saveFailed` and `dirty` fields.
    - The load is skipped without a `consultationId`.
    - The generic save-error toast now says "Your text is still here. Try again in a moment."
- **Bug fixed (also affects the post-consult workspace)**: `save()` closed over the render before the field's final `setField`. Leaving a field therefore saved the text from *before* the last edit, and the newest words only saved on the next blur or tab-hide. The draft, last-saved values and revision are now mirrored in refs, so `save()` always sends what is on screen.
- **Design Intent**:
  - Doctors capture S and O while the patient is talking, in the panel beside the video, with the safety strip (allergies, red flags) still above.
  - The Subjective field starts pre-filled from the intake as the doctor's own copy to rewrite. The patient's submitted intake is never edited, so "edit the patient's complaint" is met without changing the patient record.
  - It is the same record as the post-consult workspace: what is written here is what the doctor finds after ending the call.
  - Assessment is deliberately absent, because it is the drafting gate.
- **Device Optimization**: Doctor desktop first. On phones the existing **Expand** toggle gives the panel the screen with the video shrunk to its strip, which is the posture for typing. Fields use 16px text below `sm` and 44px or larger controls.
- **Tokens & Primitives Used**: `Tabs`, `ClinicalNoteField`, `NotesSaveState`, `Button` `outline`, `--attention-*`, `--text-muted`, `--border-subtle`.
- **Needs IT confirmation**: that `PUT /v1/consultations/{id}/clinical-notes` accepts writes while the booking is `in_progress`. The contract restricts by role only (assigned physician), not by consult state. The UI fails safely if it is refused: text kept, "Not saved" plus Try again, and an End-consultation warning.
- **Not verified**: a live run against the backend during an active consult. Type-check clean; ESLint 0 errors on the four files (2 warnings on lines that were already like that).
- **Upstream Porting Notes**:
  - Port the `useClinicalNotes` change first; it is a drop-in, since `save()` used to resolve `void`.
  - Then `RoomNotesTab`, then the suite props.
  - Then the room: the hook must stay above the early returns.

### [2026-11-03] Disabled Buttons: Explicit Colours Instead of 50% Opacity

- **Target Route / Surface**: App-wide. Every `Button` from `src/components/ui/button.tsx`.
- **Pilot item**: Improve dark-mode contrast so all text is readable. The pilot screenshots show held buttons whose labels could not be read.
- **Files Modified**:
  - `src/styles/bayanhealth-tokens.css`: new `--disabled-bg`, `--disabled-fg` and `--disabled-border`.
    - Light: `#edf2f6` / `#5a646b` / `#d1dde6`.
    - Dark: `#1b2732` / `#9aabb8` / `#2a3844`.
  - `src/components/ui/button.tsx`:
    - The base class drops `disabled:opacity-50` and gains `disabled:shadow-none`.
    - Each variant gets explicit disabled colours. Filled variants (`default`, `secondary`, `destructive`, `business`, `primary`) take `disabled:bg-(--disabled-bg) disabled:text-(--disabled-fg)`.
    - `outline` takes the disabled border and text, `ghost` takes the disabled text, and `link` takes the disabled text with no underline.
    - `disabled:pointer-events-none` is kept.
  - `src/features/consultation/components/emergency/SendToErControl.tsx`: removed its own `disabled:opacity-50`, so it uses the tokens.
  - `src/features/doctor/components/consultations/CompletedConsultations.tsx`: the white-on-dark week arrow goes from `disabled:opacity-30` to `disabled:text-white/60`, because the grey token would vanish on that dark band.
- **Measured contrast** (label on fill):

  | Theme | Before | After |
  | --- | --- | --- |
  | Light | ~2.3:1 | 5.37:1 |
  | Dark | ~2.3:1 | 6.43:1 |

  A disabled button now reads as disabled through the flat grey fill and the loss of brand colour and shadow, not through faded text.
- **Design Intent**: A held control must still say what it is. "Disabled" should not mean "unreadable".
- **How the override works**: `disabled:*` utilities out-rank plain call-site colours (`bg-(--action-primary)`, `text-(--danger-fg)`) by selector specificity. A call site that sets its own `disabled:text-*` still wins through `tailwind-merge`.
- **Not changed**: hand-rolled `<button>` elements with their own `disabled:opacity-*`:
  - patient intake choices (`IntakeChoice`, `IntakeNavFooter`, `SafetyScreenFields`, `ReviewConsentStep`, `AboutYouFields`), left alone because of the intake rule;
  - `ArtifactCard.tsx:341`, `ArtifactPayloadEditor.tsx` (3), `CareContinuityPanel.tsx` (2), `AcceptConsultModal`, `ShiftInspectorPopover`;
  - form inputs (`input`, `textarea`, `select`, `checkbox`).
  These are the next pass.
- **Device Optimization**: Both.
- **Upstream Porting Notes**: **Visible app-wide change.** Every disabled `Button` turns from a faded brand colour into flat grey. Port the three tokens first, then `button.tsx`. In the main repo, grep `<Button` call sites that pass `disabled:opacity-*` and drop it, unless the button sits on a dark or coloured band (then use a `disabled:text-*` override as in `CompletedConsultations`).

### [2026-11-03] Doctor Copy: Plain Clinical English, and Visible Help Instead of Hover Tooltips

- **Target Route / Surface**:
  - `/doctor/post-consultation/id`: the Assessment section, diagnosis suggestions, the S note, Finish, and the lock notices.
  - `/doctor`: the patient queue's no-show control.
- **Pilot item**: "What is … and when to use it" questions in the deck. Explanations lived in `title=` tooltips, which never show on a tablet.
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx`:
    - "Re-attest unchanged" becomes **"Confirm again as is"**, and "Save as new version" becomes **"Save changes"**.
    - A visible two-line explanation under the buttons (`#assessment-commit-help`, linked by `aria-describedby`) replaces the tooltip.
    - Toast "Assessment re-attested under your name." becomes "Assessment confirmed again under your name."
    - "…not in the approved catalogue" becomes "…isn't on BayanHealth's reviewed diagnosis list yet".
    - When the Subjective note is pre-filled, its hint now says so visibly ("Pre-filled from the intake: edit it freely. It saves when you leave the field.").
    - The Finish button before confirmation was disabled with the tooltip "Confirm the Assessment first". It is now `aria-disabled`, muted and still pressable. A tap explains ("Finish opens after you confirm the Assessment."), with screen-reader text, which is the same pattern as the phone Deliver tab.
  - `src/features/consultation/components/postConsultation/ClinicalNotesCard.tsx`: removed the `title=` tooltip on "Pre-filled", since the hint now carries it.
  - `src/features/consultation/components/postConsultation/CandidatePicker.tsx`:
    - "Safety rules: R1, R2" becomes a quiet "Reference for support: R1, R2" line in small muted mono.
    - "Routine candidates and the CPG preview are suppressed by current safety routing." becomes "Diagnosis suggestions and guideline summaries are hidden while a safety finding is active. Review the finding first."
    - "Guideline summary from the approved catalogue" becomes "Guideline summary reviewed by BayanHealth".
  - `src/features/consultation/lib/cdsCopy.ts`:
    - "re-attestation" becomes "repeat confirmation".
    - The reassignment lock now names "Confirm again as is".
    - The catalogue wording is plain.
  - `src/features/consultation/lib/api/assessmentFirst.ts` (error-message copy only, no request change):
    - the not-eligible message uses the plain catalogue wording;
    - "drafting authorisation expired. Re-check safety…" becomes "drafting permission expired. Try drafting again: the safety check runs again on its own." Drafting re-issues the token on demand.
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx`:
    - The no-show button loses its tooltip and shows "No-show after 10 min" under it until the wait is over.
    - Its error message was `sr-only`, so sighted doctors never saw a failure. It is now visible (`role="alert"`, danger text).
- **Behaviour**: unchanged. The same handlers and the same enabled/disabled rules, except Finish, which now explains on tap instead of doing nothing.
- **Device Optimization**: Doctor desktop and tablet (the reason for removing hover-only help).
- **Upstream Porting Notes**: Copy-only diffs plus the help list and the Finish button. Keep "Confirm again as is" / "Save changes" in sync with `cdsCopy.ts`'s reassignment line.

### [2026-11-03] Multiple Diagnoses + ICD-10 Search: Design Preview for IT Sizing

- **Target Route / Surface**: `/redesign/diagnoses` (new, dev-only; `notFound()` in production, not linked from navigation).
- **Pilot item**: Diagnosis & coding: ICD search by keyword with dropdown suggestions, common terms and synonyms, multiple diagnoses with an ICD code each (reference: the Aventus "Impression / Add ICD" list).
- **Files Added**:
  - `src/app/redesign/diagnoses/page.tsx`
  - `src/features/consultation/components/postConsultation/preview/ImpressionListPreview.tsx`
- **Design Intent**:
  - One search field takes a diagnosis name, an ICD-10 code, or a common term ("LBM", "high blood", "J02"). Suggestions show the code chip, the name, and "Matches "<term>"" when a synonym matched.
  - Chosen diagnoses form an ordered impression list. Row 1 is the primary diagnosis ("Drives which documents can be drafted"). Each other row has "Make primary" and every row has a remove (X) button.
  - The search is an ARIA combobox with arrow keys, Enter and Escape. Options pick on `mousedown` so the input's blur does not close the list first.
  - A "What this needs before it can ship" panel lists the contract, search endpoint and gate-rule changes.
- **Data**: illustrative sample of 14 ICD-10 rows, labelled as such on the page. **Not** the BayanHealth ICD map. No API calls.
- **Device Optimization**: Doctor desktop first. The field is 44px on touch, 40px at `lg`, with 16px text below `lg`.
- **Tokens & Primitives Used**: `--surface-card`, `--surface-raised`, `--surface-accent-soft`, `--border-default`, `--focus-ring`, `--status-available-fg`, `--attention-*`, `Button` `ghost`.
- **Upstream Porting Notes**: **Do not port as a feature.** This is a sizing artifact. Building it for real needs:
  - an ordered `diagnoses[]` on the CDS Assessment, each with `icd10` and a primary flag;
  - an ICD-10 dictionary search endpoint with synonyms;
  - a gate rule for multi-diagnosis eligibility (proposed: primary decides).
  The UI estimate is about one week after those exist. Port the route only if the main repo keeps a `/redesign` gallery.

### [2026-11-03] Doctor Patient Panel: Lab Results From This Consultation

- **Target Route / Surface**: `/doctor/post-consultation/id`, the desktop patient rail.
- **Pilot item**: Define how patient-uploaded laboratory results appear in the chart.
- **Files Added / Modified**:
  - `src/features/consultation/components/postConsultation/LabResultsSection.tsx` (new)
  - `src/features/consultation/components/postConsultation/PatientRail.tsx` (new optional `consultationId`, `token` props; renders the section under the intake)
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx` (passes `consultationId` and `token` to `PatientRail`)
- **Design Intent**:
  - A "Lab results" block lists each lab request from this consultation.
  - Each row shows the test name and its state in words with an icon: "Waiting for patient upload", "Uploaded, needs your review", or "Reviewed".
  - It also shows "Uploaded <date>" when the patient has uploaded.
  - Empty, loading and failed states are all written out.
  - Until now no doctor screen read the existing lab-orders endpoint, so uploads were invisible to doctors.
- **Data**: read-only use of the **existing** `fetchConsultationLabOrders` (`src/features/doctor/lib/api/careContinuity.ts`). No new endpoint, no write, no contract change.
- **Not done (needs IT)**: opening the uploaded file (needs a download-URL endpoint); labs from *earlier* consultations (needs a patient-encounters endpoint).
- **Device Optimization**: Doctor desktop (the rail shows at `lg` and up).
- **Tokens & Primitives Used**: `StatusText` tones `neutral` / `attention` / `success`, `--border-subtle`, `--teal-700` (icon only).
- **Upstream Porting Notes**: Copy the new file and add the two props. If the main repo's rail is reused elsewhere, the section renders nothing without a token.

### [2026-11-03] Finish Sheet: Full Record Review Before Completing

- **Target Route / Surface**: `/doctor/post-consultation/id`, the Finish sheet.
- **Pilot item**: Allow clinicians to review the final clinical record before completion; show a complete document preview before signing and sending.
- **Files Modified**: `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx`
  - New `FinalRecordReview`, `RecordRow` and `RecordText` components.
  - `NextStepBar` and `FinishDocumentationControl` take a new `recordNotes` prop: S and O from `useClinicalNotes().draft`.
  - Sheet width goes from `sm:max-w-lg` to `sm:max-w-2xl`.
- **Design Intent**:
  - The sheet now opens with a read-only "Your record for this consultation". It shows Subjective and Objective in full, and the Assessment (diagnosis plus ICD-10 code).
  - It then lists every document with its status, using the checklist's own status words (`DOCUMENT_STATUS` / `documentStatusOf`).
  - The outstanding-items groups follow below as before.
  - Nothing in it is editable; "Keep working" is the way back.
- **Device Optimization**: Doctor desktop first. On phones the sheet stacks the term over the value.
- **Tokens & Primitives Used**: `--surface-raised`, `--border-default` / `--border-subtle`, `StatusText`, `ResponsiveSheet`.
- **Upstream Porting Notes**: Pure UI, with no change to finish behaviour. `notes` is already in scope where `NextStepBar` is rendered.

### [2026-11-03] Prescription Preview: PRC License, Specialty, Address Line

- **Target Route / Surface**: The document preview ("Preview & print") in the post-consult checklist, and the historical archive preview.
- **Pilot item**: Show a complete document preview before signing (the Rx pad reference: patient, address, Rx, signature, date).
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/ArtifactCard.tsx`: new optional props `doctorLicenseNumber` and `doctorSpecialty`, passed to `DocumentSheetModal`.
  - `src/features/consultation/components/postConsultation/DeliverablesDeck.tsx`: passes the same props through.
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx`: fills them from `doctorProfile.licenseNumber` / `.specialty` for the deck and the archive modal.
  - `src/features/consultation/components/documents/PrescriptionSheet.tsx`: new "Address:" row, showing "Not on file" when absent.
  - `src/features/consultation/components/documents/DocumentSheetFooter.tsx`: a missing PRC or PTR now reads "Not on file" instead of "—".
- **Design Intent**:
  - The preview showed "—" for PRC even though the doctor profile holds the license, so doctors were signing a pad they could not see whole.
  - The PRC number and specialty now print. Missing data says it is missing.
  - The signature behaviour is unchanged on purpose: an unsigned draft still does not show the specimen strokes.
- **Not done (needs IT)**:
  - PTR is not in the `DoctorProfile` contract.
  - Intake does not collect a patient address.
  - Rx validity is still the client-side +30 days.
- **Device Optimization**: Both; the sheet is the printed page.
- **Tokens & Primitives Used**: existing sheet styles.
- **Upstream Porting Notes**: When the contract gains PTR and address, pass them to the same props (`doctorPtrNumber` already exists on the modal) and set `patient.address`.

### [2026-11-03] Contrast: AA-Safe Primary Teal, Subtle Text, Document Paper in Dark Mode

- **Target Route / Surface**: App-wide (tokens), plus patient header, booking calendar, consult-room avatars, admin routes and the document preview.
- **Pilot item**: Improve dark-mode contrast so all text is readable.
- **Files Modified**:
  - `src/styles/bayanhealth-tokens.css`:
    - new raw `--teal-750: #13846f`;
    - light: `--action-primary` becomes `--teal-750`, hover `--teal-800`, active `--teal-900`;
    - light: `--text-subtle` becomes `#626e76`, and `--text-link-hover` becomes `--teal-800`;
    - dark: `--action-primary` becomes `#13846f`, hover `#0f7a66`, active `#106e5c`, and `--text-subtle` becomes `#8193a1`;
    - new `.bh-paper` scope that pins the light ramps on printed documents.
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx`: `bh-paper` class on `#printable-document-sheet`.
  - `src/features/patient/components/PatientPageHeader.tsx`, `src/features/patient/components/homepage/PatientHome.tsx`: header fill `--teal-700` becomes `--teal-750`. The back button goes from `size-9` to `size-12` (48px).
  - `src/components/ui/calendar.tsx`: the selected-day fill becomes `--teal-750`.
  - `src/features/consultation/components/session/ConsultationRoom.tsx`, `src/features/media/components/ConsultationVideo.tsx`: the initials avatar fill becomes `--teal-750`.
  - `src/app/admin/routes/page.tsx`: two hand-rolled teal buttons now use `--action-primary` / `--action-primary-hover`.
- **Measured contrast** (WCAG 2.x, before → after):

  | Pair | Before | After |
  | --- | --- | --- |
  | White on primary button | 3.09:1 | 4.61:1 |
  | Subtle text, light, on white | 2.52:1 | 5.24:1 |
  | Subtle text, light, on cream page | n/a | 4.74:1 |
  | Subtle text, dark, on raised | 3.89:1 | 4.88:1 |
  | Document headings in dark mode (`--navy-700` inverted to `#97c0d8` on white paper) | 1.94:1 | 9.52:1 (`#074972`) |

  The shadcn `--primary` pair already passed (4.52 light / 4.62 dark) and is unchanged.
- **Design Intent**: Readability is the pilot's top complaint. Hierarchy between muted and subtle text now comes from size and weight, not from fading the text. Brand Teal `--teal-700` stays for icons, borders and accents, where 3:1 is enough. Text-bearing fills use `--teal-750`.
- **Device Optimization**: Both.
- **Upstream Porting Notes**: Copy the token block changes verbatim. **Visible change:** primary buttons and the patient header are one step darker teal. Anything in the main repo that puts white text on `--teal-700` should move to `--teal-750` (`grep "bg-(--teal-700)"` and check for white text). Any other white-paper surface should take the `bh-paper` class.

### [2026-11-03] Safety Re-check Control: Renamed, Shown Only When It Helps

- **Target Route / Surface**: `/doctor/post-consultation/id`, the hold / safety notice (`LockNotice`).
- **Pilot item**: "What is 'Re-run safety check' and when to use it. Is this really needed?"
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/AssessmentFirstWorkspace.tsx`:
    - `LockNotice` renders the button only when the Assessment is confirmed and a self-clearable lock other than `assessment_change` is present;
    - adds a visible hint (`aria-describedby`);
    - removes the disabled-with-`title`-tooltip state;
    - updates the acknowledgement toast.
  - `src/features/consultation/lib/cdsCopy.ts`:
    - new `RECHECK_SAFETY_LABEL` ("Check safety again") and `RECHECK_SAFETY_HINT` ("Runs the red-flag check against the latest intake. If nothing new is found, drafting reopens.");
    - lock copy and step guidance now name the new label.
- **Design Intent**:
  - The button used to appear for every hold, including `operator_hold` and `recovery_required`, where pressing it cannot help. Before confirmation it also appeared as a greyed-out button explained only by a hover tooltip, which never shows on touch.
  - It now appears only when it can work, and its purpose is written beside it.
  - Refresh stays for every hold.
- **Behaviour**: unchanged. Same `onRecheck` handler, and the server gate is untouched.
- **Device Optimization**: Doctor desktop (36px at `lg`), 44px on touch.
- **Upstream Porting Notes**: Port `cdsCopy.ts` first, since other strings import from it.

### [2026-11-03] Clinical Terminology: Past Medical History, Maintenance Medications, Certificate Recommendations

- **Target Route / Surface**: The post-consult patient panel, the consult-room intake reference, the doctor dashboard intake drawer, and the medical certificate editor, view and printed sheet.
- **Pilot item**:
  - Replace "Condition" with "Comorbidities" or "Past Medical History".
  - Show maintenance medications beside the comorbidity.
  - Certificate "Restrictions" is the wrong term.
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/PatientDetails.tsx`:
    - "Known medical conditions" becomes "Past medical history / Comorbidities";
    - "No known medical conditions reported" becomes "No past medical history reported";
    - the section now lists "Maintenance medications" under the comorbidities;
    - the disclosure title becomes "Past medical history & reproductive health";
    - the quick tile "Medications" becomes "Current medications".
  - `src/components/consultation/PatientCompanionSuite.tsx`: the same relabel. All `text-[10px]` labels become `text-xs` (12px).
  - `src/features/consultation/components/session/PatientIntakeReferenceTab.tsx`: "Conditions" becomes "Past medical history".
  - `src/features/doctor/components/homepage/ReadyIntakeContent.tsx`: "Known conditions" becomes "Past medical history / Comorbidities".
  - `ArtifactPayloadEditor.tsx`, `ArtifactPayloadView.tsx`: "Restrictions" becomes "Recommendations / Remarks".
  - `src/features/consultation/components/documents/MedicalCertificateSheet.tsx`: the printed label "Work / School Advice" becomes "Recommendations / Remarks", so the field the doctor types and the line that prints share one name.
- **Design Intent**: Use the words Philippine clinicians chart with. Patients enter medications as one free-text answer, so medications sit beside the comorbidity list as a block. Pairing each medication to its condition needs a structured intake field (main repo / product decision).
- **Pending sign-off**: the pilot deck asks clinical governance to agree on certificate and care-plan terminology. "Recommendations / Remarks" is the working label until then. Each label is a one-line revert.
- **Behaviour / data**: unchanged. The field key `restrictions` is untouched.
- **Upstream Porting Notes**: String-only diffs plus the `medications` prop on `MedicalHistorySection`.

### [2026-11-03] Quick Wins: Step Pills, Emoji, Typo, Raw Status Text

- **Target Route / Surface**: The post-consult header, the booking service summary, the booking detail error, the post-consult earlier-drafts row, and the booking route stepper.
- **Pilot item**: "Fix diagnostics/results elements that users cannot click" (things that look clickable but are not), and general polish.
- **Files Modified**:
  - `src/features/consultation/components/postConsultation/WorkspaceChrome.tsx`: the desktop `WorkspaceStepper` is plain progress text, not a filled pill. The current step is bold, and the step has `cursor-default`. Pilot doctors read the filled pill as a tab and clicked it. The phone version stays as real buttons.
  - `src/features/booking/components/consultation/intake/ServiceRequestSection.tsx`: the native emoji answers become a new `YesNo` component (Lucide `Check` / `X` plus a word). Emojis are banned by AGENTS.md and render differently per phone.
  - `src/features/booking/components/patient/PatientBookingDetail.tsx`: "Couldnt load booking" becomes "Couldn't load your booking".
  - `AssessmentFirstWorkspace.tsx`: "Earlier draft · {raw job status}" becomes "Earlier draft · still being written". The row only lists non-terminal jobs.
  - `src/features/booking/components/consultation/BookingWizard.tsx`: the route stop "Form" becomes "Your details".
- **Device Optimization**: Both.
- **Upstream Porting Notes**: Independent small diffs.

### [2026-11-03] Patient Intake: 48px Inputs and Readable Consent Text (Presentation Only)

- **Target Route / Surface**: Patient booking intake and the service-specific forms.
- **Pilot item**: Mobile usability for first-time and older patients.
- **Files Modified**:
  - `SafetyScreenFields.tsx`, `VitalsFields.tsx`, `services/FitForClimb.tsx`, `FitForSchool.tsx`, `FitForTravel.tsx`, `FitForWork.tsx`, `SickLeave.tsx`: inputs go from `h-11` (44px) to `h-12 text-base` (48px, 16px). The safety yes/no chips go from `min-h-11 text-sm` to `min-h-12 text-base`.
  - `OtherRelationshipField.tsx`: the relationship picker trigger goes from the 32px default to `min-h-12 text-base`.
  - `AdditionalInfoSection.tsx`: the consent statement goes from `text-xs text-muted-foreground` (12px, grey) to `text-base text-foreground`. **The wording is unchanged.**
- **Design Intent**: Meet the 48px patient target and the 16px minimum on every patient input.
- **Deliberately not changed**: per the standing intake rule, intake content is not this fork's decision. Consent wording stays verbatim, no new questions, clinical terms stay, plain English only. These pilot-driven content changes are **recommendations awaiting sign-off**, not shipped:
  - an LMP question for female patients of reproductive age (new data);
  - a plain-language consent summary (compliance);
  - a hint on the SpO₂ field (clinical wording);
  - plainer step titles;
  - making the SMS `/intake/[token]` link use the same 4–5 step form.
- **Upstream Porting Notes**: Class-only diffs.
