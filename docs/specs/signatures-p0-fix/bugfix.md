# Bugfix Requirements Document

## Introduction

The post-consultation signature screen (`Signatures.tsx`) is non-functional: `soapSigned` and `prescriptionSigned` are hardcoded as `const false`, Sign buttons have no onClick handlers, the signer-name input and reviewed-checkbox lack controlled-input validation, and "Sign All & Release" is not connected to the backend finalize endpoint. Additionally, two text editors ship with placeholder default content that should never appear in production: `SOAPTextEditor.tsx` defaults to `"<p>AI pregenerated text should be filled here.</p>"` and `AssessmentTextEditor.tsx` defaults to `"assessment"`. This is a P0 fix — the signature flow is completely inoperable.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the doctor opens the signature drawer THEN the system always displays both SOAP and Prescription as unsigned because `soapSigned` and `prescriptionSigned` are hardcoded to `false` and can never change

1.2 WHEN the doctor clicks any Sign button ("Sign SOAP", "Sign Prescription", "Sign Certificate", "Sign Request") THEN the system does nothing because the buttons have no onClick handlers wired

1.3 WHEN the doctor clicks "Sign All & Release" THEN the system does nothing because the button is permanently disabled (depends on `soapSigned` and `prescriptionSigned` which are always `false`) and has no handler connected to the backend finalize endpoint

1.4 WHEN the doctor types in the "Signer Name" field or toggles the "I have reviewed" checkbox THEN the system does not track the input values in state, preventing any validation or use of these values during signing

1.5 WHEN `SOAPTextEditor` renders without an `aiPregeneratedDoc` prop THEN the system displays the literal placeholder text `"<p>AI pregenerated text should be filled here.</p>"` as visible content in the editor

1.6 WHEN `AssessmentTextEditor` renders without an `aiPregeneratedDoc` prop THEN the system displays the literal placeholder text `"assessment"` as visible content in the editor

### Expected Behavior (Correct)

2.1 WHEN the doctor opens the signature drawer THEN the system SHALL display the current signed/unsigned state of each document type using React state that reflects actual signing actions taken during the session

2.2 WHEN the doctor clicks a Sign button ("Sign SOAP", "Sign Prescription", "Sign Certificate", "Sign Request") THEN the system SHALL call the consultation-documents PATCH endpoint with `status: "finalized"` for the corresponding document and update the local signed state on success

2.3 WHEN the doctor clicks "Sign All & Release" with all required documents signed THEN the system SHALL call the backend finalize endpoint to mark the consultation documents as released, and the button SHALL be enabled only when all required signatures are complete and validation passes

2.4 WHEN the doctor interacts with the "Signer Name" field or the "I have reviewed" checkbox THEN the system SHALL track these values as controlled React state and SHALL validate that the signer name is non-empty and the checkbox is checked before enabling any sign action

2.5 WHEN `SOAPTextEditor` renders without an `aiPregeneratedDoc` prop THEN the system SHALL initialize the editor with an empty content state (empty string or empty paragraph) instead of placeholder text

2.6 WHEN `AssessmentTextEditor` renders without an `aiPregeneratedDoc` prop THEN the system SHALL initialize the editor with an empty content state (empty string or empty paragraph) instead of placeholder text

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `SOAPTextEditor` receives a valid `aiPregeneratedDoc` prop with real content THEN the system SHALL CONTINUE TO render that content in the editor as before

3.2 WHEN `AssessmentTextEditor` receives a valid `aiPregeneratedDoc` prop with real content THEN the system SHALL CONTINUE TO render that content in the editor as before

3.3 WHEN the signature drawer is opened THEN the system SHALL CONTINUE TO display the pending-signature count badge, document list layout, electronic signature section, and legal disclaimer without visual regression

3.4 WHEN the user has not yet signed any documents THEN the system SHALL CONTINUE TO disable the "Sign All & Release" button

3.5 WHEN the editor lock toggle is activated THEN the system SHALL CONTINUE TO prevent editing in both SOAPTextEditor and AssessmentTextEditor
