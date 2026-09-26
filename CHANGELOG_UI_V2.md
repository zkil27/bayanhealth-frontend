# BayanHealth UI/UX Changelog (V2)

All design, layout, styling, and UX modifications made in this fork must be logged here.  
This document serves as the active single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository, superseding the original [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

> **Note**: For historical entries prior to 2026-09-26, refer to the archived [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

---

## Log Entries

### [2026-09-26] Doctor Shell & Dashboard: Decommission Physician UI Demo Mode & Restore Live Operational States

- **Target Route / Surface**:
  - `/doctor` (Doctor Operational Flight Deck & Triage Hub)
  - Doctor Homepage Shell Layout (`src/app/doctor/(homepage)/layout.tsx`)
- **Files Modified**:
  - `src/app/doctor/(homepage)/layout.tsx` [MODIFIED]
  - `src/components/layout/ClinicianDemoBar.tsx` [DELETED]
  - `src/features/doctor/components/homepage/DoctorCommandBar.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/ActiveEncounterCommandCenter.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx` [MODIFIED]
  - `src/features/doctor/components/homepage/DoctorRecentConsultations.tsx` [MODIFIED]
- **Design Intent**:
  - **Decommissioned Demo Navigation Bar**: Removed the sticky `ClinicianDemoBar` ("Physician UI Demo Mode" live preview banner with shortcut buttons) from the doctor layout now that the clinical evaluation demo is concluded.
  - **Restored True Operational States**:
    - `DoctorCommandBar`: Reverted hardcoded demo physician identity and demo shift metrics so the cockpit displays the authentic logged-in clinician profile, real shift metrics, and live duty switch state.
    - `ActiveEncounterCommandCenter`: Reverted forced active encounter fixture so the card displays its intended idle state ("No consultation currently in room") when no encounter is in progress.
    - `DoctorPatientQueue`: Removed forced injection of demo cases so the triage table reflects actual pool requests and appointments, showing the clean standby panel when the queue is clear.
    - `DoctorRecentConsultations`: Removed forced injection of demo items so the consultation history truthfully reflects settled records.
- **Device Optimization**:
  - Desktop-first density: Reclaims 52px of vertical viewport real estate on `/doctor` previously occupied by the demonstration banner, giving clinicians immediate visual priority to patient triage and agenda rows.
- **Tokens & Primitives Used**:
  - Preserved semantic tokens (`--surface-card`, `--border-subtle`, `--text-heading`, `--text-muted`, `--status-available-fg`).
- **Upstream Porting Notes**:
  - Remove `ClinicianDemoBar` from layout and ensure doctor homepage components read authentic state.

---

### [2026-09-26] Tooling & Governance: Impeccable Skill Integration & V2 UI Changelog Initialization

- **Target Route / Surface**:
  - Global Agent Tooling & UI Governance (`AGENTS.md`, `.agents/skills/impeccable`, `CHANGELOG_UI_V2.md`)
- **Files Modified**:
  - `CHANGELOG_UI_V2.md` [CREATED]
  - `AGENTS.md` [MODIFIED]
  - `UI_UX_AGENT.md` [MODIFIED]
  - `UI_HANDOFF.md` [MODIFIED]
  - `README.md` [MODIFIED]
  - `.agents/skills/impeccable/*` [INSTALLED]
  - `skills-lock.json` [CREATED]
- **Design Intent & Problem Solved**:
  - **Initialized CHANGELOG_UI V2**: Created `CHANGELOG_UI_V2.md` to serve as the active logging destination for all forthcoming UI/UX iterations, modernizations, and responsive bugfixes.
  - **Integrated Impeccable Design Skill**: Installed `pbakaus/impeccable` into the project repository to equip agents with 23+ UI craft commands (audit, polish, adapt, clarify, colorize, etc.) and anti-pattern detection rules against AI slop.
- **Upstream Porting Notes**:
  - Upstream synchronization agent should now monitor `CHANGELOG_UI_V2.md` for all new UI additions and component updates.
