# During Consultation

> **Current provider direction:** Google Meet is a planned external video transport. BayanHealth retains the clinical state, authorization, chat fallback, and audit record. See `architecture/GOOGLE_MEET_INTEGRATION.md`.

## Narrative

As an assigned doctor or owning patient, I want to communicate during a consultation while keeping clinical decisions and records in BayanHealth.

## Background

Given the users entered a consultation through an authorized BayanHealth action, they may use Google Meet video if available or BayanHealth chat if video fails.

## Scenarios

### Happy: Participants use the authorized provider session

Given I am the assigned doctor or owning patient
When I open the authorized video join action
Then I join the externally hosted meeting in a new browser context
And BayanHealth remains available for chat, clinical documents, and state updates.

### Edge: Video degrades or provider access fails

Given the video provider is unavailable, disconnected, or cannot admit a participant
When either participant cannot continue video
Then the product offers BayanHealth chat as the fallback
And no client exposes Google credentials, provider internals, or another consultation’s join action.

### Safety: AI only supports Subjective and Objective organization

Given I am in the live consultation
When AI support is available
Then it may organize intake and Subjective/Objective context only
And Assessment, Plan, Rx, ICD, certificate, lab/imaging request, and patient education remain unavailable until the physician confirms an Assessment post-consult.

### Clinical-state boundary

Given a participant joins or leaves Google Meet
When the provider session changes
Then that event is not evidence of clinical completion
And only the authorized BayanHealth consultation lifecycle may complete the consultation or unlock post-consult actions.