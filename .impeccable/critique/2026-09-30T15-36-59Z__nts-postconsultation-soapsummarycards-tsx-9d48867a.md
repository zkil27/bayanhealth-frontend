---
target: Subjective/Objective strip (SoapSummaryCards)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\dev\\youi\\bayanhealth-frontend\\src\\features\\consultation\\components\\postConsultation\\SoapSummaryCards.tsx"
target_fingerprint: "sha256:cd2b21243779b25bfbd3744cb8a4e037a54899152d2b4c4b755f4984104b2dc2"
target_path: "C:\\dev\\youi\\bayanhealth-frontend\\src\\features\\consultation\\components\\postConsultation\\SoapSummaryCards.tsx"
timestamp: 2026-09-30T15-36-59Z
slug: nts-postconsultation-soapsummarycards-tsx-9d48867a
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 3/4 | Confirms intake vitals, but clinical normality vs. abnormality (e.g. fever 38.2°C) is visually indistinguishable from normal readings. |
| 2 | Match System / Real World | 3/4 | Respects the classic clinical SOAP taxonomy, standard vital units (°C, mmHg, bpm, SpO₂), and patient verbatim voice. |
| 3 | User Control and Freedom | 2/4 | Narrative chief complaint is truncated with single-line `truncate` with no expand/collapse, popover, or drill-down affordance. |
| 4 | Consistency and Standards | 2/4 | Dual-source dissonance: presenting symptoms are split between the top strip and the right-rail Intake panel, creating conflicting signals (e.g., "mild dyspnea" vs "Shortness of breath: No"). |
| 5 | Error Prevention | 2/4 | Severe clinical risk from hidden narrative symptoms; lack of physiological abnormality styling risks missed contraindications during medication dosing. |
| 6 | Recognition Rather Than Recall | 2/4 | The S/O strip scrolls off-screen when the clinician navigates down to review and sign prescriptions, certificates, and labs. |
| 7 | Flexibility and Efficiency | 3/4 | Compact 44px ribbon preserves vertical space, but lacks keyboard accelerators, pinning, or quick-copy affordances. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Crisp anti-slop styling and clean 1px borders, but unbalanced 50/50 spatial distribution starves narrative text while leaving dead space on the right. |
| 9 | Error Recovery | 3/4 | Detects out-of-bounds readings with `(Unverified)`, but provides no clinical override or correction pathway for physicians. |
| 10 | Help and Documentation | 3/4 | SOAP structure is universally understood; however, the native browser `title` tooltip is inaccessible and omits patient verbatim. |
| **Total** | | **26/40** | **Acceptable** (Clinically sound foundation, but critical legibility and safety defects require remediation) |

### Design Specificity Verdict

**LLM assessment**: 
The Subjective/Objective strip (`SoapSummaryCards.tsx`) demonstrates commendable visual discipline. It avoids AI-slop clichés (no neon glows, no gradient strokes, no platform emojis) and adheres tightly to BayanHealth's brand tokens (`--surface-brand-soft`, `--navy-700`, `--teal-700`, `--border-subtle`). 

However, its visual treatment borrows too heavily from generic SaaS issue trackers (treating vital signs like GitHub issue tags or repository badges). In a high-velocity clinical cockpit, physiological vitals are diagnostic telemetry: they require tabular figures, explicit abnormal severity indicators (e.g. pyrexia/fever highlighted in amber), and generous horizontal breathing room for the patient's narrative complaint.

**Deterministic scan**:
Automated AST scan via `.agents/skills/impeccable/scripts/impeccable detect` returned **0 violations** (`[]`) for both `SoapSummaryCards.tsx` and `AssessmentFirstWorkspace.tsx`. The code uses 100% semantic CSS variables with zero hardcoded hex codes. 

However, deterministic AST parsing cannot catch runtime WCAG failures or clinical UX flaws:
1. **WCAG Contrast Failure**: `--status-soon-fg` (`#c8971c`) on `--status-soon-bg` (`#fdf4dc`) for flagged vitals achieves only **2.43:1** contrast ratio (failing WCAG AA 4.5:1 minimum).
2. **Micro-Typography**: Flagged labels render at `text-[10px]` and vital labels at `text-[11px]`, falling below desktop accessibility standards at standard 24–28" viewing distances.
3. **Truncation Hazard**: Appending `patientVerbatim` inside a `truncate` paragraph guarantees it is 100% hidden in real-world layouts.

**Visual overlays**: 
CLI and code inspection verified. No browser overlay injected (headless verification).

### Overall Impression
The S/O strip correctly honors the universal SOAP mental model and successfully conserves vertical space in a compact 44px ribbon. However, it is currently **too small and passive for rapid clinical skimming**: at desktop viewing distances, 11px/12px text requires leaning in, `truncate` conceals vital clinical symptoms, and abnormal vitals like **38.2°C** blend seamlessly into the background.

### What's Working
1. **Clinical SOAP Grounding**: Positioning Subjective and Objective directly above Assessment honors medical training—input context sits directly above clinical decision-making.
2. **Anti-Slop Craftsmanship**: Crisp 1px solid borders, muted surfaces (`--surface-warm-soft`), authoritative navy typography (`--text-heading`), and clean Lucide SVG icons maintain clinical credibility.
3. **Plausibility Guardrails**: Physiological sanity bounds (`VITAL_BOUNDS`) catch gross sensor or data-entry errors before doctors accept them as ground truth.

### Priority Issues

#### [P1] Silent Narrative Truncation & Hidden Patient Verbatim
- **Why it matters**: Clinical safety hazard. Applying `truncate` to `chiefComplaint` while appending `patientVerbatim` inside the same `<p>` container hides patient-reported details behind an ellipsis. In teleconsultation, missing a qualifying complaint (e.g., "...with chest pain on exertion") can lead to diagnostic error.
- **Fix**: Replace `truncate` with `line-clamp-2` or an auto-expanding disclosure with an accessible tooltip/popover. Separate `patientVerbatim` onto its own styled quote row.
- **Suggested command**: `$impeccable layout`

#### [P1] Absence of Clinical Abnormality Thresholds
- **Why it matters**: The component only flags readings outside extreme biological bounds (`<35 || >41°C` as "Unverified"). A patient presenting with an active fever of **38.2°C** is rendered in identical calm styling to a normal 36.8°C reading. Clinicians scanning before prescribing antipyretics or bronchodilators need abnormal telemetry to visually pop.
- **Fix**: Implement clinical threshold styling: highlight abnormal vitals (Temp ≥ 38.0°C in amber/warm alert; SpO₂ < 95% in red alert; HR > 100 in amber) using high-contrast semantic tokens.
- **Suggested command**: `$impeccable colorize`

#### [P2] Micro-Typography & Low Arm's-Length Legibility
- **Why it matters**: Vital values at `text-xs` (12px), labels at `text-[11px]`, and flag warnings at `text-[10px]` violate ergonomic legibility on 24–27" clinical monitors viewed from 60–70 cm.
- **Fix**: Elevate vital values to `text-sm font-bold` (14px) with monospace tabular numbers (`tabular-nums`), and standardize labels to crisp micro-caps (`text-[10px] font-bold uppercase tracking-wider text-muted`).
- **Suggested command**: `$impeccable typeset`

#### [P2] Spatial Inbalance Across the 50/50 Split
- **Why it matters**: The layout divides Subjective and Objective into 50/50 flex columns. Narrative text on the left is starved and truncated, while the Objective column on the right displays four small chips and leaves over 300px of empty white space.
- **Fix**: Rebalance flex ratios to 60/40 or 65/35, or adopt an asymmetric layout that allows narrative text to breathe while grouping vitals into a compact cockpit cluster.
- **Suggested command**: `$impeccable layout`

#### [P2] Dual-Source Cognitive Dissonance (Top Strip vs. Right Rail)
- **Why it matters**: The doctor is presented with patient intake symptoms in two places: the top horizontal S/O strip and the right vertical "Patient Intake" rail. In real consultations, wording discrepancies (e.g. "mild dyspnea" vs "Shortness of breath: No") create hesitation and extra cognitive reconciliation.
- **Fix**: Harmonize the data sources or dock the vitals into a persistent, synchronized workspace header strip so the main stage remains exclusively focused on clinical documentation.
- **Suggested command**: `$impeccable distill`

### Persona Red Flags

**Dr. Ramon (High-Volume Teleconsult Physician, 20 Consults/Shift)**:
- Must rapidly cross-reference vitals while dosing Salbutamol (bronchodilator) and Paracetamol (antipyretic) in the Deliverables deck.
- *Red Flag 1*: When he scrolls down to edit and sign prescriptions, the top S/O strip scrolls completely out of view. He must scroll up and down repeatedly to verify resting heart rate and fever.
- *Red Flag 2*: At 27 inches from his monitor, the 11px/12px chips blend together. He fails to register the 38.2°C fever at a peripheral glance because it lacks an alert background.

**Dr. Eleanor (Senior Clinical Auditor & Medical Director)**:
- Reviews completed consultation records for diagnostic accuracy and clinical documentation quality.
- *Red Flag 1*: Notices that a patient's verbatim statement was completely omitted from the summary card due to CSS truncation.
- *Red Flag 2*: Flags an inverted blood pressure reading (`85/95 mmHg`) that passed the software's sanity checks because systolic and diastolic bounds are evaluated independently without checking `systolic > diastolic`.

### Minor Observations
1. The `[S]` and `[O]` letter badges have no interactive role or tooltip, yet visually mimic clickable avatars or button controls.
2. The `SummaryCard` component (lines 112–144 in `SoapSummaryCards.tsx`) is unused dead code that should be purged.
3. Sub-1024px mobile layout collapses into a column but lacks a divider between Subjective and Objective sections.

### Questions to Consider
- *What if the Subjective & Objective strip was not an inline document card that scrolls off-screen, but a persistent 36px Clinical HUD docked directly beneath the patient header?*
- *Why are vital signs styled as generic tags rather than clinical instruments with immediate abnormal range highlighting?*
- *Could clicking a vital tile open the historical trends drawer in the Patient Rail, turning static telemetry into an active diagnostic tool?*
