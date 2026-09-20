# Pre-Consultation

> **Current provider direction:** Google Meet is the planned video transport, not a clinical system of record. It is backend-mediated and not yet implemented; see `architecture/GOOGLE_MEET_INTEGRATION.md`.

## Narrative

As an assigned doctor, I want to provision an eligible video consultation so the assigned patient can join through an authorized BayanHealth action.

## Background

Given the patient has a confirmed or in-progress video booking, consent and assignment are valid, and the doctor is KYC-eligible.

## Scenarios

### Happy: Doctor provisions the video session

Given I am the assigned doctor for an eligible video booking
When I request video-session provisioning through BayanHealth
Then the backend creates or reuses one consultation-scoped provider space idempotently
And it records only minimum provider metadata and audit state
And it never logs or exposes the provider join URI in a list, error, or notification.

### Happy: Authorized patient retrieves the join action

Given my assigned doctor has provisioned the eligible session
When I request the video-session action as the owning patient
Then BayanHealth verifies my ownership before returning the short-lived join action
And I can open the provider in a new browser context.

### Negative: Unassigned or ineligible actor requests access

Given I am not the owning patient or assigned doctor, or the booking is not eligible
When I request provisioning or a join action
Then BayanHealth returns the standard non-disclosing authorization result
And no provider metadata or join action is revealed.

### Edge: Provider provisioning fails

Given Google Meet cannot create or retrieve the space
When the backend reports the failure
Then the UI explains that video is unavailable without exposing provider detail
And BayanHealth chat remains available as the consultation fallback.

## Clinical-state boundary

Creating, joining, or ending a Meet session does not mark a consultation clinically complete, unlock CDS, finalize documents, or release findings. Those actions follow the independent BayanHealth clinical workflow.