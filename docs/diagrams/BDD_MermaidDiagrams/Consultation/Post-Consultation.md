# Title / Flow : Post-Consultation

## Narrative

AS a ROLE
I WANT to ACTION after the consultation
SO THAT I can fulfill goal of the consultation

Example:

| ROLE | ACTION |
| --- | --- |
| Doctor | Review Patient’s SOAP notes and other Medical documents |
| Patient | Wait for Doctor’s Findings |

## Background:

GIVEN the system is online
And Patient and Doctor have finished their consultation

## Scenarios

### Scenario [HAPPY] : Doctor reviews SOAP Notes and Patient’s other medical documents

GIVEN Doctor have finished consultation with Patient
WHEN Doctor look at the Patient’s SOAP Notes and other medical documents
**THEN** It should be pre-filled by AI to give pre-diagnosis of Patient

### Scenario outline [HAPPY] : Doctor process the Patient’s DIAGNOSIS_TAB

GIVEN Doctor have clear findings about my Patient’s request
WHEN Doctor process the Patient’s DIAGNOSIS_TAB
**THEN** Doctor should be able to ACTION
OR generate a draft for Patient’s DIAGNOSIS_TAB using AI
AND each DIAGNOSIS_TAB requires my verification and signature

Example:

| DIAGNOSIS_TAB | ACTION |
| --- | --- |
| Prescription | Prescribe medications with its [Dosage, Dispense amount, Refills] and write instructions |
| Medical Certificate | Attach a medical certificate with e-sig, Give Patient’s Diagnosis, and Recommendation |
| Lab/Imaging Requests | ? |

### Scenario [HAPPY] : Doctor on releasing Patient’s Diagnosis

GIVEN Doctor have signed the Patient’s Diagnosis
WHEN Doctor RELEASE_STATUS the Patient Diagnosis
**THEN** It should ACTION to Patient

Example:

| RELEASE_STATUS  | Action |
| --- | --- |
| Released | Sent and notify |
| Save Draft | still be “in progress” status |

### Scenario [HAPPY] : Doctor is notified for saved drafts of Patients’ Diagnoses

GIVEN Doctor have unreleased drafts of Patients’ Diagnoses
AND these unreleased drafts have no ongoing Lab/Imaging Requests
WHEN Doctor look visit his dashboard
**THEN** Doctor should be notified about these drafts
AND Doctor can view edit history of these drafts

### Scenario [HAPPY] : Patient views their Doctor’s findings

GIVEN  Doctor have released Doctor’s findings
WHEN Patient view these findings
**THEN** It should be according to my intended BOOKING_REQUEST
AND I can download the files from these findings

Example:

| BOOKING_REQUEST |
| --- |
| Fit for work |
| Fit for climb |
| Fit for travel |
| Fit for school |
| regular teleconsult |
| sick leave |

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
    actor Doctor as Doctor
    participant UI_Doc as Doctor Post Consultation Interface
    participant Sys as Backend / AI Engine
    participant DB as [DB] Database

    %% Happy Path: Doctor Reviews AI-Prefilled Docs
    Note over Doctor, UI_Doc: [HAPPY] Reviewing AI Drafts
    Doctor->>UI_Doc: Opens completed patient session
    UI_Doc->>Sys: Fetch drafted SOAP notes & documents
    Sys->>DB: Pull recorded session data
    DB-->>Sys: Return draft details
    Sys-->>UI_Doc: Render AI pre-filled data (SOAP and Prescription)

    %% Happy Path: SOAP notes, Prescription, Med Cert, Lab Request
    Note over Doctor, UI_Doc: [HAPPY] SOAP notes, Prescription, Med Cert, Lab Request
    
    alt Manual Tab Process
        Doctor->>UI_Doc: Sees and Add unto Pre-generated AI SOAP Notes
        Doctor->>UI_Doc: Fills Prescription (Dosage, Dispense, Refills), Med Cert or Lab Request
        Doctor->>UI_Doc: Applies digital signature (Verification)
    else Regeneration of AI-Generated
        Doctor->>UI_Doc: Clicks "Regenerate Draft using AI" for SOAP Notes
        UI_Doc->>Sys: Process request with AI Engine
        Sys-->>UI_Doc: Refill Fields with AI
   else Releasing Patient's Medical Record
			  UI_Doc->>Doctor: Release Buttons unavailable until consent and e-sig of doctor is submitted
			  Doctor->>UI_Doc: Signs and release Patient's Medical Records
			  UI_Doc->>Sys: sent to backend
			  Sys->>DB: Update Patient's Medical Record status
    end

    %% Happy Path: Save Draft Logic
    Note over Doctor, UI_Doc: [HAPPY] Saving Draft Progress
    Doctor->>UI_Doc: Clicks "Save Draft"
    UI_Doc->>Sys: Save current progress
    Sys->>DB: Save state as "In Progress"
    UI_Doc->>Doctor: Retain in interface as "Unreleased Draft"

    %% Happy Path: Dashboard Notifications for Drafts
    Note over Doctor, UI_Doc: [HAPPY] Unreleased Draft Reminders
    Doctor->>UI_Doc: Navigates to Dashboard home screen
    UI_Doc->>Sys: Check for unreleased drafts (with no active lab requests)
    Sys->>DB: Scan database conditions
    DB-->>Sys: Return applicable draft list
    Sys-->>UI_Doc: Display banner notification

    %% Suggested Negative Path: Incomplete Verification
    Note over Doctor, UI_Doc: [NEGATIVE] Attempting to Save/Process without Required Info
    Doctor->>UI_Doc: Tries to complete a tab without entering mandatory values
    UI_Doc->>UI_Doc: Stop process & highlight empty fields in LESS IMPORTANT COLOR
    UI_Doc->>Doctor: Alert: "Missing required instructions or dosage details."
```