# Post-Consultation

> **Safety boundary:** A Google Meet join, leave, or end event never completes a clinical consultation, unlocks CDS, finalizes a document, or releases findings. Post-consult work remains inside BayanHealth.
>
> **Validation status:** The repository implements and locally tests this assessment-first sequence, CPG Preview bounds, all seven protected outputs, distinct finalization/release, and retired-route denial. Clinical scenario review by the CEO/Clinical Lead and environment rollout evidence remain unrecorded and therefore block clinical canary and production.

## Narrative

As an assigned doctor, I want to complete the clinical workflow after the consultation so I can create, sign, and release accurate patient findings.

## Background

Given the clinical consultation is ended through the authorized BayanHealth lifecycle, the doctor may begin the assessment-first post-consult workflow.

## Scenarios

### Happy: Doctor confirms the Assessment before drafting

Given I have reviewed the consultation and intake information
When I select or type and confirm an Assessment
Then BayanHealth records the assessment version and authorizes the protected post-consult generation path
And Plan, Rx, ICD, certificate, lab/imaging request, and patient education remain locked until that confirmation.

### Happy: Doctor reviews, signs, and releases findings

Given I have an authorized draft and have reviewed its clinical content
When I finalize the applicable document with the required electronic signature
Then BayanHealth persists the signed final document and any verification record atomically
And only then can I release eligible findings to the owning patient.

### Negative: Doctor tries to bypass the assessment gate

Given I have not confirmed an Assessment, or the assessment changed after drafting
When I request protected generation or finalization
Then the backend denies the request and keeps dependent artifacts locked or stale
And no protected content is returned to the browser.

### Edge: Video provider ended but clinical workflow is incomplete

Given the Google Meet session has ended
When no BayanHealth clinical-completion action has occurred
Then the consultation remains clinically incomplete
And the doctor may continue through BayanHealth chat or complete the authorized post-consult workflow when appropriate.