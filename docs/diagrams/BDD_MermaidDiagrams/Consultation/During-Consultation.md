# Title / Flow : During Consultation

## Narrative

AS a ROLE
I WANT to ACTION during consultation
SO THAT I can communicate with OTHER_ROLE

Example:

| ROLE | ACTION | OTHER_ROLE |
| --- | --- | --- |
| Doctor | diagnose | Patient |
| Patient | provide context | Doctor |

## Background:

GIVEN the system is online
And Patient and Doctor are teleconsulting in third-party communication application

## Scenarios

### Scenario outline [HAPPY] : SOAP notes and other patient’s medical documents are being drafted by AI in background

GIVEN I am a ROLE
WHEN I am on a consultation session with OTHER_ROLE
**THEN** I should get notified that AI is working in background for SOAP notes and other patient’s medical  documents

Example:

| ROLE | OTHER_ROLE |
| --- | --- |
| Doctor | Patient |
| Patient | Doctor |

### Scenario [NEGATIVE] : ?

GIVEN ?
WHEN?
THEN ?
AND ?

### Scenario [EDGE] : ?

GIVEN ?
WHEN ?
THEN ?

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient
    actor Doctor as Doctor
    participant External as 3rd Party Call App (Messenger, WhatsApp, Viber)
    participant Sys as Backend
    participant DB as Database

    %% Background State: Active Consultation
    Note over Patient, External: Active Call on External App
    Patient->>External: Provides context and symptoms
    Doctor->>External: Diagnoses patient

    %% Happy Path: AI Processing & DB Saving
    Note over External, DB: [HAPPY] Background Processing
    Sys->>Sys: AI Engine streams and analyzes call audio
    Sys->>Sys: Generate completed SOAP notes & medical documents
    Sys->>DB: Save finalized transcripts and documents to DB
    DB-->>Sys: Confirm Save Success
    
    Note over External , DB: [NEGATIVE] AI SUGGESTION
    %% Suggested Negative Path: Stream Disruption
    Note over External, Sys: [NEGATIVE] Audio Stream Quality Drop
    External->>External: Audio degrades / signal drops
    Sys->>Sys: Processing Error: Cannot transcribe audio cleanly
    Sys->>DB: Save partial/flagged transcript with "Low Quality" warning tag

    %% Suggested Edge Path: Sudden App Crash
    Note over Patient, Doctor: [EDGE] Call Disconnects / Drops
    External->>External: App crashes or call terminates abruptly
    Sys->>Sys: Audio stream cuts off unexpectedly
    Sys->>Sys: Trigger Safeguard: Auto-compile transcript up to last second
    Sys->>DB: Emergency save partial SOAP notes to DB (Prevent Data Loss)
```