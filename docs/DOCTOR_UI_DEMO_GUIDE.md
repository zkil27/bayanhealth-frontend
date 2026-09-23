# BayanHealth Clinician UI Demo Guide & Evaluation Rubric

> **Target Audience**: Presenter / Product Designer walking fellow physicians through the BayanHealth clinical frontend.  
> **Session Duration**: 15–20 minutes total (10 min walkthrough + 5–10 min hands-on & structured assessment).

---

## 🎯 1. Objectives of the Demo

1. **Assess Clinical Usability**: Validate whether the information density, triage visual hierarchy, and 2-column workstation reduce cognitive fatigue.
2. **Evaluate Documentation Efficiency**: Measure the speed of transitioning from an active video call into the post-consult Assessment and SOAP sign-off.
3. **Identify Practice Gaps**: Gather specific feedback on what is missing for real-world Philippine clinical practice (e.g., e-prescription formats, lab requisitions, PhilHealth/HMO workflows).

---

## 🚀 2. Demo Environment & Zero-Friction Setup

### Launch Coordinates
- **Production Preview URL (Vercel)**: `https://<your-project>.vercel.app/doctor`
- **Local Dev Server**:
  ```bash
  npm run dev
  # Open in Chrome / Safari at http://localhost:3000/doctor
  ```

### Pre-loaded Demo Workspaces (Zero Backend Required)
Use the top **Physician UI Demo Mode** navigation bar to jump directly between these clinical environments:

| Workflow Step | Direct Route | Clinical Focus |
| :--- | :--- | :--- |
| **1. Flight Deck & Triage** | `/doctor` | Physician identity, Master Duty switch, shift counters, and live triage queue. |
| **2. Active Consultation Room** | `/consultation/room/demo` | Dual-column video encounter, simulated patient feed (Maria Santos), side-by-side intake. |
| **3. Post-Consult CDS & SOAP** | `/doctor/post-consultation/id?consultationId=demo&bookingId=demo` | Assessment-first CDS workspace, ICD-10 suggestions (J06.9), active medication orders, med cert. |
| **4. Clinic Schedule** | `/doctor/schedule` | Calendar view, slot generation, buffer intervals, and availability blocks. |
| **5. Master Route Directory** | `/admin/routes` | Centralized index of all patient, doctor, and admin flows. |

---

## ⏱️ 3. Step-by-Step Walkthrough Script (10-Minute Clinical Journey)

```
[00:00 - 02:30]                   [02:30 - 05:30]                   [05:30 - 08:30]                   [08:30 - 10:00]
 1. Flight Deck & Triage   ──▶   2. Video Room & Intake    ──▶   3. CDS, SOAP & Rx Sign-off  ──▶   4. Schedule & Availability
```

### Stage 1: The Clinical Flight Deck (`/doctor`) — 2.5 Minutes
- **Glanceable Clinician Header**:
  - Show clinician identity: **Dr. Angela Reyes, MD (Internal Medicine & Tele-Triage)**.
  - Explain the **Master Duty Switch**: One clear toggle for on-demand walk-in availability vs appointment-only focus.
  - Highlight the **Shift Metrics Ribbon**: "Completed today (4)", "Live queue (3)", "Next appointment (11:15 AM)", "Pending payout (₱3,400.00)".
- **Triage Queue with Authentic Philippine Cases**:
  - Point to **Sofia Hernandez (7yo F)** — *Urgent On-Demand*: Pediatric URI, persistent 38.8°C fever x 2 days, barking nocturnal cough. Show the vitals pill (`Temp 38.8°C`, `HR 118`, `SpO2 98%`).
  - Click **"Review Triage"** to show the pre-acceptance safety modal containing maternal triage answers.
  - Point to **Manuel Tan (34yo M)** — *Acute Gastroenteritis*: 5 diarrhea episodes, dehydration check, and allergy warning (`Penicillin`).
  - Point to **Ramon Dela Cruz (52yo M)** — *Scheduled Routine*: T2DM & Stage 1 HTN follow-up, BP 142/88, maintenance refill.

### Stage 2: The Virtual Consultation Room (`/consultation/room/demo`) — 3 Minutes
- Click **"Return to room"** on the Maria Santos active encounter.
- **Split-Screen Ergonomics**:
  - Emphasize that the patient video feed is kept on the left while the **patient intake & medical history drawer** is permanently docked on the right.
  - Explain the clinical intent: *The doctor maintains natural eye contact with the patient while cross-referencing past medications and chief complaints without tab switching.*
- **Encounter Controls**: Show the consultation timer, mic/camera mute toggles, in-call chat, and emergency exit.

### Stage 3: Post-Consultation CDS & SOAP Documentation (`/doctor/post-consultation/id?consultationId=demo&bookingId=demo`) — 3 Minutes
- **Assessment-First Flow**:
  - Explain that clinical safety requires finalizing the **Assessment & Diagnosis** first before prescriptions or medical certificates can be unlocked.
  - Show the auto-matched diagnostic card: **Acute upper respiratory infection, unspecified (ICD-10 J06.9)**.
- **Side-by-Side Dual Rail**:
  - Left rail: Complete patient intake record (symptoms, vitals, subjective answers).
  - Right stage: Live SOAP note editor with rich formatting.
- **Clinical Deliverables Deck**:
  - **E-Prescription**: Amoxicillin/Clavulanate, Cetirizine, Paracetamol with frequency, duration, and instructions.
  - **Medical Certificate**: Diagnosis, fit-to-work recommendations, rest days, and clinician digital signature stamp.
  - **Diagnostic Orders**: CBC with platelet count, Chest X-ray PA view.

### Stage 4: Practice & Availability Management (`/doctor/schedule`) — 1.5 Minutes
- Show the interactive month calendar.
- Demonstrate adding new recurring teleconsult blocks, configuring 15-minute consultation buffers, and reviewing occupied patient slots.

---

## 📝 4. Doctor Assessment & Feedback Rubric

Hand this rubric (or copy into a Google Form / Notion page) to each reviewing physician:

### Clinician Reviewer Profile
- **Reviewer Name**: ___________________________
- **Specialty**: [ ] Internal Med  [ ] Pediatrics  [ ] Family Med  [ ] General Practice  [ ] Other: _______
- **Primary Telemedicine Device**: [ ] Hospital PC (1080p/1440p)  [ ] Personal Laptop  [ ] iPad / Tablet

---

### Evaluation Criteria (Score 1 to 5)
*(1 = Strongly Disagree / Unusable · 3 = Neutral · 5 = Excellent / Highly Intuitive)*

#### Pillar 1: Information Architecture & Triage Speed
| Question | Score (1–5) | Clinical Notes & Suggestions |
| :--- | :---: | :--- |
| **1.1 Glanceability**: Can you identify urgent red-flag cases in the queue within 2 seconds? | [ ] | |
| **1.2 Visual Density**: Is the screen density comfortable for long shifts (not too cramped, not too empty)? | [ ] | |
| **1.3 Vitals Presentation**: Are patient vitals (BP, Temp, HR, SpO2) and chief complaint prominent enough? | [ ] | |

#### Pillar 2: Documentation Burden & Clicks-to-Complete
| Question | Score (1–5) | Clinical Notes & Suggestions |
| :--- | :---: | :--- |
| **2.1 Dual-Rail Layout**: Does keeping the patient intake visible on the left rail while editing SOAP on the right reduce cognitive fatigue? | [ ] | |
| **2.2 Assessment-First Flow**: Does finalizing the ICD-10 diagnosis before generating the Rx make clinical sense for your workflow? | [ ] | |
| **2.3 Documentation Speed**: Could you realistically complete a routine SOAP note and e-prescription in under 2 minutes using this UI? | [ ] | |

#### Pillar 3: Clinical Safety & Error Prevention
| Question | Score (1–5) | Clinical Notes & Suggestions |
| :--- | :---: | :--- |
| **3.1 Allergy Visibility**: Are known drug allergies (e.g., Penicillin) prominent enough before prescribing? | [ ] | |
| **3.2 Encounter Confirmation**: Are actions like "Accept Patient", "End Call", or "Sign Certificate" safe against accidental clicks? | [ ] | |

#### Pillar 4: Philippine Regulatory & Clinic Workflow Fit
| Question | Score (1–5) | Clinical Notes & Suggestions |
| :--- | :---: | :--- |
| **4.1 Prescription Completeness**: Does the e-prescription format satisfy Philippine regulatory standards (PRC license, PTR, S2 for regulated drugs)? | [ ] | |
| **4.2 Medical Certificate**: Does the fit-to-work / med-cert template meet standard employer/school requirements? | [ ] | |
| **4.3 Financial Transparency**: Are consultation fees and payout summaries clear and trustworthy? | [ ] | |

---

### Open Qualitative Discussion Prompts

1. *"What is the single most annoying thing in your current clinic software or EMR that you wish BayanHealth solved?"*
2. *"Which clinical templates or shortcuts would save you the most time (e.g., favorite Rx combos, custom ICD-10 tags, one-click lab packages)?"*
3. *"If you had to start using this tomorrow for 10 teleconsultations, what is the #1 feature or tweak you would need before your first patient?"*
