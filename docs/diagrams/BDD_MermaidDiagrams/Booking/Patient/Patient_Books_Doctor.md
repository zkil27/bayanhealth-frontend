# Title / Flow : Patient Books Doctor

## Narrative

AS a Patient
I WANT to browse doctors
SO THAT I can book doctor to my specific needs

## Background:

GIVEN I am on the doctor marketplace page

## Scenarios

### Scenario [HAPPY] : Doctors Recommendations

GIVEN I have not filtered the doctor list
WHEN I see the first three doctors among the list
**THEN** it should be the highly recommendation of the system that is catered to my profile
AND I am encouraged to look at these doctors pages.

### Scenario [HAPPY] : Doctor Page

GIVEN I have found the doctor I want
WHEN I visit the doctor page
**THEN** I should be able to get more information about the doctor’s credibility in academic, social media, and current status as doctor.

### Scenario outline [HAPPY] : Doctor Booking

GIVEN I am booking a specific doctor
WHEN I am on the doctor booking page
**THEN** I am notified by the system that the doctor is AVAILABILITY_STATUS
AND I am able to choose between BOOKING_TYPE to book

| AVAILABILITY_STATUS | BOOKING_TYPE |
| --- | --- |
| Available | On-demand (Regular) |
| Busy | Add me to doctor’s Queue |
| Busy/Not Available | Scheduled |

### Scenario [NEGATIVE] : ?

GIVEN ?
WHEN?
THEN ?
AND?

### Scenario [EDGE] : ?

GIVEN ?
WHEN ?
THEN ?

```mermaid
---
title: Patient Books A Doctor
---
sequenceDiagram
    autonumber
    actor Patient
    participant UI as Doctor Marketplace Interface
    participant Sys as System / Backend

    %% Happy Path: Recommendations
    Note over Patient, UI: [HAPPY] Doctor Recommendations
    Patient->>UI: Navigates to Doctor Marketplace
    UI->>Sys: Fetch doctor list (Unfiltered)
    Sys-->>UI: Return list with Top 3 Profile-Catered recommendations
    UI->>Patient: Render list (Highlighting top 3 recommended doctors)

    %% Happy Path: Doctor Page
    Note over Patient, UI: [HAPPY] Doctor Profile View
    Patient->>UI: Clicks on a recommended doctor's profile
    UI->>Sys: Fetch doctor details
    Sys-->>UI: Return academic, social media, & active status data
    UI->>Patient: Display doctor credibility & background info

    %% Happy Path: Booking Types & Availability
    Note over Patient, UI: [HAPPY] Booking Selection
    Patient->>UI: Clicks "Book Doctor"
    UI->>Sys: Check Doctor Availability Status
    
    Note over UI: Always Available: Scheduled Booking Option
    
    alt Status: Available
        Sys-->>UI: Return "Available"
        UI->>Patient: Show Options: On-demand (Regular) OR Scheduled Booking
    else Status: Busy
        Sys-->>UI: Return "Busy"
        UI->>Patient: Show Options: Add me to Doctor's Queue OR Scheduled Booking
    else Status: Busy/Not Available
        Sys-->>UI: Return "Not Available"
        UI->>Patient: Show Option: Scheduled Booking Only
    end

    %% Suggested Negative Path
    Note over Patient, UI: [NEGATIVE (Suggested)] No Open Slots / Queue Full
    Patient->>UI: Tries to join Busy Doctor's Queue
    Sys-->>UI: Error: Queue capacity reached
    UI->>Patient: Show Notification: "Queue full. Please use Scheduled Booking instead."

    %% Suggested Edge Path
    Note over Patient, UI: [EDGE (Suggested)] Concurrency Booking Conflict
    Patient->>UI: Submits a "Scheduled" booking slot
    Sys-->>UI: Error: Slot just taken by another patient (Race Condition)
    UI->>Patient: Show Alert: "This slot was just booked. Please pick another time."
```