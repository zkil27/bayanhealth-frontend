# Implementation Plan

## Overview

Fix the post-consultation signature screen P0 bugs using the bug condition methodology: first explore the bugs with failing tests, then preserve existing behavior, then implement the fix, and finally validate everything passes.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Signature Drawer Non-Functional Controls & Editor Placeholder Defaults
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the six bugs exist in unfixed code
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases: sign button clicks, form input tracking, "Sign All & Release" enablement, and editor default renders
  - Test file: `frontend/bayan-health-mvp/src/features/consultation/components/postConsultation/__tests__/Signatures.bugcondition.test.tsx`
  - **Bug Condition from design**: `isBugCondition(input)` returns true when:
    - `input.type == "click"` AND `input.target IN ["Sign SOAP", "Sign Prescription", "Sign Certificate", "Sign Request", "Sign All & Release"]`
    - `input.type == "input"` AND `input.target IN ["signerName", "reviewedCheckbox"]`
    - `input.type == "render"` AND `input.component == "SOAPTextEditor"` AND `input.props.aiPregeneratedDoc == undefined`
    - `input.type == "render"` AND `input.component == "AssessmentTextEditor"` AND `input.props.aiPregeneratedDoc == undefined`
  - Test assertions (Expected Behavior from design):
    - Clicking "Sign SOAP" calls `updateConsultationDocument` with `{ status: "finalized" }` for SOAP doc
    - Clicking "Sign Prescription" calls `updateConsultationDocument` with `{ status: "finalized" }` for prescription doc
    - Typing in "Signer Name" updates controlled React state
    - Checking "I have reviewed" checkbox updates controlled React state
    - "Sign All & Release" becomes enabled when all required docs are signed and validation passes
    - `<SOAPTextEditor title="subjective" />` without `aiPregeneratedDoc` renders empty content (not placeholder)
    - `<AssessmentTextEditor />` without `aiPregeneratedDoc` renders empty content (not "assessment")
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - No API calls triggered on sign button clicks (hardcoded `const soapSigned = false`)
    - Form inputs uncontrolled (values not tracked in state)
    - "Sign All & Release" always disabled (depends on always-false constants)
    - SOAPTextEditor renders `"<p>AI pregenerated text should be filled here.</p>"`
    - AssessmentTextEditor renders `"assessment"`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Editor Content Rendering & Drawer Layout Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `frontend/bayan-health-mvp/src/features/consultation/components/postConsultation/__tests__/Signatures.preservation.test.tsx`
  - **Observation phase** (run on UNFIXED code):
    - Observe: `<SOAPTextEditor title="subjective" aiPregeneratedDoc="<p>Patient reports headache.</p>" />` renders that content correctly
    - Observe: `<AssessmentTextEditor aiPregeneratedDoc="<p>Mild tension headache.</p>" />` renders that content correctly
    - Observe: Editor lock toggle prevents editing in both editors
    - Observe: Signature drawer renders pending-badge count, document list, electronic signature section, legal disclaimer
    - Observe: "Sign All & Release" is disabled when documents are unsigned
  - **Property-based tests** (from Preservation Requirements in design):
    - For all non-empty `aiPregeneratedDoc` string values, `SOAPTextEditor` renders that content identically to original
    - For all non-empty `aiPregeneratedDoc` string values, `AssessmentTextEditor` renders that content identically to original
    - For all editor states with lock enabled, editing is prevented
    - Drawer layout snapshot matches: document list rows (SOAP Notes, Prescription, Medical Certificate, Lab/Imaging Request), signature section, legal disclaimer
    - "Sign All & Release" disabled when not all required documents are signed
  - **Testing approach**: Use fast-check for property-based generation of random HTML content strings for `aiPregeneratedDoc`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for post-consultation signature screen non-functional controls and editor placeholder defaults

  - [x] 3.1 Remove placeholder default parameters from SOAPTextEditor and AssessmentTextEditor
    - In `SOAPTextEditor.tsx`: change default parameter `aiPregeneratedDoc = "<p>AI pregenerated text should be filled here.</p>"` to `aiPregeneratedDoc = ""`
    - In `AssessmentTextEditor.tsx`: change default parameter `aiPregeneratedDoc = "assessment"` to `aiPregeneratedDoc = ""`
    - _Bug_Condition: isBugCondition(input) where input.type == "render" AND input.component IN ["SOAPTextEditor", "AssessmentTextEditor"] AND input.props.aiPregeneratedDoc == undefined_
    - _Expected_Behavior: Editors initialize with empty content instead of placeholder text_
    - _Preservation: When aiPregeneratedDoc IS provided with real content, editors continue to render that content_
    - _Requirements: 2.5, 2.6, 3.1, 3.2_

  - [x] 3.2 Add consultationId prop and replace hardcoded signing state in Signatures.tsx
    - Add `consultationId: string` to the `SignatureDrawer` component props interface
    - Replace `const soapSigned = false` and `const prescriptionSigned = false` with `useState` booleans (or a record keyed by document type: `{ soap: boolean, prescription: boolean, certificate: boolean, request: boolean }`)
    - Optionally fetch initial document state on mount via `useConsultationDocument` to determine which are already finalized
    - _Bug_Condition: isBugCondition(input) where soapSigned and prescriptionSigned are hardcoded false constants_
    - _Expected_Behavior: Signed state reflects actual signing actions and persisted document status_
    - _Preservation: Pending count badge and document list layout unchanged_
    - _Requirements: 2.1, 3.3_

  - [x] 3.3 Add controlled form state for signer name and reviewed checkbox
    - Add `useState<string>("")` for `signerName` and `useState<boolean>(false)` for `reviewedChecked`
    - Wire `value` + `onChange` to the signer name `<input>` element
    - Wire `checked` + `onChange` to the reviewed `<input type="checkbox">` element
    - Derive `canSign = signerName.trim().length > 0 && reviewedChecked`
    - Disable sign buttons when `!canSign`
    - _Bug_Condition: isBugCondition(input) where input.type == "input" AND input.target IN ["signerName", "reviewedCheckbox"]_
    - _Expected_Behavior: Form values tracked as controlled React state, validation gates signing_
    - _Preservation: Electronic signature section layout unchanged_
    - _Requirements: 2.4_

  - [x] 3.4 Add onClick handlers to individual sign buttons
    - Each sign button ("Sign SOAP", "Sign Prescription", "Sign Certificate", "Sign Request") gets an `onClick` handler
    - Handler calls `updateConsultationDocument(consultationId, documentId, token, { status: "finalized" })` for the corresponding document type
    - On success: update the corresponding signed state to `true`
    - Show loading/spinner state during the API call
    - On error: display error feedback (toast or inline alert) matching `ConsultationDocumentPanel` pattern, do not update signed state
    - _Bug_Condition: isBugCondition(input) where input.type == "click" AND input.target IN ["Sign SOAP", "Sign Prescription", "Sign Certificate", "Sign Request"]_
    - _Expected_Behavior: API call to finalize document, local state updated on success_
    - _Preservation: Button layout and visual styling unchanged_
    - _Requirements: 2.2_

  - [x] 3.5 Wire "Sign All & Release" button
    - Enable button when: all required documents are signed AND `canSign` is true
    - Add `onClick` handler that calls the backend to finalize any remaining documents and release the consultation
    - Show loading state during the API call
    - Handle errors with feedback matching existing patterns
    - _Bug_Condition: isBugCondition(input) where input.type == "click" AND input.target == "Sign All & Release"_
    - _Expected_Behavior: Button enabled when conditions met, calls backend finalize/release endpoint on click_
    - _Preservation: Button remains disabled when not all required documents are signed (requirement 3.4)_
    - _Requirements: 2.3, 3.4_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Signature Drawer Non-Functional Controls & Editor Placeholder Defaults
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Editor Content Rendering & Drawer Layout Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite for the postConsultation components
  - Ensure bug condition test passes (confirms fix works)
  - Ensure preservation tests pass (confirms no regressions)
  - Ensure no TypeScript strict mode errors introduced
  - Ensure ESLint passes with no new warnings
  - Ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "3.2"] },
    { "id": 2, "tasks": ["3.3"] },
    { "id": 3, "tasks": ["3.4"] },
    { "id": 4, "tasks": ["3.5"] },
    { "id": 5, "tasks": ["3.6"] },
    { "id": 6, "tasks": ["3.7"] },
    { "id": 7, "tasks": ["4"] }
  ]
}
```

## Notes

- Tasks 1 and 2 can be executed in parallel since they are independent
- Tasks 3.1 (editor defaults) is independent of 3.2–3.5 (Signatures.tsx changes) and can be done in parallel
- The `useConsultationDocument` hook and `PUT /v1/consultations/{consultationId}/documents/{documentId}` endpoint already exist — no backend changes needed
- All changes are scoped to three files in `frontend/bayan-health-mvp/src/features/consultation/components/postConsultation/`
- Use React Testing Library + fast-check for property-based preservation tests
- Match error handling patterns from `ConsultationDocumentPanel` for consistency
