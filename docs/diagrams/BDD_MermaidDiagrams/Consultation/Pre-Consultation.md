# Title / Flow : Pre-Consultation

## Narrative

AS a ROLE
I WANT to ACTION a consultation
SO THAT I can communicate with OTHER_ROLE

Example:

| ROLE | ACTION | OTHER_ROLE |
| --- | --- | --- |
| Doctor | Initiate | Patient |
| Patient | Join | Doctor |

## Background:

GIVEN the system is online
And Patient and Doctor are within the scheduled session

## Scenarios

### Scenario [HAPPY] : Doctor reads Patient’s intake

GIVEN Doctor have teleconsult session with Patient
WHEN Doctor look at the Patient’s intake
**THEN** It should help Doctor understand what the Patient’s purpose

### Scenario [HAPPY] : Patient waits for Doctor to initiate consultation session

GIVEN Patient have teleconsult session with Doctor
WHEN Doctor initiates the session
**THEN** then it should be my preferred communication platforms

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
    actor Doctor
    participant UI_Doc as Doctor Interface
    participant Sys as System / Backend
    participant UI_Pat as Patient Interface
    actor Patient
    participant External as 3rd Party App (Messenger, WhatsApp, Viber)

    %% Connecting Bridge from Previous Flow
    Note over Doctor, UI_Doc: [HIGH LEVEL] Bridge from Booking Flow
    Sys-->>UI_Doc: Patient Payment Confirmed -> Move to "Ready" Status
    Sys-->>UI_Pat: Update Status -> "Waiting for Doctor to Initiate"

    %% Happy Path: Doctor Reviews Intake
    Note over Doctor, UI_Doc: [HAPPY] Pre-Consultation Intake Review
    Doctor->>UI_Doc: Clicks on "Ready" Patient from Queue Board
    UI_Doc->>Sys: Fetch Patient's Intake details
    Sys-->>UI_Doc: Return form data (Patient Data, SOAP)
    UI_Doc->>Doctor: Render summary in SOAP & Preferred Platform indicator

    %% Happy Path: Handshake & Launch (In-App vs 3rd Party)
    Note over Patient, External: [HAPPY] Dynamic Platform Choice
    
    alt Platform Choice: In-App Video
        Doctor->>UI_Doc: Clicks "Initiate Consultation"
        UI_Doc->>Sys: Create teleconsult room link
        Sys->>UI_Pat: Push Alert: "Doctor is ready"
        UI_Pat->>Patient: Render "Join Now" button
        Patient->>UI_Pat: Clicks "Join Now" -> Enters internal room
        Doctor->>UI_Doc: Enters internal room
        
    else Platform Choice: 3rd Party App (Messenger / WhatsApp / Viber)
        Doctor->>UI_Doc: Clicks "Initiate via 3rd Party"
        UI_Doc->>Sys: Fetch Patient's Contact Number / Platform ID
        Sys-->>UI_Doc: Return Contact Info
        UI_Doc->>External: Deep-link launch with pre-filled template message
        Doctor->>External: Sends message & initiates call directly to Patient
        External-->>Patient: Receives Doctor's text message & call notification
        Patient->>External: Answers call / clicks link in 3rd party app
    end

    Note over Doctor, Patient: Connected: Session active on chosen platform

    %% High-Level Suggested Negative Path
    Note over Doctor, UI_Pat: [NEGATIVE] Synchronization Timeout
    Doctor->>UI_Doc: Initiates session, but Patient UI misses the push notification
    Sys->>Sys: 5-Minute Room Wait Timeout
    UI_Doc->>Doctor: Show alert: "Patient hasn't arrived yet. Resend invite link?"

    %% High-Level Suggested Edge Path
    Note over Doctor, Patient: [EDGE] Simultaneous Launch Clash
    Doctor->>Sys: Clicks "Initiate" at exact same millisecond
    Patient->>Sys: Clicks "Join" at exact same millisecond
    Sys->>Sys: Handle concurrent room assignment safely
    Sys-->>UI_Doc: Route safely to room
    Sys-->>UI_Pat: Route safely to room (No duplication errors)
```