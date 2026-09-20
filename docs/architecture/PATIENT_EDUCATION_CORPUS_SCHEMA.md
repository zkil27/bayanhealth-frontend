# Patient Education Corpus — Handover Schema (V1)

**Status:** Requested from the CEO (clinical author and approver of record)
**Decision:** [ADR-20260804-01](./DECISIONS.md)
**Format:** one CSV file, UTF-8, one row per condition
**Purpose:** this is the knowledge base the system reads *after* a physician confirms a diagnosis, to produce patient-facing education. It is looked up by exact ICD-10 code.

---

## Why the format is strict

The system retrieves this content by exact ICD-10 code rather than by guessing a close match. That is deliberate: for clinical content, returning an approximate neighbour is worse than returning nothing. The practical consequence is that a missing or malformed code means that condition silently has no patient education.

Two rules the system enforces and cannot be configured around:

1. **Both languages are required.** A row is only usable once English and Filipino are both filled in and reviewed. Rows with one language are stored but never shown to a patient.
2. **Every row needs a source.** Content without a citation is dropped rather than displayed uncited.

---

## Column schema

| # | Column | Required | Format / limit | Notes |
|---|---|---|---|---|
| 1 | `condition_name_en` | **Yes** | text, ≤ 200 chars | Clinical name in English, e.g. `Acute upper respiratory tract infection`. |
| 2 | `condition_name_fil` | **Yes** | text, ≤ 200 chars | Common Filipino/Taglish name a patient would recognise, e.g. `Sipon at ubo`. |
| 3 | `icd10_code` | **Yes** | ICD-10, e.g. `J06.9` | Exact code including the decimal. One primary code per row. This is the lookup key. |
| 4 | `icd10_code_alt` | No | semicolon-separated | Additional codes mapping to this same content, e.g. `J00;J06.0`. |
| 5 | `explanation_en` | **Yes** | text, ≤ 1500 chars | Plain-language "what this condition is", written for a patient, not a clinician. |
| 6 | `explanation_fil` | **Yes** | text, ≤ 1500 chars | Same meaning in Filipino. A natural translation, not word-for-word. |
| 7 | `what_to_expect_en` | **Yes** | text, ≤ 1000 chars | Typical course and duration, e.g. how many days symptoms usually last. |
| 8 | `what_to_expect_fil` | **Yes** | text, ≤ 1000 chars | |
| 9 | `self_care_en` | **Yes** | text, ≤ 1500 chars | Home care and non-prescription advice. **Generic drug names only** (RA 9502) — `paracetamol`, never `Biogesic`. |
| 10 | `self_care_fil` | **Yes** | text, ≤ 1500 chars | |
| 11 | `red_flags_en` | **Yes** | text, ≤ 1000 chars | **Most important column.** When the patient must seek urgent or face-to-face care, as concrete observable triggers. |
| 12 | `red_flags_fil` | **Yes** | text, ≤ 1000 chars | |
| 13 | `followup_en` | No | text, ≤ 500 chars | When to follow up if not improving. |
| 14 | `followup_fil` | No | text, ≤ 500 chars | |
| 15 | `source` | **Yes** | text, ≤ 300 chars | Guideline this content is based on, with section where possible, e.g. `DOH URTI Guideline 2022, §4.2`. |
| 16 | `reviewed_by` | **Yes** | text, ≤ 120 chars | Name and role of the approving physician. |
| 17 | `review_date` | **Yes** | `YYYY-MM-DD` | Date this row was clinically reviewed. |
| 18 | `notes` | No | text, ≤ 500 chars | Internal remarks. Never shown to patients. |

---

## Rules for content

- **No patient information of any kind.** No names, ages, dates of birth, contact details, addresses, or anything drawn from a real chart. Ingest scans every field and rejects rows containing them. This is general disease education only.
- **Generic drug names only.** Brand names are rejected downstream: `paracetamol` not `Biogesic`, `ibuprofen` not `Advil`.
- **No individualised dosing.** Weight- or age-based dosing belongs in the prescription flow the physician controls. General guidance such as "take with food" is fine.
- **Write red flags as observable triggers.** `Difficulty breathing, chest pain, or fever above 39°C for more than two days` works. `Signs of clinical deterioration` does not, because a patient cannot act on it.
- **Write for a patient with no medical training.** Roughly grade-6 reading level, in both languages.

---

## Coverage suggestion for V1

A smaller complete corpus beats a larger half-filled one, because incomplete rows are unusable. The highest-value starting set is the conditions the existing 40 synthetic test cases already cover: upper respiratory infection, pharyngitis, allergic rhinitis, bronchitis, asthma, COVID-like illness, acute gastroenteritis, GERD, dyspepsia, tension headache, migraine, dizziness/vertigo, urinary tract infection, dysmenorrhoea, conjunctivitis, skin abscess or boil, low back pain, minor musculoskeletal injury, hypertension follow-up, and type 2 diabetes follow-up.

Twenty complete bilingual rows are immediately integrable. Two hundred rows with missing Filipino columns are not.

---

## Delivery format

CSV is preferred. If the content already exists as a document, that is fine — it will be converted once, by hand, into this schema. What matters is that every required column has a value, because a missing required field means the row cannot be approved and therefore never reaches a patient.

---

## Filipino content revision (V2, 2026-08-06)

The six-section Filipino content in the v2 artifacts comes from `BayanHealth_Patient_Education_Corpus_V2_Corpus_Only_Linked.docx`, a Filipino-only rewrite of the same 24 conditions. It replaces `explanation_fil`, `what_to_expect_fil`, `self_care_fil`, `red_flags_fil`, and `followup_fil`; `condition_name_fil` is unchanged. **V2 also supplies shorter, register-simplified Filipino condition titles for 5 of the 24 conditions — PE-005, PE-007, PE-012, PE-015, and PE-023 — and those retitles were deliberately not adopted.** `condition_name_fil` is held at its V1 value on every row, so the condition name a patient sees is unchanged by this revision even where the V2 source document names it differently. English clinical text is frozen at its V1-approved wording, so the bilingual pair is now accepted as **approximate rather than parallel** — the two languages carry the same clinical meaning at different registers, and the Filipino side is deliberately plainer. V2 carries the same clinical sign-off as V1 (Marco Paolo Perpetua, General Physician, 2026-08-06), so no new review date applies and no row's `review_date` advances. The column set, the character limits, and the ingest rules are unchanged. Red-flag bullets in the source document are joined into a single `red_flags_fil` sentence following the V1 formatting convention.

### Recorded follow-ups (stale v1 hints, not fixed here)

Three stale-hint findings surfaced while reviewing the v2 merge. None of the two TypeScript files below is edited by this documentation task; all three are comment or hint text belonging to the ingest decision, not to the artifact merge itself.

- `backend/src/tools/cds-demo-readiness.ts` line 207 — the remediation hint hardcodes `../architecture/patient_education_corpus_v1.csv --corpus-version v1`, which is stale once the v2 artifacts land: an operator who pastes it verbatim after the corpus merge would re-ingest v1 over v2 and silently revert the corrected Filipino on all 24 articles. This finding is not fixed by this task. It is picked up later in this same change set, once the Splice work opens `backend/src/lib/cds/` — see the task that updates the two stale tokens to their v2 equivalents — so it should not be read as deferred indefinitely.
- `backend/scripts/ingest-patient-education-corpus.ts` line 6 — the module docstring's example invocation cites the v1 CSV path. Recorded as follow-up, not fixed here.
- `backend/scripts/ingest-patient-education-corpus.ts` line 37 — the usage example cites `--corpus-version v1`. Recorded as follow-up, not fixed here.

The ingest script's own docstring and usage example (lines 6 and 37) stay deferred beyond this feature: the script is unmodified by design, so "the script is unmodified" remains a cheap, verifiable claim.

### Medication content guard — scoped to model-authored text (acknowledged narrowing)

This section is the written acknowledgement required by design decision 6.7(a), and by task 11.3 of the `patient-education-corpus-v2-merge` plan. It is a hard gate: task 12.6 implements the narrowing described below, and must not start until this record exists. The narrowing itself was explicitly reviewed and acknowledged by the project's operator ("Acknowledge and proceed") before this record was written, in preference to the alternative of not narrowing the guard and finding another way.

**What is being narrowed.** `backend/src/lib/cds/protected-output-adapters.ts` runs a `PATIENT_EDUCATION_MEDICATION` content scan as part of `defaultContentValidation`. Today that scan is applied to the **whole** `patient_education` payload, corpus-derived text included. The narrowing (implemented in task 12.6, not in this task) scopes the scan to **model-authored text only** — the provider candidate's `title`, its section headings and contents, and `warningSigns` if present — and stops running it over corpus-derived text. On the template path, where every byte of the payload is reviewed corpus text, the patient-education medication scan does not run at all.

**Why this is accepted.** The guard exists to stop an unreviewed model from putting dosing information into patient-facing content. Corpus text is not that risk: it is clinician-reviewed and signed off (Marco Paolo Perpetua, General Physician, 2026-08-06), and it already cleared the corpus validator's own `BRANDS`, `DOSE_PATTERNS`, and `POSSIBLE_DOSING` rules during the build in tasks 2.1 and 7.2 (`rows=24 blockers=0`). Running the same class of check a second time, over text that has already been reviewed by a clinician and passed a dedicated validator, adds no safety value and instead produces false positives — task 11.2 found the literal noun "prescription" (not "prescribed" or "Prescribing") in J06.9's `self_care_en` and `self_care_fil` and in I10's `self_care_fil`, none of which is a dosing instruction. Left unscoped, those false positives throw `ProtectedOutputContentError`, which is in `shouldRejectWithoutFallback`, so the request fails with no fallback — for J06.9, the demo condition, that makes Requirement 7 unsatisfiable for the 2026-08-07 demo.

**Rejected alternative (b): edit the corpus text instead.** Refused. `self_care_en` is frozen by Requirement 2.1 and cannot be reworded to dodge a regex. Rewording `self_care_fil` would break byte-fidelity to the V2 card (Requirement 1.2, Property 3), which exists specifically to guarantee the transcribed Filipino matches the reviewed source document byte for byte. Editing approved clinical text to appease a pattern match is the wrong direction of causation — the guard exists to protect the review, not to dictate its wording.

**Rejected alternative (c): a global allowlist for the word "prescription".** Refused. That would weaken the rule for model output too, which is the only place the rule was ever meant to bite. An allowlist keyed on a word rather than on provenance cannot distinguish a clinician-approved sentence from a hallucinated one that happens to reuse the same noun.

**What stays unchanged.** The narrowing is bounded to the `PATIENT_EDUCATION_MEDICATION` scan only. The following keep running exactly as they do today, over the whole payload, regardless of origin:
- The output-size bound
- `assertNoPii`, run over the whole serialized payload (verified clean on all 24 shipped articles per task 13.6)
- The prescription brand-name rule
- Any injected `validateContent` callback

**Status.** This acknowledgement exists as of this record. Task 12.6 may proceed.

## From artifact to screen (V2 scope expansion, 2026-08-XX)

**From artifact to screen.** The v2 artifacts change nothing a patient can read until `backend/scripts/ingest-patient-education-corpus.ts` writes them into `app_core`. Retrieval is `findPatientEducationForDiagnosis`, which reads `app_core` only; no runtime code reads a corpus CSV, so a committed CSV is a file until it is ingested (6.8).

**Alias stability is the payoff of declining the V2 retitles.** `aliasKeysFor` derives its keys from `icd10_code`, `condition_name_en`, and `condition_name_fil`, and all three are frozen. Holding `condition_name_fil` at its V1 value therefore makes a v2 ingest a same-key overwrite of the same 24 article keys and the same 71 alias keys, with no orphaned alias left resolving to stale content (6.9).

**Before the Splice, the reviewed Filipino reached a patient only through the deterministic template** — that is, only on provider failure, provider timeout, or a tripped gate. Approved wording surviving only on the failure path is an inversion, and the Splice removes the dependency by composing model-authored English with corpus-supplied Filipino on the success path (6.10).

**The contract already permitted the bilingual payload.** `contracts/openapi.yaml` defines `CdsPatientEducationPayload.language` as `[english, taglish, bilingual]` with `titleFilipino`, `icd10Code`, `citation`, and `corpusVersion`, and `CdsPatientEducationSection.language` as `[english, filipino]`. The output validator was narrower than the contract it serves, so the fix widens the validator and leaves the contract and its generated types untouched (6.11).

## Released education is immutable under corpus re-ingest

**Released education is immutable under corpus re-ingest.** A released patient-education artifact serves the payload stored on the artifact item at release time, not a fresh read of the corpus. Re-ingesting the corpus — v1 to v2 or otherwise — therefore changes nothing a patient has already received. Artifacts released before a corpus revision keep the wording that was released, by design: retroactively editing published clinical guidance is not a content update, it is a rewrite of the record. Newly generated education uses the current corpus.

No re-release path, no backfill path, and no artifact-rewrite path is introduced by this feature.

## Definition of done (patient-education-corpus-v2-merge)

Recorded by task 18.2. This section states the four parts of this feature's definition of done in one place, using the evidence already gathered in tasks 1-18; it fabricates nothing and closes nothing that has not actually run.

**Corpus** (verified in tasks 1-10): `rows=24 blockers=0 warnings=50`, decomposing as 24 `NO_PH_SOURCE` + 26 `LONG_SENTENCES`; an empty report diff against the pre-modification baseline pinned at commit `769a406f3eb10f8f5d8363e37758716af74272c5`; `verify` and `freeze` both exiting 0, with 312 cells compared and 0 differences; every replaced value at or below its `CHAR_LIMITS` bound; and a byte-identical extended JSON between v1 and v2.

**Splice** (verified in tasks 11-15): `npm run typecheck`, `npm run lint`, and `npm test` all green (85 test files, 1059 tests, 0 failures as of the last full run); Properties 17 through 23 and 26 passing, with 100+ generated cases each where generated; the corpus-backed deterministic template accepted by the validator; all 24 shipped articles passing `assertNoPii` and the scoped content guard; and the change set matching task 18.1's review.

**Register:** NOT YET DONE. Tasks 19-21 have not run. This part is **PENDING** and is closed by task 21.1, once the two displayed strings in `PatientEducationCard.tsx` read `Taglish`, the matching test assertions pass, Properties 28 through 32 pass, the frontend gate is green, the Schema_Document register section (this file) is written, and `git diff architecture/DECISIONS.md` shows exactly the two permitted edits. None of that has happened yet as of this record.

**Ingest** (task 16, fully complete, including the write pass, which was authorized and executed): a recorded `--dry-run` showing `articles=24 aliases=71 rejected=0` (task 16.2); a point-of-action authorization confirmed by the user for this exact operation (corpus ingest write pass), target (`bayanhealth-dev-app-core`), environment (`dev`), and window (task 16.3); the write pass executed under that authorization with `articles=24 aliases=71 rejected=0`, exit 0, and confirmed real writes (task 16.4); and the full 16.5 read-back verification — the J06.9/I10 keyed article read matching field-by-field against v2 Filipino and v1 English/`condition_name_fil`, all 71 alias `Get`s found with the correct `icd10Code` targets, and the filtered `Scan` confirming exactly 71 alias items with zero orphans. This is real `dev` runtime evidence, not a `DEFER`.

**Promotion boundary.** A `dev` ingest plus a green local suite is `dev` evidence. It is not staging qualification, not canary authorization or observation, and not production enablement or GA. Three of the four parts above are dev-scoped repository or dev-environment evidence; the fourth (Register) has not run yet and is tracked separately through task 21.1.

## Two registers, and the second one is Taglish

**Two registers, and the second one is Taglish.** This corpus carries exactly **two** registers, not three. There is no Tagalog register and no separate Taglish register, because the second register **is** Taglish.

**The `*_fil` columns hold code-switched Filipino carrying English clinical terms, deliberately.** That is what a Filipino patient actually reads, and it is what the approving physician signed off. The content states it plainly: red-flag bullets read `May chest pain`; self-care reads `Sundin lang ang medicines na nasa plano o reseta ni Doc`; cards head a section `Trabaho at safety`; and `medicines`, `fluids`, `check-up`, `ER`, and `prescription` appear throughout the Filipino side. The register was already code-switched before the V2 revision — v1 wrote `Sundin lang ang medicines na nasa doctor-approved Plan o prescription` — so naming it Taglish is not a consequence of V2 (10.2).

**This is a naming correction over content that already exists, not a request for new content.** No column, field, or clinical string is added. This document has asked for a "Common Filipino/Taglish name" in `condition_name_fil` since the first ingest, so the ambiguity predates the V2 revision and the correction applies equally to v1 (10.3).

**The `taglish` value in the payload enum is a different thing.** `CdsPatientEducationPayload.language` admits `taglish`, and that member denotes **model-generated output with no corpus backing** — what the generation path may publish for a diagnosis that has no approved article. It is not reviewed retrievable content, it carries no citation, and it is never what a `*_fil` column holds (10.4).

**A third stored register would require a contract change, which is out of scope.** `CdsPatientEducationSection.language` is the only place a *stored* register is tagged, and its enum is exactly `[english, filipino]` with `additionalProperties: false`. A third register cannot be represented without adding an enum member to `contracts/openapi.yaml` and regenerating types, which the accepted specification forbids — on top of 120 new clinical strings, a fresh physician sign-off, an amendment to ADR-20260804-01's bilingual approval condition, `BilingualText` becoming a triple, six new CSV columns, and a three-way frontend toggle (10.5).

**Three `taglish` occurrences in the codebase are unrelated to this corpus.** `validLang = ['english', 'taglish']` in `backend/src/handlers/cds.ts` validates a request field on the retired patient-cards path. `patientEducation.taglish[]` in `backend/src/lib/cds/solver-content.ts`, documented in `architecture/AI_INFERENCE.md`, holds 25 Taglish strings across 5 solver entries — keyed by **solver id**, not by ICD-10, with no reviewer, no review date, and no citation, reachable only from the retired `handlePatientCards` (ADR-20260806-03). Neither is corpus-backed, neither is reachable from `findPatientEducationForDiagnosis`, and neither may be promoted into approved content, because ADR-20260804-01 makes citation mandatory and review status a visibility gate (10.6).

**`language: 'bilingual'` denotes exactly these two registers** — the **English register** in the `*_en` columns, tagged `english`, and the **Taglish register** in the `*_fil` columns, tagged `filipino`. A `bilingual` payload carries four `english` sections, four `filipino` sections, `titleFilipino`, and `warningSigns` as `[English red flag, Taglish red flag]`. The word `bilingual` is unchanged and still accurate: two registers is two, whatever the second is called (10.14).

**The stored identifier stays `filipino`; only the displayed label changes.** The section tag value, the six `*_fil` column names, `BilingualText.filipino`, and the ingest script's required-column list all keep the name `filipino`, because renaming them means a contract change and a partial rename fails silently rather than loudly. What a patient sees on the reading-language toggle is `Taglish`. If you are reading code and wondering why the two disagree, that is the reason, and it is recorded in ADR-20260824-01.

**Follow-up (10.15, not fixed here):** `groundingPassagesFor` in `backend/src/lib/cds/patient-education.ts` labels its Filipino grounding passages `(FIL):`. That label is model-facing (it appears in a prompt-construction context, not in anything a patient sees) rather than patient-facing, and the file is frozen by Requirement 2.7 in this feature, so it is recorded here as a follow-up rather than changed.
