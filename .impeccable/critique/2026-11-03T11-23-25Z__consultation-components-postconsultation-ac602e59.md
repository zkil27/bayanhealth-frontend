---
target: doctor post-consult workspace + patient intake vs pilot feedback
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 5
target_identity: "file:C:\\dev\\youi\\bayanhealth-frontend\\src\\features\\consultation\\components\\postConsultation"
timestamp: 2026-11-03T11-23-25Z
slug: consultation-components-postconsultation-ac602e59
---
# Critique: doctor post-consult workspace + patient intake (vs clinical pilot feedback)

Nielsen total 25/40 (Acceptable). Heuristics: 1=3, 2=2, 3=3, 4=2, 5=3, 6=2, 7=2, 8=3, 9=3, 10=2.
Detector: 0 findings across 6 targets (tokens hide hex/gradient rules). Static sweep found contrast, touch-target and emoji issues.

## Priority issues
- [P1] Contrast: white on --action-primary #18a58c = 3.1:1 both themes; document paper bg-white with --navy-700 headings inverts to #97c0d8 in dark (~1.9:1, DocumentSheetModal.tsx:195, PrescriptionSheet.tsx:81); --text-subtle 2.52:1 light / ~4.3:1 dark, 36 uses; 10px labels PatientCompanionSuite.tsx.
- [P1] Incomplete preview before signing: DocumentSheetModal called without license/PTR (ArtifactCard.tsx:484-490); PRC/PTR "—"; no address; validity hardcoded +30d (PrescriptionSheet.tsx:52); Finish sheet lists only outstanding groups.
- [P1] No chart in the call: DoctorClinicalCompanionSuite has Intake + Chat only; no prior encounters; lab-orders API (careContinuity.ts) unused by doctor UI.
- [P1/P2] Clinical fields: "Known medical conditions" (PatientDetails.tsx:390), "Restrictions" (ArtifactPayloadEditor.tsx:342, ArtifactPayloadView.tsx:192), LMP never asked (intakeMapper supports it), ICD raw code box (AssessmentFirstWorkspace.tsx:2348-2410), single diagnosis contract.
- [P1] Patient intake: clinical step titles, legal consent at 12px (AdditionalInfoSection.tsx:226), SpO2 jargon, no Taglish, /intake/[token] uses old 3-step form (ProgressStepper.tsx:8-10), emojis in ServiceRequestSection.tsx:174-219, 23 inputs h-11 in services/*, OtherRelationshipField.tsx:96 h-8.

## Also
- Re-run safety check shown for every lock incl. operator_hold, disabled with title-only tooltip (AssessmentFirstWorkspace.tsx:1866-1880).
- Desktop stepper pills are spans that look like tabs (WorkspaceChrome.tsx:50-62).
- Typo "Couldnt load booking" (PatientBookingDetail.tsx:743); raw enum in "Earlier draft" (AssessmentFirstWorkspace.tsx:1700).
