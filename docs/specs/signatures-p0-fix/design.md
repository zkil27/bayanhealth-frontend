# Signatures P0 Fix — Bugfix Design

## Overview

The post-consultation signature screen (`Signatures.tsx`) is entirely non-functional. Signing state is hardcoded, buttons lack handlers, form inputs are uncontrolled, and the "Sign All & Release" button is disconnected from the backend. Additionally, `SOAPTextEditor.tsx` and `AssessmentTextEditor.tsx` default to visible placeholder text when no `aiPregeneratedDoc` prop is provided. This fix wires the signature flow end-to-end using the existing `useConsultationDocument` hook and the backend `PUT /v1/consultations/{consultationId}/documents/{documentId}` endpoint with `status: "finalized"`, and removes placeholder defaults from the text editors.

## Glossary

- **Bug_Condition (C)**: The set of interactions with the signature drawer and text editors that currently produce no effect or incorrect content — signing buttons, form validation, "Sign All & Release", and editor default text
- **Property (P)**: Each sign action triggers `PUT { status: "finalized" }` for the corresponding document, form inputs are controlled and validated, and "Sign All & Release" calls the backend only when all required documents are signed
- **Preservation**: Mouse interactions, drawer layout, pending-badge, legal disclaimer, and editor lock behavior must remain unchanged
- **SignatureDrawer**: The `SignatureDrawer` component in `frontend/.../postConsultation/Signatures.tsx` that renders the review-and-sign flow
- **SOAPTextEditor**: The Tiptap-based rich text editor in `SOAPTextEditor.tsx` with a default parameter `aiPregeneratedDoc`
- **AssessmentTextEditor**: The Tiptap-based rich text editor in `AssessmentTextEditor.tsx` with a default parameter `aiPregeneratedDoc`
- **useConsultationDocument**: The existing React hook that manages document CRUD + finalize via the backend API with idempotent writes
- **consultationId**: The `con_*` identifier for the active consultation session, required to scope API calls

## Bug Details

### Bug Condition

The bug manifests when a doctor interacts with any signing control in the signature drawer, or when either text editor renders without an `aiPregeneratedDoc` prop. The `SignatureDrawer` component has hardcoded `const soapSigned = false` and `const prescriptionSigned = false`, buttons have no `onClick` handlers, the "Signer Name" input and "I have reviewed" checkbox are uncontrolled, and "Sign All & Release" is permanently disabled with no handler. The text editors ship with placeholder default parameter values that render as visible content.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type UserInteraction | ComponentRender
  OUTPUT: boolean

  RETURN (
    (input.type == "click" AND input.target IN ["Sign SOAP", "Sign Prescription", "Sign Certificate", "Sign Request", "Sign All & Release"])
    OR (input.type == "input" AND input.target IN ["signerName", "reviewedCheckbox"])
    OR (input.type == "render" AND input.component == "SOAPTextEditor" AND input.props.aiPregeneratedDoc == undefined)
    OR (input.type == "render" AND input.component == "AssessmentTextEditor" AND input.props.aiPregeneratedDoc == undefined)
  )
END FUNCTION
```

### Examples

- Doctor clicks "Sign SOAP" → Expected: API call to finalize SOAP document, button updates to "✅ Signed". Actual: Nothing happens, button remains.
- Doctor clicks "Sign Prescription" → Expected: API call to finalize prescription document, signed state updates. Actual: No handler attached.
- Doctor types "Dr. Ahmed" in Signer Name, checks "I have reviewed", clicks "Sign All & Release" → Expected: All documents finalized via backend, consultation released. Actual: Button is disabled (depends on always-false state), no handler.
- `<SOAPTextEditor title="subjective" />` renders without `aiPregeneratedDoc` → Expected: Empty editor. Actual: Displays literal `"<p>AI pregenerated text should be filled here.</p>"`.
- `<AssessmentTextEditor />` renders without `aiPregeneratedDoc` → Expected: Empty editor. Actual: Displays literal `"assessment"` text.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse clicks on the drawer trigger badge must continue to open the drawer
- The pending-signature count badge calculation and display must remain correct
- Document list layout (SOAP Notes, Prescription, Medical Certificate, Lab/Imaging Request rows) must remain visually identical
- Electronic signature section layout (signer name field, checkbox, signature pad dialog, legal disclaimer) must remain identical
- The editor lock toggle must continue to prevent editing in both `SOAPTextEditor` and `AssessmentTextEditor`
- When `aiPregeneratedDoc` is provided with real content, editors must continue to render that content

**Scope:**
All inputs that do NOT involve signing actions, form validation for signing, or text editor default initialization should be completely unaffected by this fix. This includes:
- All existing TipTap toolbar buttons (bold, italic, lists, undo, redo, wand, mic)
- The `SignaturePadDialog` canvas drawing behavior
- Drawer open/close mechanics
- The `SOAPContext` component composition

## Hypothesized Root Cause

Based on the source code analysis, the issues are definitively identified (not hypothesized):

1. **Hardcoded Signing State**: `Signatures.tsx` lines 24–25 declare `const soapSigned = false` and `const prescriptionSigned = false` as plain constants instead of React state tied to actual document status. This causes the drawer to always show documents as unsigned and keeps "Sign All & Release" permanently disabled.

2. **Missing onClick Handlers**: The four `<Button size="sm">` elements for "Sign SOAP", "Sign Prescription", "Sign Certificate", and "Sign Request" have no `onClick` prop. They render as clickable buttons but perform no action.

3. **Uncontrolled Form Inputs**: The `<input type="text" placeholder="Full legal name">` and `<input type="checkbox" id="reviewed">` are uncontrolled DOM elements — their values are never captured in React state, preventing any validation logic.

4. **Disconnected "Sign All & Release"**: The final `<Button>` has `disabled={!soapSigned || !prescriptionSigned}` (always `true`) and no `onClick` handler. Even if it were enabled, it has no connection to the backend finalize endpoint.

5. **Placeholder Default Parameters**: `SOAPTextEditor` has `aiPregeneratedDoc = "<p>AI pregenerated text should be filled here.</p>"` as the default parameter value. `AssessmentTextEditor` has `aiPregeneratedDoc = "assessment"`. Both pass this default to the Tiptap editor's `content` option, making it render as visible document content.

6. **Missing consultationId Prop**: `SignatureDrawer` currently accepts no props and has no access to the consultation context needed to make API calls.

## Correctness Properties

Property 1: Bug Condition - Sign Buttons Trigger Document Finalization

_For any_ click on a sign button ("Sign SOAP", "Sign Prescription", "Sign Certificate", "Sign Request") where the corresponding consultation document exists in `draft` status, the fixed `SignatureDrawer` SHALL call `updateConsultationDocument(consultationId, documentId, token, { status: "finalized" })` and update local state to reflect the signed status on success.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - Form Validation Gates Signing

_For any_ attempt to sign a document, the fixed `SignatureDrawer` SHALL require that the signer name is non-empty and the "I have reviewed" checkbox is checked before permitting the sign action, and SHALL track both values as controlled React state.

**Validates: Requirements 2.4**

Property 3: Bug Condition - Sign All & Release Calls Backend

_For any_ click on "Sign All & Release" where all required documents are signed and form validation passes, the fixed `SignatureDrawer` SHALL call the backend to finalize all remaining documents and release the consultation.

**Validates: Requirements 2.3**

Property 4: Bug Condition - Text Editors Default to Empty Content

_For any_ render of `SOAPTextEditor` or `AssessmentTextEditor` where `aiPregeneratedDoc` is not provided, the fixed editors SHALL initialize with empty content (`""`) instead of placeholder text.

**Validates: Requirements 2.5, 2.6**

Property 5: Preservation - Existing Editor Behavior Unchanged

_For any_ render of `SOAPTextEditor` or `AssessmentTextEditor` where `aiPregeneratedDoc` IS provided with non-empty content, the fixed editors SHALL produce the same rendered output as the original editors, preserving toolbar functionality, lock behavior, and content display.

**Validates: Requirements 3.1, 3.2, 3.5**

Property 6: Preservation - Drawer Visual Layout Unchanged

_For any_ render of the signature drawer, the fixed component SHALL preserve the pending-signature badge, document list layout, electronic signature section, and legal disclaimer without visual regression, and SHALL continue to disable "Sign All & Release" when not all required documents are signed.

**Validates: Requirements 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `frontend/bayan-health-mvp/src/features/consultation/components/postConsultation/SOAPTextEditor.tsx`

**Function**: Default parameter of `SOAPTextEditor`

**Specific Changes**:
1. **Change default parameter value**: Replace `aiPregeneratedDoc = "<p>AI pregenerated text should be filled here.</p>"` with `aiPregeneratedDoc = ""`

---

**File**: `frontend/bayan-health-mvp/src/features/consultation/components/postConsultation/AssessmentTextEditor.tsx`

**Function**: Default parameter of `AssessmentTextEditor`

**Specific Changes**:
1. **Change default parameter value**: Replace `aiPregeneratedDoc = "assessment"` with `aiPregeneratedDoc = ""`

---

**File**: `frontend/bayan-health-mvp/src/features/consultation/components/postConsultation/Signatures.tsx`

**Function**: `SignatureDrawer` component

**Specific Changes**:
1. **Accept `consultationId` prop**: Add `consultationId: string` prop so the component can scope API calls to the correct consultation.

2. **Replace hardcoded state with React state**: Replace `const soapSigned = false` / `const prescriptionSigned = false` with `useState` booleans (or a record keyed by document type) that track actual signing status. Optionally use `useConsultationDocument` instances per document type, or manage a lighter-weight state that calls the API directly.

3. **Add controlled form state**: Add `useState` for `signerName: string` and `reviewedChecked: boolean`. Wire `value` + `onChange` to the signer name input and `checked` + `onChange` to the checkbox.

4. **Add validation logic**: Create a `canSign` derived boolean: `signerName.trim().length > 0 && reviewedChecked`. Disable sign buttons when `!canSign`.

5. **Add sign button handlers**: Each sign button gets an `onClick` that calls `updateConsultationDocument(consultationId, documentId, token, { status: "finalized" })` for its document type. On success, update the corresponding signed state. Show loading state during the API call.

6. **Wire "Sign All & Release"**: Enable the button when all required documents are signed AND `canSign`. On click, call the backend to finalize any remaining documents (or confirm all are finalized). Optionally call a release/complete endpoint if the business flow requires it.

7. **Fetch initial document state**: On mount (or via a parent-provided prop), list existing documents for the consultation to determine which are already finalized, initializing the signed state correctly.

8. **Error handling**: Display error feedback (toast or inline alert) when a sign call fails, matching the pattern used by `ConsultationDocumentPanel`.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis by observing that clicks and renders produce no effect.

**Test Plan**: Write component tests using React Testing Library that simulate user interactions on the UNFIXED `SignatureDrawer` and render the editors without props. Assert that the expected outcomes (API calls, state changes, empty editors) do NOT occur.

**Test Cases**:
1. **Sign SOAP Button Test**: Render `SignatureDrawer`, click "Sign SOAP" → assert no API call made (will confirm bug on unfixed code)
2. **Sign Prescription Button Test**: Render `SignatureDrawer`, click "Sign Prescription" → assert no API call made (will confirm bug on unfixed code)
3. **Form Validation Test**: Type in signer name, check checkbox → assert values not tracked in any state (will confirm bug on unfixed code)
4. **Sign All & Release Test**: Assert button is always disabled regardless of any interaction (will confirm bug on unfixed code)
5. **SOAPTextEditor Default Test**: Render `<SOAPTextEditor title="subjective" />` → assert editor contains placeholder text (will confirm bug on unfixed code)
6. **AssessmentTextEditor Default Test**: Render `<AssessmentTextEditor />` → assert editor contains "assessment" text (will confirm bug on unfixed code)

**Expected Counterexamples**:
- No API calls are triggered on any sign button click
- Form inputs have no controlled state (values reset or are inaccessible)
- Editors render with visible placeholder content when no prop is passed
- Possible causes confirmed: hardcoded constants, missing onClick, uncontrolled inputs, placeholder defaults

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := SignatureDrawer_fixed(input)
  ASSERT expectedBehavior(result)
END FOR
```

Concretely:
- For each sign button click → assert `updateConsultationDocument` called with `{ status: "finalized" }` for correct document type
- For form inputs → assert controlled state updates
- For "Sign All & Release" → assert enabled when conditions met, calls backend on click
- For editor renders without prop → assert empty content

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT SignatureDrawer_original(input) = SignatureDrawer_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (random `aiPregeneratedDoc` content strings, random editor states)
- It catches edge cases where the default change might affect content initialization
- It provides strong guarantees that toolbar/lock behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for editor rendering with provided content, toolbar interactions, and drawer layout. Then write property-based tests capturing that behavior.

**Test Cases**:
1. **Editor Content Preservation**: Render `SOAPTextEditor` and `AssessmentTextEditor` with various non-empty `aiPregeneratedDoc` values → verify rendered content matches input on both old and new code
2. **Drawer Layout Preservation**: Snapshot the drawer DOM structure → verify no layout changes in document list, signature section, or legal disclaimer
3. **Lock Toggle Preservation**: Toggle lock on editors → verify editing is prevented identically to original
4. **Pending Count Preservation**: Verify pending count badge logic still works correctly based on actual signed state

### Unit Tests

- Test that each sign button calls `updateConsultationDocument` with the correct document type and `{ status: "finalized" }`
- Test that sign buttons are disabled when `signerName` is empty or checkbox is unchecked
- Test that "Sign All & Release" is enabled only when all required documents are signed and validation passes
- Test that `SOAPTextEditor` renders empty content when `aiPregeneratedDoc` is `undefined`
- Test that `AssessmentTextEditor` renders empty content when `aiPregeneratedDoc` is `undefined`
- Test that editors still render provided `aiPregeneratedDoc` content correctly
- Test error handling: when API call fails, state reverts and error is displayed

### Property-Based Tests

- Generate random non-empty HTML strings as `aiPregeneratedDoc` and verify both editors render them identically to the original implementation
- Generate random signing sequences (varying order of document signings) and verify the final state is always consistent
- Generate random form validation states (empty name, whitespace-only name, valid name × checked/unchecked) and verify `canSign` logic is correct

### Integration Tests

- Test full signing flow: open drawer → fill signer name → check reviewed → sign each document → verify "Sign All & Release" becomes enabled → click it → verify backend calls
- Test partial signing: sign only SOAP → verify "Sign All & Release" remains disabled
- Test error recovery: mock API failure on one sign → verify other documents remain signable and error feedback appears
- Test re-entry: documents already finalized on the backend → verify drawer shows them as signed on mount
