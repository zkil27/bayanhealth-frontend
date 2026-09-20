``` mermaid
---
title: Data for AI Intake and Outake
---
sequenceDiagram
    autonumber
    actor Patient
    participant DB as [DB] Backend / Database
    participant AI as AI Engine
    actor Doctor

    %% PHASE 1: INTAKE & LIVE CONSULTATION
    Note over Patient, AI: PHASE 1: INTAKE & LIVE CONSULTATION<br/>[Data: Intake Form and Patient Profile]
    Patient->>DB: Submits pre-consultation intake data
    DB->>AI: Trigger: State changes to "Confirmed" (Begin processing SOAP Notes from Intake form)
    AI->>DB: Processes transcript & saves completed SOAP Draft to Database

    Note over Patient, Doctor: Teleconsultation (In-app or 3rd Party)
    Patient->>Doctor: Conducts live consultation
    Doctor->>AI: Streams live audio data for real-time transcription
    AI->>DB: Transcribes and saves raw audio/transcript to DB

    %% PHASE 2: OUTTAKE
    Note over AI, Doctor: PHASE 2: OUTTAKE (Post-Consultation)<br/>[Data: Synthesized Audio + Form Context | AI: On-Demand Synthesis]
    AI->>DB: Processes transcript & saves completed SOAP Draft to Database
    
    Doctor->>DB: 1. Fetch Draft (Triggers ONCE on page load)
    DB-->>Doctor: Renders pre-generated SOAP notes
    
    Doctor->>AI: 2. Prescription Input (Triggers DYNAMICALLY on field changes)
    AI-->>Doctor: Updates real-time medicine suggestions
    
    Doctor->>AI: 3. Manual Override (Triggers ON-DEMAND on 'Regenerate')
    AI-->>Doctor: Clears and rewrites whole draft
```