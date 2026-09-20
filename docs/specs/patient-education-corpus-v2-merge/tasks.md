# Implementation Plan: Patient Education Corpus V2 Merge

## Overview

Five surfaces, one gated environment mutation, two permitted governance edits.

- **Tasks 1-10 — the corpus artifact.** Python and Markdown under `architecture/`, repo-local, zero AWS.
- **Tasks 11-15 — the Splice.** TypeScript in `backend/src/lib/cds/` plus vitest/fast-check coverage, so the reviewed Filipino reaches a patient on the model path instead of only through the deterministic template. Design section 6.
- **Tasks 16-18 — the ingest and the record.** An authorization-gated `dev` corpus ingest (design section 7), the documentation the expanded scope owes, and the scope-boundary review of the corpus-plus-Splice change set.
- **Task 19 — the patient-facing register label.** Two rendered strings in `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.tsx` change from `Filipino` to `Taglish`, with the matching assertions in `PatientEducationCard.test.tsx`. Displayed text only; every `filipino` identifier stays. Design section 9.4.
- **Tasks 20-21 — the register record and the closing bound.** The two permitted `architecture/DECISIONS.md` edits (append `ADR-20260824-01`, amend ADR-20260804-01's `Status` line), the Schema_Document register section, and a final assertion that no third register entered by any route. Design sections 9.5 through 9.8.

The order inside tasks 1-10 is the design's validation order and it is load-bearing: the extraction tool and its guards come first, the pre-transcription rule scan, the correlation report, and the validation-report baseline capture all run **before any tracked file is modified**, the build script becomes checkout-relative before it is asked to emit anything, and only then does the 120-literal transcription land. Verification (`verify`, validator run, `freeze`, report diff, sandboxed mutation tests) follows the write, and documentation edits close that change set.

The order across tasks 11-18 is load-bearing for a different reason. Task 11 reproduces, failing-test-first, two live defects the design found by **executing** the shipped code, before any implementation code is written, because both change what Requirement 7 actually is. Task 16 splits the ingest into a non-mutating half and a mutating half, and everything from the write pass onward is blocked on a point-of-action authorization that may legitimately never arrive.

Tasks 19-21 run **after** task 18, and the ordering is deliberate rather than incidental. The register work is independent of the corpus artifact, the Splice, and the ingest: it depends on no build output, no validator result, and no authorization, and nothing in tasks 1-18 depends on it. Sequencing it last keeps task 18's change-set review reading a stable corpus-plus-Splice diff, and task 21.1 then closes the whole feature with the register-scope bound over the complete change set. Task 18.1's allowed list names the three register files so the review does not fail on approved work if the register tasks have already run.

Languages: Python 3 for the corpus half (standard library only — no `python-docx`, no new dependency), TypeScript for the Splice, TSX for the two register-label files, Markdown for the documentation and the two governance edits. The corpus half and the register half both perform zero AWS calls. The only environment mutation anywhere in this plan is the `dev` corpus ingest write pass in task 16, and it is gated per Requirement 8; `staging` and `prod` ingest stay out of scope.

Files this plan creates or edits:

Corpus half (`architecture/`):

- `architecture/v2_corpus_tool.py` (new — extract/apply/verify/freeze)
- `architecture/build_corpus.py` (paths, names, guard, docstring)
- `architecture/corpus_data.py` (120 Filipino literals + module docstring)
- `architecture/patient_education_corpus_v2.csv`, `architecture/patient_education_extended_v2.json`, `architecture/corpus_validation_report.md` (generated output)
- `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md` (the V2 revision section from task 8.1, plus the two scope-expansion sections from task 17)

Splice half (`backend/`):

- `backend/src/lib/cds/protected-output-adapters.ts` (headings constant, corpus-grounded prompt shape, validation context, per-origin shape validators, `spliceCorpusEducation`, `assertCorpusOwnedFieldsUnchanged`, medication-scan scoping, section-outcome counter)
- `backend/src/lib/cds/protected-generation.ts` (one import, one validation-context argument — nothing else)
- `backend/src/tools/cds-demo-readiness.ts` (two tokens in one remediation hint)
- `backend/src/lib/cds/protected-output-adapters.test.ts`, `backend/src/lib/cds/patient-education.test.ts`, `backend/src/lib/cds/released-patient-education.test.ts` (extended, not replaced)

Register half (`frontend/` and `architecture/`):

- `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.tsx` (two rendered strings, the doc comment above `type Language`, two prose doc comments — no type, identifier, option list, guard, index, `className`, ARIA attribute, or branch)
- `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.test.tsx` (two label assertions, test names and prose comments, plus the new register cases — the `bilingualArticle()` fixture values are not edited)
- `architecture/DECISIONS.md` (**exactly two edits**: one appended `ADR-20260824-01` entry, and one amended `Status` line on ADR-20260804-01 — nothing else in the file)
- `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md` also gains the register section from task 20.3, alongside the sections from tasks 8.1 and 17

Files this plan must leave untouched: `architecture/patient_education_corpus_v1.csv`, `architecture/patient_education_extended_v1.json`, `contracts/openapi.yaml` and the generated contract types, `backend/src/lib/cds/patient-education.ts`, `backend/scripts/ingest-patient-education-corpus.ts`, `backend/src/lib/cds/released-patient-education.ts`, `backend/src/lib/cds/solver-content.ts`, `backend/src/handlers/cds.ts`, everything under `infra/`, and everything under `frontend/` **except** the two `patientEducation/` register files named above — including `frontend/bayan-health-mvp/src/features/consultation/lib/api/patientEducation.ts`, whose five `filipino` occurrences are all identifiers or contract field names and which renders no register name (design 9.4).

Two entries moved off that list and the change is deliberate. `architecture/DECISIONS.md` is no longer frozen: design 9.6 and Requirement 6.3 permit exactly two edits to it and task 20 makes them, with Property 32 asserting the diff contains no third. `frontend/` is no longer wholly excluded: exactly two files are in scope, and only their displayed text and the assertions matching it.

## Tasks

- [x] 1. Build the extraction tool `architecture/v2_corpus_tool.py`

  - [x] 1.1 Create the tool skeleton, checkout-relative paths, and the paragraph walk with both guards
    - New file `architecture/v2_corpus_tool.py`, standard library only (`zipfile`, `re`, `html`, `csv`, `json`, `os`, `sys`, `argparse`)
    - `HERE = os.path.dirname(os.path.abspath(__file__))`; resolve `DOCX`, `corpus_data`, and both CSV paths from `HERE`, never from the working directory
    - `paragraphs(docx_path)`: read `word/document.xml` via `zipfile`, walk `<w:p>` blocks with `PARA_RE`, join `<w:t>` runs with the **empty string** (Word splits words across runs — a separator would corrupt the 121 multi-run paragraphs), `html.unescape`, then `strip()`
    - `ASSERT_NO_MARKUP` guard: abort if any extracted paragraph retains `<` or `>`
    - `ASSERT_ASCII` guard: abort if any extracted paragraph contains a non-ASCII character (signals the document changed since design)
    - Every abort writes nothing and exits non-zero with a named error
    - _Requirements: 1.2_

  - [x] 1.2 Implement card segmentation, the four hard correlation signals, and the reported title signal
    - Segment cards on `^PE-\d{3}$`; abort if the card count is not exactly 24
    - Assert the five metadata header labels (`Card ID`, `Legacy record`, `Legacy code`, `Corrected code candidate`, `Correction link`) appear immediately before each `PE-0NN` paragraph in documented order, then read the five following paragraphs as values
    - Cross-check the **four numeric signals** against `RECORDS[index]` as hard checks: card ordinal `NN == index + 1`, legacy record ordinal, primary portion of `Legacy code` (before ` | Alt:`) vs `icd10_code`, and `Corrected code candidate` vs `icd10_code`. Any disagreement aborts naming card id, signal, expected, and found. No closest-match fallback
    - Treat the `N. <title>` heading vs `condition_name_fil` comparison as a **reported** signal, not a hard check: `title_match: exact` when equal; `title_match: expected_v2_retitle` when the card is in `EXPECTED_TITLE_MISMATCHES` and both strings match the enumerated pair, in which case extraction continues
    - Define `EXPECTED_TITLE_MISMATCHES` over exactly PE-005, PE-007, PE-012, PE-015, and PE-023, each holding the `(v2_title, v1_condition_name_fil)` pair. A title mismatch on any unenumerated card, or on an enumerated card whose actual string pair no longer matches what is enumerated, still aborts naming card, expected, and found
    - Parse `Alt:` codes for reporting only; assert no `Alt:` code appears in any record's `icd10_code_alt`
    - _Requirements: 1.1, 1.5, 2.5_

  - [x] 1.3 Implement the Section_Mapping transcription, the placeholder line filter, and the red-flag join
    - Apply the placeholder filter **before** mapping: any paragraph containing `[[` is dropped and recorded as `dropped_placeholder`, whatever heading it sits under
    - Inline headings (`Sa madaling sabi:`, `Ano ang aasahan:`, `Babalik o magme-message kapag:`) take everything after the first `: `, stripped; block headings (`Gawin ngayon`, `Magpatingin agad ngayon; ER kung malubha o mabilis lumalala:`) take the following paragraph(s)
    - `join_red_flags(bullets)`: preserve document order with no drop/reorder/dedupe, then apply the two-set prefix partition — `STRIP_PREFIXES` covers exactly **three bullets** (`Magpatingin kung ` on PE-002 and PE-006, `Kailangan ng urgent care kung ` on PE-003, first bullet each) and is removed because the bullet's imperative duplicates the lead-in; `CARRIED_PREFIXES` covers `Mag-emergency kung ` on PE-020 and is carried **verbatim** because it names a different escalation level. Then lowercase the first character only when the first token is not all-caps, join with `, ` and `, o ` before the last, then append `.` plus the ER escalation tail
    - Abort only on an imperative-prefixed bullet in **neither** `STRIP_PREFIXES` nor `CARRIED_PREFIXES`; a `CARRIED_PREFIXES` hit is never an abort and never stripped. Also abort on a missing mapped heading (except `Babalik o magme-message kapag:`, where `followup_fil` becomes `""`), and on a mapped section that is empty after placeholder filtering
    - Record every dropped paragraph in the card's `dropped[]` list with its reason so exclusions are reviewable
    - _Requirements: 1.2, 1.4, 1.6, 3.1_

  - [x] 1.4 Write generated-input unit checks for the two pure helpers
    - **Property 1: Placeholder-bearing lines never reach a schema column** — generate strings with `[[` injected at varied positions and assert the filter excludes every one
    - **Property 8: Red-flag joining preserves every trigger** — generate non-empty comma-free, period-free bullet lists and assert each trigger appears exactly once in input order, the lead-in opens the string, `, ` / `, o ` separate items, the ER sentence closes it, and no punctuation is doubled
    - These are the only two properties with an unbounded input domain, so they are the only place generated inputs add information (at least 100 cases each). Everything else is exhaustive over the fixed 24-record population
    - **Validates: Requirements 3.1, 1.2**

  - [x] 1.5 Implement the `extract` subcommand, the correlation report, and the pre-transcription rule scan
    - `extract [--json PATH]`: print the 24-row correlation table (card id, ordinal, legacy code, corrected code, title match, per-column derived lengths against `CHAR_LIMITS`, dropped-paragraph count); `--json` defaults to a non-committed scratch path
    - Emit the extracted-card structure from the design's data model, including `red_flag_bullets` and `dropped[]`
    - Add a `--scan` rule pass that applies the validator's `BRANDS`, `DOSE_PATTERNS`, `PII_PATTERNS`, and `VAGUE_REDFLAG` sets plus a `[[` scan to the **mapped-only** derived text, reporting hits per card and column
    - Neither mode writes to any tracked file
    - _Requirements: 3.2, 5.2_

- [x] 2. Run the pre-modification scan and correlation review (no tracked file is modified in this task)

  - [x] 2.1 Run the rule scan against the mapped-only V2 text and record the result
    - `python architecture/v2_corpus_tool.py extract --scan`
    - Pass condition: zero `BRAND_NAME`, `VAGUE_RED_FLAG`, `POSSIBLE_PII`, `POSSIBLE_DOSING`, and `[[` hits across all 24 cards
    - Any hit stops here and becomes a content decision before anything is written into `corpus_data.py`. A `POSSIBLE_DOSING` hit specifically would add a warning code absent from the baseline
    - _Requirements: 3.2, 5.4, 5.5_

  - [x] 2.2 Run and review the correlation report
    - `python architecture/v2_corpus_tool.py extract`
    - Pass condition: 24 cards, the four numeric signals agreeing on every card, **every derived length at or below its `CHAR_LIMITS` bound**, and a non-zero dropped count per card covering the greeting, `Trabaho at safety`, the reply scale, and the teach-back question
    - Observed maxima are informative only (design measured `red_flags_fil` 346, `self_care_fil` 270, `what_to_expect_fil` 261, `explanation_fil` 260, `followup_fil` 219). A small delta from a join detail is not a failure; only exceeding a `CHAR_LIMITS` bound is
    - Title-match expectation: `exact` on 19 rows and `expected_v2_retitle` on PE-005, PE-007, PE-012, PE-015, and PE-023. Any other value means the run aborted
    - _Requirements: 1.1, 1.4, 1.5, 5.2_

  - [x] 2.3 Capture the validation-report baseline before any tracked file is modified
    - Run this **before** task 4's `apply`, while the checkout is still clean:
      - `BASELINE_COMMIT=$(git rev-parse HEAD)`
      - `git show "$BASELINE_COMMIT:architecture/corpus_validation_report.md" > /tmp/corpus_report_baseline.md`
      - `echo "$BASELINE_COMMIT" > /tmp/corpus_report_baseline.commit`
    - Record the pinned `$BASELINE_COMMIT` hash in the task evidence so the later comparison stays reproducible after further commits land
    - `/tmp/` is outside the checkout, so the capture is never itself a tracked file; this task writes nothing inside the repository
    - _Requirements: 5.6, 5.7_

- [x] 3. Make `architecture/build_corpus.py` version-aware and checkout-relative

  - [x] 3.1 Replace the hardcoded sandbox output path with script-directory resolution and a frozen-artifact guard
    - Add `HERE = os.path.dirname(os.path.abspath(__file__))` and `sys.path.insert(0, HERE)` so `from corpus_data import ...` resolves from any working directory
    - Set `OUT = HERE`, replacing `OUT = "/mnt/user-data/outputs"`; keep `os.makedirs(OUT, exist_ok=True)`
    - Add `CORPUS_VERSION = "v2"` as a module constant (deliberately not a CLI flag — a flag invites `--corpus-version v1`, which would overwrite a shipped artifact) and derive `CSV_NAME` / `EXT_NAME` from it; the report filename stays unversioned
    - Add the `FROZEN_ARTIFACTS` guard that exits with `refusing to overwrite a shipped v1 artifact` if either derived name matches a v1 artifact
    - Keep the printed `rows=`, `blockers=`, `warnings=` summary on stdout
    - Change nothing else: no validation rule, threshold, brand list, PII pattern, or severity moves. The docstring is updated later in task 8.3
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 4. Apply the 120-literal transcription to `architecture/corpus_data.py`

  - [x] 4.1 Implement `apply` mode with its write-refusal preconditions
    - Anchor each record block by its own `"icd10_code": "<code>",` line so a block is never confused with its neighbour
    - For each of the five target columns, locate the single line matching `^"<column>": ".*",$` within the block and replace it with `"<column>": <json.dumps(value)>,` — one line in, one line out, preserving the file's one-literal-per-line style so `git diff` shows exactly 120 changed lines
    - Refuse to write unless all 120 target lines matched exactly once; zero or two matches aborts naming the record code and column
    - Assert the literal-safety preconditions per value (no `"`, no backslash, no newline, ASCII) and abort before writing on failure
    - `_ext` blocks are never matched, because the five target column names do not occur inside them
    - Guarantee idempotence: re-running against an already-transcribed file rewrites identical bytes
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 3.1_

  - [x] 4.2 Run `apply` and review the resulting diff
    - `python architecture/v2_corpus_tool.py apply`
    - Confirm `git diff --stat architecture/corpus_data.py` shows exactly 120 changed lines and that `condition_name_fil`, the six English columns, the six provenance columns, `_ext`, `CORE_COLUMNS`, `REQUIRED_COLUMNS`, `CHAR_LIMITS`, `EXT_CONSTANTS`, `PENDING_REVIEWER`, and `PENDING_DATE` are absent from the diff
    - Re-run once to confirm idempotence (second run produces no diff)
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.4_

- [x] 5. Verify the transcription byte-for-byte against the docx

  - [x] 5.1 Implement `verify` mode
    - Re-derive all 120 expected strings from the docx (never from a previously written JSON) and byte-compare against `RECORDS`, re-asserting the same correlation split on the way — the four numeric signals as hard checks, the title as a reported signal against `EXPECTED_TITLE_MISMATCHES`
    - Assert zero `[[` occurrences across all 18 `CORE_COLUMNS` of all 24 records, scoping the scan away from `_ext.dynamic_slots`, which legitimately contains placeholders
    - Assert no non-empty Filipino_Replaced_Column value of one record equals the corresponding value of another, and that every derived value matches exactly one card
    - Assert no normalized fragment of any unmapped paragraph (greeting, `Trabaho at safety`, reply scale, teach-back, card title, metadata cells) appears in any of the 18 columns
    - On mismatch, exit non-zero with a per-mismatch table giving both lengths and the first differing offset
    - _Requirements: 1.2, 1.4, 1.5, 3.2_

  - [x] 5.2 Run `verify` and record the exhaustive result
    - `python architecture/v2_corpus_tool.py verify` must exit 0 over all 24 cards x 5 sections
    - **Property 2: No placeholder token survives in the corpus** — **Validates: Requirements 3.2**
    - **Property 3: Every mapped section lands in its own record's mapped column** — **Validates: Requirements 1.2**
    - **Property 4: No Filipino content crosses conditions** — **Validates: Requirements 1.5**
    - **Property 5: Unmapped V2 sections appear nowhere in the corpus** — **Validates: Requirements 1.4**
    - Exhaustive over the fixed population, not sampled
    - _Requirements: 1.2, 1.4, 1.5, 3.2_

- [x] 6. Checkpoint - transcription verified before any artifact is regenerated
  - Ensure `verify` exits 0 and the `corpus_data.py` diff is confined to 120 Filipino literals, then continue. Ask the user if questions arise.

- [x] 7. Regenerate the v2 artifacts and prove the freeze

  - [x] 7.1 Implement `freeze` mode
    - Read both CSVs with `csv.DictReader`; assert identical header rows and identical `icd10_code` sequences before comparing
    - Compare cell by cell the union of `English_Columns`, `Provenance_Columns`, and `condition_name_fil` — 13 columns x 24 rows = 312 cells — and print the compared-cell count so a silently empty comparison cannot pass as success
    - Assert `reviewed_by == "Marco Paolo Perpetua, General Physician"` and `review_date == "2026-08-06"` on all 24 rows, and that no row carries `PENDING_REVIEWER` or `PENDING_DATE`
    - Assert `icd10_code_alt` is empty on all 24 rows and byte-compare `patient_education_extended_v2.json` against the v1 extended JSON (it must be byte-identical, since `_ext` and `condition_name_en` are untouched)
    - Open both v1 artifacts read-only; exit non-zero on any frozen-column difference, printing row, column, and both values
    - _Requirements: 1.3, 1.7, 2.1, 2.2, 2.3, 2.5_

  - [x] 7.2 Run the build from two working directories and confirm the validator outcome
    - Record `sha256` of both v1 artifacts, then run `python architecture/build_corpus.py` from the repo root and `python build_corpus.py` from `architecture/`; both must exit 0 with no traceback and write into `architecture/`
    - Expected stdout: `rows=24 blockers=0 warnings=50`, `blocked rows: 0`, with the 50 decomposing as **24 `NO_PH_SOURCE` + 26 `LONG_SENTENCES`** and no other warning code. The 26 `LONG_SENTENCES` are 22 on `red_flags_en` and 4 on `self_care_en`, across 22 rows of which 4 carry two findings each
    - Confirm the two v1 hashes are unchanged and both files still exist
    - **Property 11: Every replaced value is within its character limit** — **Validates: Requirements 5.2**
    - **Property 12: No blocker-class finding is produced** — **Validates: Requirements 5.1, 5.4**
    - **Property 13: The warning code set stays within the baseline allowlist** — **Validates: Requirements 5.5**
    - **Property 15: V1 artifacts are invariant across builds** — **Validates: Requirements 4.5**
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.4, 5.5_

  - [x] 7.3 Run `freeze` and record the scoped freeze proof
    - `python architecture/v2_corpus_tool.py freeze` must exit 0, report 312 compared cells and zero differences, and report the extended JSON byte-identical
    - **Property 6: English, provenance, and Filipino condition names are frozen** — **Validates: Requirements 1.3, 2.1, 2.2**
    - **Property 7: Clinical sign-off is carried, not renewed** — **Validates: Requirements 2.3**
    - **Property 9: Alternate codes stay empty and uncontradicted** — **Validates: Requirements 2.5**
    - **Property 10: Row identity is preserved across versions** — **Validates: Requirements 1.1, 1.7**
    - _Requirements: 1.1, 1.3, 1.7, 2.1, 2.2, 2.3, 2.5_

  - [x] 7.4 Diff the regenerated validation report against the pre-modification baseline capture
    - `diff /tmp/corpus_report_baseline.md architecture/corpus_validation_report.md` — compare against the capture taken in task 2.3, never against a `git show HEAD:` read taken after the build, since `HEAD` may no longer be the pre-modification commit
    - Cite the pinned commit hash from `/tmp/corpus_report_baseline.commit` in the recorded evidence rather than the word `HEAD`, so the comparison stays reproducible and auditable
    - An empty diff is the expected and structural result: `NO_PH_SOURCE` reads `source` and `LONG_SENTENCES` reads only English columns, both frozen. The baseline it must reproduce is 50 warnings decomposing as **24 `NO_PH_SOURCE` + 26 `LONG_SENTENCES`** (22 on `red_flags_en`, 4 on `self_care_en`). A non-empty diff means something English-side or source-side moved
    - **Property 14: LONG_SENTENCES findings are identical to baseline** — **Validates: Requirements 5.7**
    - If the diff is non-empty, write the per-warning account of every added or removed warning before treating the merge as done
    - _Requirements: 5.5, 5.6, 5.7_

  - [x] 7.5 Confirm build idempotence and location independence by hash
    - Run the build twice against an unchanged `corpus_data.py` and compare `sha256` of all three output files across runs, then repeat from the other working directory
    - **Property 16: The build is idempotent and location-independent** — **Validates: Requirements 4.1, 4.4**
    - Optional hardening: task 7.2 already exercises both invocation directories, so this adds byte-level confirmation rather than new coverage

  - [x] 7.6 Run the sandboxed mutation tests against the gate
    - Copy `corpus_data.py` and `build_corpus.py` into a temp directory so no tracked file is mutated, run each mutation there, then delete the directory
    - Inject `[[test]]` into one `explanation_fil` → expect a `PLACEHOLDER_IN_CONTENT` blocker and a non-zero blocker count, with no exemption, whitelist, or severity downgrade present in the validator
    - Pad one `explanation_fil` past 1500 characters → expect an `OVER_LIMIT` blocker naming the column, its character count, and its limit
    - **Validates: Requirements 3.3, 3.4, 5.3**
    - Required, not optional hardening: this task is the **sole** coverage for Requirements 3.3, 3.4, and 5.3. Those three acceptance criteria are negative assertions about the gate, and a passing zero-blocker build cannot demonstrate them. Skipping this task leaves them with zero verification
    - _Requirements: 3.3, 3.4, 5.3_

- [x] 8. Documentation edits

  - [x] 8.1 Add the V2 revision section to `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md`
    - Add one **Filipino content revision (V2, 2026-08-06)** section recording the source document, the five replaced columns, `condition_name_fil` unchanged, English frozen at V1-approved wording, the bilingual pair now accepted as **approximate rather than parallel**, the carried sign-off with no new review date, and the red-flag bullet-join convention
    - Additionally record the title non-adoption: V2 supplies shorter register-simplified Filipino condition titles for PE-005, PE-007, PE-012, PE-015, and PE-023, and those retitles were **deliberately not adopted** — `condition_name_fil` is held at its V1 value on every row per Requirement 1.3
    - Do not touch the 18-column table, the character limits, or the ingest rules
    - _Requirements: 2.6, 6.1, 6.2, 6.7_

  - [x] 8.2 Add the V2 provenance paragraph to the `architecture/corpus_data.py` module docstring
    - State which document the Filipino columns now come from, that English and provenance are frozen at V1, and that `condition_name_fil` was not replaced
    - Carry the same non-adoption note as task 8.1: V2's shorter register-simplified titles for PE-005, PE-007, PE-012, PE-015, and PE-023 were deliberately not adopted, `condition_name_fil` held at V1 on every row
    - Docstring only — no `RECORDS` value and no module constant changes in this task
    - _Requirements: 6.1, 6.2_

  - [x] 8.3 Update the `architecture/build_corpus.py` docstring and header text
    - Describe the v2 output names and the checkout-relative output path; replace the "Build and validate ... V1" header wording
    - Confine the change to the docstring and header text; no rule, threshold, or path logic moves here
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 8.4 Record the three follow-ups as documentation only, without fixing them
    - `backend/src/tools/cds-demo-readiness.ts` line 207 — remediation hint hardcodes `../architecture/patient_education_corpus_v1.csv --corpus-version v1`, stale once the v2 artifacts land
    - `backend/scripts/ingest-patient-education-corpus.ts` line 6 — docstring cites the v1 CSV path
    - `backend/scripts/ingest-patient-education-corpus.ts` line 37 — usage example cites `--corpus-version v1`
    - All three are comment and hint text belonging to the ingest decision, not to the artifact merge. **Do not edit either TypeScript file in this feature**; record the follow-up next to the schema document's new section
    - _Requirements: 6.5, 6.6_

- [x] 9. Confirm the scope boundary of the corpus change set
  - [x] 9.1 Review `git diff --name-only` against the allowed file list
    - This is the **corpus-half** boundary review. The Splice's TypeScript is legitimate scope (design 6.10) and is reviewed in task 18.1, so the check is written as an allowlist that names it rather than as a blanket "no `.ts` file" rule, which would now fail on approved work
    - Allowed, corpus half: `architecture/v2_corpus_tool.py`, `architecture/build_corpus.py`, `architecture/corpus_data.py`, `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md`, `architecture/patient_education_corpus_v2.csv`, `architecture/patient_education_extended_v2.json`, `architecture/corpus_validation_report.md`
    - Allowed, Splice half (present only if tasks 11-14 have already run): `backend/src/lib/cds/protected-output-adapters.ts`, `backend/src/lib/cds/protected-generation.ts`, `backend/src/tools/cds-demo-readiness.ts`, `backend/src/lib/cds/protected-output-adapters.test.ts`, `backend/src/lib/cds/patient-education.test.ts`, `backend/src/lib/cds/released-patient-education.test.ts`
    - Allowed, register half (present only if tasks 19-20 have already run — normally they have not, since they are sequenced after task 18): `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.tsx`, `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.test.tsx`, and `architecture/DECISIONS.md` **limited to the two edits design 9.6 permits**. Named as allowed for the same reason the Splice half is: an allowlist that omits approved work fails on it
    - Must be absent: both v1 artifacts, `contracts/openapi.yaml`, the generated contract types, `backend/src/lib/cds/patient-education.ts`, `backend/scripts/ingest-patient-education-corpus.ts`, `backend/src/lib/cds/released-patient-education.ts`, `backend/src/lib/cds/solver-content.ts`, `backend/src/handlers/cds.ts`, anything under `infra/`, and anything under `frontend/` other than the two `patientEducation/` register files
    - `architecture/DECISIONS.md` has moved from the forbidden list to the conditionally-allowed list, bounded rather than freed: two edits, asserted by Property 32 in task 20.4
    - Confirm no corpus ingest has run at this point — the gated `dev` ingest is task 16 and carries its own authorization — and that every finding outside the named corpus artifacts was recorded as follow-up rather than fixed, the one exception being the `cds-demo-readiness.ts` remediation hint that the design moved into scope (task 14)
    - _Requirements: 2.6, 2.7, 6.3, 6.4, 6.5, 6.6_

- [x] 10. Checkpoint - the corpus definition of done in one readable state
  - `rows=24 blockers=0 warnings=50`, an empty report diff against the committed baseline, `verify` and `freeze` both exiting 0, the v2 extended JSON byte-identical to v1, and both v1 artifacts unchanged. Ensure all checks pass, ask the user if questions arise.
  - This is the **corpus** part of the four-part definition of done. The Splice part (tasks 11-15), the Ingest part (task 16), and the Register part (tasks 19-21) follow, and task 18.2 states all four together.

- [x] 11. Reproduce the two live defects before writing any Splice implementation code

  The design established these by **executing** the shipped functions, not by reading them, and both change what Requirement 7 is. Reproduce each as a failing test first, so the fix is demonstrably a fix and not a claim.

  - [x] 11.1 Failing-test-first reproduction: the corpus-backed deterministic template does not validate today
    - Add a test in `backend/src/lib/cds/protected-output-adapters.test.ts` asserting that `validateProtectedOutputPayload('patient_education', patientEducationTemplate(article()))` **succeeds**. It fails today, and the failure is the point of this sub-task
    - Record the three independent reasons it throws, each of which the widening in task 12 must clear: `closedObject(['title','language','sections','warningSigns'])` rejects `titleFilipino` as an unknown field; `validateEducationSection`'s `closedObject(['heading','content'])` rejects the section `language` tag; and the `record.language !== 'english' && !== 'taglish'` check rejects `bilingual`
    - Record the consequence in the task evidence: because `ProtectedOutputValidationError` is listed in `shouldRejectWithoutFallback`, the template branch rethrows instead of degrading. So with an approved article present, patient education today has exactly two outcomes — a model paraphrase with no citation, or a failed request. The reviewed Filipino reaches a patient on **neither** path, not merely on the failure path. Requirement 7.14 therefore means "the deterministic payload shape is not redesigned", not "this path currently works"
    - Reuse the existing `article(overrides)` fixture from `patient-education.test.ts` rather than hand-building an article
    - _Requirements: 7.9, 7.14_

  - [x] 11.2 Failing-test-first reproduction: 2 of 24 shipped articles fail the medication content guard
    - Add a test asserting that all 24 rows of `architecture/patient_education_corpus_v1.csv`, assembled into bilingual payloads, pass `defaultContentValidation`. It fails today on 3 occurrences across 2 articles
    - The matches are all the literal noun `prescription`: J06.9 `self_care_en`, J06.9 `self_care_fil`, and I10 `self_care_fil`. `prescribed` (17 occurrences) and `Prescribing` (3) do **not** match, because the pattern is `prescri(?:be|ption)\b` and the trailing word boundary fails on `prescribed`
    - Record the consequence: the moment the validator widens, both paths reach `defaultContentValidation` and those 2 articles throw `ProtectedOutputContentError`, which is also in `shouldRejectWithoutFallback` — so the request fails with **no fallback**. J06.9 is the demo condition and the article `cds-demo-readiness.ts` probes, so without a decision here Requirement 7 is unsatisfiable for the demo
    - Also record that the corpus validator raises nothing here: `POSSIBLE_DOSING` looks for dosing patterns, not the word "prescription", which is why this is invisible upstream
    - **v1 and v2 give different counts, and the reproduction should expect the right one for the corpus it runs against.** Design 9.1 established that V2's PE-001 `Gawin ngayon` replaces `doctor-approved Plan o prescription` with `plano o reseta ni Doc`, so the word leaves J06.9's `self_care_fil`. Against **v1** the expected count is **3** occurrences across 2 articles (J06.9 `self_care_en`, J06.9 `self_care_fil`, I10 `self_care_fil`); against the **v2** corpus it is **2** across the same 2 articles (J06.9 `self_care_en`, which is frozen English per Requirement 2.1, and I10 `self_care_fil`). If this test runs after task 4's transcription and reads the v2 artifact, assert 2, not 3
    - The scoping decision in task 11.3 is **unchanged by that difference and still load-bearing**: both articles still trip the guard on both corpora, `ProtectedOutputContentError` is still in `shouldRejectWithoutFallback`, and J06.9 is still the demo condition. A count that dropped from 3 to 2 is not a count that dropped to 0
    - _Requirements: 7.1, 7.3, 7.9_

  - [x] 11.3 Record the explicit acknowledgement of design decision 6.7(a) — hard gate before task 12
    - Decision 6.7(a): for `patient_education`, scope the medication scan to **model-authored text** — the provider candidate's `title`, section headings and contents, and `warningSigns` if present — and **do not run it over corpus-derived text**. On the template path, where every byte is reviewed corpus text, the patient-education medication scan does not run at all
    - Acknowledge in writing that **this narrows an existing safety guard**, and record the reasoning being accepted: the rule exists to stop an unreviewed model putting dosing into patient-facing content; corpus text is clinician-reviewed, signed off, and already cleared the corpus validator's `BRANDS`, `DOSE_PATTERNS`, and `POSSIBLE_DOSING` rules
    - Record the two rejected alternatives and why: **(b)** editing the corpus is refused because `self_care_en` is frozen by Requirement 2.1 and rewording `self_care_fil` would break byte-fidelity to the V2 card (Requirement 1.2, Property 3) — editing approved clinical text to appease a regex is the wrong direction of causation; **(c)** a global allowlist for the word is refused because it weakens the rule for model output, which is the only place it was ever meant to bite
    - Record what stays unchanged, so the narrowing is bounded and reviewable: the output-size bound, `assertNoPii` over the whole serialized payload (verified clean on all 24 articles), the prescription brand-name rule, and any injected `validateContent` all keep running exactly as today
    - **This acknowledgement is a hard gate.** Task 12.6 implements the narrowing; it must not be started until this record exists. It is not optional and not skippable
    - _Requirements: 7.1, 7.3_

- [x] 12. Implement the Splice in `backend/src/lib/cds/protected-output-adapters.ts`

  Design 6.3 through 6.7 and 6.10. The Splice executes **inside** the validation step, not after the adapter returns, so the object the validator and the safety checks assert on is the object that gets published (design 6.1).

  - [x] 12.1 Export `PATIENT_EDUCATION_SECTION_HEADINGS` and add the corpus-grounded prompt shape with its selection in `buildMessages`
    - Export the four heading slots as a `const` tuple in corpus order: `What this is`, `What to expect`, `Self care`, `Follow up`. One constant, consumed by both `patientEducationTemplate`'s heading list and the prompt string, so the slot vocabulary cannot drift between the template and the instruction telling the model which slots to fill (design 6.8)
    - Leave the existing module-private `SCHEMA_INSTRUCTIONS` record — the real identifier, not `PROTECTED_OUTPUT_SHAPES` — unchanged for the six other output kinds and for the no-article `patient_education` case
    - Add `PATIENT_EDUCATION_CORPUS_GROUNDED_SHAPE`: exactly 4 sections, the four headings named literally in order, English only stated twice (once as instruction, once as a prohibition naming Tagalog and Taglish), and an explicit "do not include `warningSigns`, `titleFilipino`, `citation`, `corpusVersion`, or `icd10Code`"
    - Select between the two shapes in `buildMessages` on whether a corpus payload is present. The prompt and the validator must widen in the same edit: a model told to write Filipino by a validator that then rejects Filipino turns a well-behaved model into a failed request
    - Add `corpusEducationFrom(input)`, which reads `input.deterministicTemplate` and returns it only when `language === 'bilingual'`. No field is added to `ProtectedOutputAdapterInput` — two independently constructed copies of the same corpus content is exactly the divergence Requirement 7.16 asks us to make structural rather than conventional (design 6.2)
    - _Requirements: 7.4, 7.11_

  - [x] 12.2 Add `ProtectedOutputValidationContext` and the optional third parameter on `validateProtectedOutputPayload`
    - `{ candidateOrigin?: 'provider' | 'template'; corpusEducation?: CdsPatientEducationPayload }`
    - Omitting the parameter MUST mean `{ candidateOrigin: 'provider', corpusEducation: undefined }`, which is **today's exact behaviour** — English or Taglish, closed four-key object, no Filipino
    - Every existing two-argument call site is therefore unchanged, including `backend/src/tools/cds-safety-regression.ts` and the existing tests. Do not touch those call sites; the default is what keeps them correct
    - The six other output kinds see no behavioural change from the added parameter
    - _Requirements: 7.10, 7.15_

  - [x] 12.3 Split the shape check into `validateProviderEducationShape` and `validateCorpusEducationShape` with per-origin key sets
    - Provider origin keeps today's narrow set: closed to `{title, language, sections{heading, content}}`, `language` restricted to `english | taglish`, `warningSigns` tolerated and discarded (Requirement 7.6 says *discarded*, not *rejected*)
    - Corpus origin adds `titleFilipino`, `icd10Code`, `citation`, and `corpusVersion` as optional keys and accepts `language: 'bilingual'`
    - `validateEducationSection` gains an optional `language` key restricted to `'english' | 'filipino'` — accepted on the corpus origin, forbidden on the provider origin
    - The per-origin split is what makes Requirements 7.7 and 7.13 enforceable without a content comparison: a model that tags a section `filipino`, or emits `citation`/`corpusVersion`/`titleFilipino`, is rejected by the closed-key rule before anything needs comparing
    - Add the explicit 7.8 check in the corpus branch: `language: 'bilingual'` with no `corpusEducation` in context is rejected outright
    - _Requirements: 7.7, 7.8, 7.9, 7.13_

  - [x] 12.4 Implement `spliceCorpusEducation` and wire the provider branch through it
    - Build a `Map` of model heading → content, **first occurrence wins**, so a duplicated heading is deterministic
    - Return `{ ...corpus, sections: corpus.sections.map(...) }`, replacing `content` only on sections already tagged `english` whose exact heading the model supplied. Structure, order, count, language tags, and every non-English value come from the corpus
    - Heading matching is **exact** — no trimming, case-folding, or punctuation-stripping. A normalizing match is a matching heuristic, and every fuzzy match in this subsystem has been deliberately refused
    - Consequences to preserve deliberately: the published payload always carries exactly 8 sections (4 headings x 2 languages, corpus order), so the contract's `maxItems: 20` cannot be reached; a model heading with no corpus counterpart is **dropped, not rejected**; a heading the model omitted keeps its approved corpus English
    - The provider branch composes, then re-validates the composed payload in `'template'` mode against the same corpus object, so the published object is validated in its published form
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 12.5 Implement `assertCorpusOwnedFieldsUnchanged`
    - Byte-compare `title`, `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, `warningSigns`, the section count, and every section's `heading` and `language`, plus the `content` of every section tagged `filipino`
    - Exempt exactly one thing: the `content` of the four sections tagged `english`. Those are the Splice's slots
    - Any difference is a `ProtectedOutputValidationError`. This is the assert that makes Requirement 7.16 structural — if a future edit introduces a second corpus projection or mutates a corpus field during composition, it fails loudly instead of shipping two nearly-equal payloads
    - _Requirements: 7.7, 7.16_

  - [x] 12.6 Scope the medication scan to model-authored text and add the section-outcome counter
    - Blocked on the acknowledgement recorded in task 11.3. Do not start this sub-task without it
    - For `patient_education`, run the `PATIENT_EDUCATION_MEDICATION` scan over the **provider candidate's** text only — its `title`, section headings and contents, and `warningSigns` if present. On the template path it does not run at all
    - Leave untouched: the output-size bound, `assertNoPii` over the whole serialized payload, the prescription brand-name rule, and any injected `validateContent`
    - Add `protected_output_education_section_total{outcome: 'model_slotted' | 'model_heading_unmatched' | 'corpus_english_retained'}` so the dropped-heading quality cost from 12.4 is observable rather than silent. If `model_heading_unmatched` dominates in `dev`, the fix is a prompt iteration, not a validator change
    - `source` on the returned result stays `'llm'` for a spliced payload — the contract's enum is `'llm' | 'template'` and Requirement 7.15 forbids touching it; field provenance lives in `citation` and `corpusVersion`, where a reader needs it
    - _Requirements: 7.1, 7.3_

  - [x] 12.7 Wire `backend/src/lib/cds/protected-generation.ts`
    - Import `PATIENT_EDUCATION_SECTION_HEADINGS` for `patientEducationTemplate`'s heading list, and pass `{ candidateOrigin, corpusEducation }` into `validateProtectedOutputPayload`
    - Leave the `education`, `adapterInput`, `groundingSources`, and `deterministicTemplate` wiring **unchanged**. The Approved_Article already reaches the Splice point through `deterministicTemplate`; no interface widens
    - The no-article path must come out exactly as it is today: `defaultTemplate` emits `language: 'english'`, so `corpusEducationFrom` returns undefined, the prompt uses the existing shape string, the provider branch returns the candidate unchanged, and **no citation is fabricated**
    - _Requirements: 7.11, 7.12, 7.14_

- [x] 13. Vitest coverage for the Splice

  Per the design's corrected Testing Strategy. Reuse the existing fixtures rather than building a new harness: `article(overrides)` from `patient-education.test.ts`, and `harness(content)` plus the `PAYLOADS` record from `protected-output-adapters.test.ts`. Every fast-check property runs at least 100 cases and is tagged with the feature name and property number in its test description.

  - [x] 13.1 Build the two generators and extend `PAYLOADS.patient_education`
    - Model-candidate arbitrary: 1 to 20 sections, arbitrary headings, **duplicated** headings, and heading sets **disjoint** from the corpus set, with `warningSigns` optionally present
    - Article arbitrary: built on the existing `article(overrides)` fixture so the article side stays consistent with `patient-education.test.ts`
    - Add a corpus-grounded input variant alongside the existing `PAYLOADS.patient_education` entry; run candidates through the **real** `validateProtectedOutputPayload`, not a reimplementation
    - _Requirements: 7.1, 7.9_

  - [x] 13.2 Property tests for the composition rule
    - **Property 17: Filipino sections on the model path are byte-equal to the corpus** — **Validates: Requirements 7.3**
    - **Property 18: Corpus-owned fields on the model path come from the corpus** — **Validates: Requirements 7.1, 7.2, 7.4**
    - **Property 19: Warning signs are the two reviewed red-flag strings, never the model's** — **Validates: Requirements 7.5, 7.6**
    - **Property 20: Section pairing is total, bounded, and slot-shaped** — **Validates: Requirements 7.3, 7.4, 7.9**
    - Property 20 must specifically cover the 8-section invariant, the unmatched-heading drop, and the omitted-heading retention across the generated heading sets from 13.1
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9_

  - [x] 13.3 Cross-path equality test
    - Render the same generated article through both the model path and the deterministic template path and compare corpus-owned fields field by field
    - **Property 21: Both generation paths agree byte for byte on corpus-sourced fields** — **Validates: Requirements 7.16**
    - The two payloads may differ **only** in the content of sections tagged `english`. This test is what fails loudly if a second corpus projection is ever introduced
    - _Requirements: 7.16_

  - [x] 13.4 Negative cases
    - Provider candidate with a section tagged `language: 'filipino'`; provider candidate carrying `citation`, `corpusVersion`, or `titleFilipino`; provider candidate claiming `language: 'bilingual'`; and a `bilingual` candidate with no corpus context
    - **Property 22: Filipino that did not come from the corpus is rejected** — **Validates: Requirements 7.7, 7.8, 7.13**
    - _Requirements: 7.7, 7.8, 7.13_

  - [x] 13.5 Two-argument regression for the no-article path
    - Call `validateProtectedOutputPayload` with two arguments for `patient_education` and assert byte-identical results to today's behaviour; also assert the six other output kinds are unaffected by the added context parameter
    - **Property 23: The no-article path is unchanged** — **Validates: Requirements 7.10, 7.11, 7.12**
    - This is the test that protects `backend/src/tools/cds-safety-regression.ts` and every other existing two-argument call site
    - _Requirements: 7.10, 7.11, 7.12_

  - [x] 13.6 Section-6 defect regressions
    - Turn task 11.1's failing test green: `validateProtectedOutputPayload('patient_education', patientEducationTemplate(article), { candidateOrigin: 'template', corpusEducation: ... })` accepts
    - Turn task 11.2's failing test green: all 24 shipped articles pass through the **scoped** content guard and through `assertNoPii` over the whole serialized payload, with zero violations
    - Keep both as regressions, so the J06.9/I10 `prescription` finding and the 6.7 scoping stay covered rather than being fixed once and forgotten
    - **Validates: Requirements 7.14**
    - _Requirements: 7.1, 7.3, 7.14_

  - [x] 13.7 Alias-set stability check in `patient-education.test.ts`
    - Run `aliasKeysFor` over the condition-name and code columns of both CSVs and assert **set equality** plus a count of **71** keys, not 72 — `U07.1`'s English and Filipino names both normalize to `covid 19`, so that row contributes 2 alias keys
    - Repository-only, no AWS call. This is the local half of Property 24 and the evidence that declining the five V2 retitles turned a migration into a same-key overwrite
    - **Property 24 (repository half): Re-ingest overwrites the same keys and orphans nothing** — **Validates: Requirements 8.9, 8.12**
    - Do not modify `patient-education.ts` itself (Requirement 2.7)
    - _Requirements: 6.9, 8.9, 8.12_

  - [x] 13.8 Released-artifact immutability check in `released-patient-education.test.ts`
    - `toReleasedArtifact` over a stored item whose `payload` carries v1 Filipino, asserted byte-identical regardless of corpus state
    - **Property 26: Released artifacts are a function of their stored payload alone** — **Validates: Requirements 9.1, 9.2, 9.3**
    - Do not modify `released-patient-education.ts` (Requirement 9.6); this task adds a test that pins existing behaviour
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 13.9 Stubbed-client dry-run assertion
    - `--dry-run` against `patient_education_corpus_v2.csv` with a stubbed document client, asserting **zero** sends and that a row is accepted if and only if the write pass would accept it
    - **Property 25: The dry run decides exactly what the write pass would, and writes nothing** — **Validates: Requirements 8.3, 8.5, 8.8**
    - Optional hardening: task 16.2's recorded real dry run is the primary evidence for Requirements 8.3-8.5. What this adds is the zero-sends proof, which a real run cannot show from its own output

- [x] 14. Fix the stale v1 remediation hint in `backend/src/tools/cds-demo-readiness.ts`

  - [x] 14.1 Update the two tokens in the remediation string at line 207
    - `../architecture/patient_education_corpus_v1.csv` → `../architecture/patient_education_corpus_v2.csv`, and `--corpus-version v1` → `--corpus-version v2`. Two tokens, nothing else
    - The design moved this from deferred follow-up into scope for a specific reason: after the task 16 ingest, an operator who hits the warn branch and pastes the printed remediation verbatim would **re-ingest v1 over v2**, silently reverting the corrected Filipino on all 24 articles. That is not a stale comment, it is a documented instruction to undo the feature
    - Leave the surrounding `detail` text alone — "patient education still generates, falling back to the generic grounding bundle and deterministic template" remains an accurate description of the no-article path
    - The ingest script's own docstring and usage example (lines 6 and 37) stay **deferred**, because Requirements 2.7 and 8.14 say that file is unmodified and "the script is unmodified" is a cheap, verifiable claim worth keeping intact
    - _Requirements: 6.5, 6.6_

- [x] 15. Run the backend gate

  - [x] 15.1 `npm run typecheck`, `npm run lint`, and `npm test` from `backend/`
    - All three green, with the widened validator signature in place
    - A typecheck failure at an existing two-argument call site means the optional third parameter was not made optional correctly (task 12.2), not that the call site needs editing
    - _Requirements: 7.15_

- [x] 16. Authorization-gated `dev` corpus ingest

  Design section 7. Read the boundary before starting: the `--dry-run` pass issues **zero** AWS calls and needs no authorization; the **write pass is an environment mutation** and is blocked on its own current, unused, operation-specific point-of-action authorization. Sub-tasks 16.4 and 16.5 are unreachable without it, and a recorded `DEFER` is an acceptable completion of this task and of the repository work.

  - [x] 16.1 Derived alias-set equality — repository-only, no AWS call
    - Run the check landed in task 13.7 and record the result: `aliasKeysFor` over both CSVs yields the identical set of **71** keys
    - This runs **before** any write and establishes the expected key set independently of what is in the table, which is what makes the 16.5 read-back a comparison rather than a description
    - _Requirements: 6.9, 8.12_

  - [x] 16.2 The `--dry-run` pass — no authorization required
    - From `backend/`, with the exact environment variables from design 7.2 (they are not decoration: `ENVIRONMENT` drives the script's own non-`dev` refusal and `DYNAMODB_APP_CORE_TABLE` selects the target table):

      ```bash
      cd backend
      ENVIRONMENT=dev \
      AWS_REGION_NAME=ap-southeast-1 \
      DYNAMODB_APP_CORE_TABLE=bayanhealth-dev-app-core \
        npm run script:ingest-patient-education -- \
          ../architecture/patient_education_corpus_v2.csv --corpus-version v2 --dry-run
      ```

    - Required output, recorded **before** the write pass may run: `articles=24 aliases=71 rejected=0`, `rows=24`, `environment=dev`, `table=bayanhealth-dev-app-core`, `version=v2 (DRY RUN — no writes)`
    - `aliases=71`, not 72, for the `U07.1` normalization reason in 13.7
    - Any rejection, or any row count other than 24, **withholds the write pass** and the rejection detail is recorded instead
    - **Property 25: The dry run decides exactly what the write pass would, and writes nothing** — **Validates: Requirements 8.3, 8.5, 8.8**
    - _Requirements: 8.3, 8.4, 8.5, 8.8_

  - [x] 16.3 HARD STOP — point-of-action authorization check before any write
    - **Everything from 16.4 onward is blocked here.** Confirm a **current, unused, operation-specific** point-of-action authorization bound to all four of: this operation (corpus ingest write pass), this target (`bayanhealth-dev-app-core`), this environment (`dev`), and one window
    - If that authorization is **missing, expired, already used, or mismatched** on any of those four, perform **zero mutation** and record `DEFER` naming the specific mismatch. Not a partial ingest. Not a "just the demo article" ingest
    - `DEFER` is an **acceptable completion** of this task and of the repository work for this feature. It is not a failure and it does not keep the feature open; only the write pass produces `dev` runtime evidence, and its absence is recorded rather than worked around
    - Authorization for this ingest does not extend to anything adjacent in the same environment — in particular it does not authorize `npm run script:seed-cds-demo-policy`, which server-enables protected generation for all actors with no canary allowlist
    - This gate is **not optional and not skippable**, by a human or by a graph-driven executor
    - _Requirements: 8.1, 8.2, 8.7_

  - [x] 16.4 The write pass — runs only against the 16.3 authorization
    - Same command as 16.2 without `--dry-run`:

      ```bash
      cd backend
      ENVIRONMENT=dev \
      AWS_REGION_NAME=ap-southeast-1 \
      DYNAMODB_APP_CORE_TABLE=bayanhealth-dev-app-core \
        npm run script:ingest-patient-education -- \
          ../architecture/patient_education_corpus_v2.csv --corpus-version v2
      ```

    - Expected: `articles=24 aliases=71 rejected=0`, exit 0, `corpusVersion: 'v2'` and a one-year `Ttl.PatientEducation` on every written item
    - If `ENVIRONMENT` resolves to anything but `dev` and `ALLOW_NON_DEV_CORPUS_INGEST` is unset, the script throws before parsing arguments; record that refusal as `DEFER`
    - Do not modify the non-`dev` guard, do not modify the escape hatch, and do not set `ALLOW_NON_DEV_CORPUS_INGEST`. `staging` and `prod` get no dry run, no write pass, and no read-back
    - _Requirements: 8.6, 8.8, 8.9, 8.10, 8.13, 8.14_

  - [x] 16.5 Read-back verification — read-only, after the write pass
    - **Keyed article read through the retrieval path**: `findPatientEducationForDiagnosis(<condition name>)` rather than a raw `GetItem`, sampling **J06.9 at minimum** since it is the demo condition and the article `cds-demo-readiness.ts` probes. Going through the retrieval path proves the alias hop as well as the article, which is what Requirement 8.11 is actually asking about
    - Assert on the sampled row: `corpusVersion === 'v2'`; the five `*.filipino` values byte-equal to that row's **v2** CSV values; all six `*.english` values and `conditionName.filipino` byte-equal to the **v1** CSV values; `reviewedBy`/`reviewDate` unchanged; `ttl` roughly one year out
    - **71 alias Gets**: read each expected alias key and assert presence with the right `icd10Code` target
    - **One filtered `Scan`** projecting `pk` only, filtered on `begins_with(pk, 'PATIENT_EDU#ALIAS#')`, asserting the actual alias set equals the expected 71. The scan is the only way to prove **absence** of an orphan — a Get can only confirm what you already thought to look for
    - Record every read-back with the table name, the environment, and a timestamp. All of it is read-only
    - **Property 24 (environment half): Re-ingest overwrites the same keys and orphans nothing** — **Validates: Requirements 8.9, 8.10, 8.12**
    - _Requirements: 8.10, 8.11, 8.12_

- [x] 17. Documentation for the expanded scope

  Both texts are already drafted in the design's Documentation Edits section; carry them across rather than rewriting them.

  - [x] 17.1 Add the "From artifact to screen" section to `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md`
    - Four paragraphs carrying Requirements 6.8 through 6.11: the v2 artifacts change nothing readable until the ingest runs, because retrieval reads `app_core` only and no runtime code reads a CSV (6.8); alias stability is the operational payoff of declining the V2 retitles, since all three `aliasKeysFor` inputs are frozen, making a v2 ingest a same-key overwrite of 24 article keys and 71 alias keys (6.9); before the Splice the reviewed Filipino reached a patient only through the deterministic template, that is only on provider failure, timeout, or a tripped gate, and approved wording surviving only on the failure path is an inversion (6.10); and the contract already permitted the bilingual payload, so the validator was narrower than the contract it serves and the fix widens the validator, not the contract (6.11)
    - Do not touch the 18-column table, the character limits, or the ingest rules
    - _Requirements: 6.8, 6.9, 6.10, 6.11_

  - [x] 17.2 Add the released-education immutability note to the same document
    - The design's quoted paragraph under Requirement 9.4: a released artifact serves the payload stored at release time, not a fresh corpus read, so re-ingesting the corpus changes nothing a patient has already received; artifacts released before a corpus revision keep the wording that was released, **by design**, because retroactively editing published clinical guidance is not a content update but a rewrite of the record; newly generated education uses the current corpus
    - Record that no re-release path, no backfill path, and no artifact-rewrite path is introduced
    - _Requirements: 9.4, 9.5_

- [x] 18. Scope-boundary review of the corpus-plus-Splice change set, and the four-part definition of done

  - [x] 18.1 Assert the change set against the full allowed and forbidden lists
    - `git diff --name-only` must list only: the `architecture/` set from task 9.1, plus `backend/src/lib/cds/protected-output-adapters.ts`, `backend/src/lib/cds/protected-generation.ts`, `backend/src/tools/cds-demo-readiness.ts`, and their tests (`protected-output-adapters.test.ts`, `patient-education.test.ts`, `released-patient-education.test.ts`)
    - Also **allowed**, present only if tasks 19-20 have already run: `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.tsx`, the same directory's `PatientEducationCard.test.tsx`, and `architecture/DECISIONS.md`. Design 9.4 and 9.6 put all three in scope, so a blanket "no `frontend/`" or "no `DECISIONS.md`" rule would now fail on approved work — the same reason task 9.1 is written as an allowlist
    - Confirm **absent**: `contracts/openapi.yaml`, the generated contract types, `backend/src/lib/cds/patient-education.ts`, `backend/scripts/ingest-patient-education-corpus.ts`, `backend/src/lib/cds/released-patient-education.ts`, `backend/src/lib/cds/solver-content.ts`, `backend/src/handlers/cds.ts`, both v1 artifacts, anything under `infra/`, and anything under `frontend/` other than the two `patientEducation/` register files — `frontend/.../lib/api/patientEducation.ts` specifically included in the forbidden set
    - **Property 27: The frozen surface is untouched** — **Validates: Requirements 2.7, 7.15, 8.14, 9.5, 9.6**
    - **Property 32: The governance change set is exactly two edits** — **Validates: Requirements 6.3, 10.12, 10.13**
    - Property 27 no longer carries Requirement 6.3 on its own. The design amended it: `DECISIONS.md` is a bounded-edit file rather than a frozen one, so the 6.3 bound is now Property 32's, and its detailed check is task 20.4. Assert Property 32 here only as file-level presence-with-a-bound; the two-edit shape is 20.4's job
    - _Requirements: 2.7, 6.3, 6.4, 6.5, 6.6, 7.15, 8.13, 8.14, 9.5, 9.6_

  - [x] 18.2 State the four-part definition of done in one readable place
    - **Corpus:** `rows=24 blockers=0 warnings=50` decomposing as 24 `NO_PH_SOURCE` + 26 `LONG_SENTENCES`, an empty report diff against the pre-modification baseline capture with its source commit hash pinned in the evidence, `verify` and `freeze` both exiting 0, every replaced value at or below its `CHAR_LIMITS` bound, and a byte-identical extended JSON between v1 and v2
    - **Splice:** `npm run typecheck`, `npm run lint`, `npm test` all green; Properties 17 through 23 and 26 passing with at least 100 generated cases each where generated; the corpus-backed deterministic template accepted by the validator; all 24 shipped articles passing `assertNoPii` and the scoped content guard; and the change set matching 18.1
    - **Register:** the two displayed strings in `PatientEducationCard.tsx` reading `Taglish`; `PatientEducationCard.test.tsx` green with `/^Taglish$/` and no `Filipino` text on the toggle group in either state; Properties 28 through 32 passing; `frontend/bayan-health-mvp/` lint, typecheck, and test all green; the Schema_Document register section written; and `git diff architecture/DECISIONS.md` showing exactly one appended `ADR-20260824-01` block and one modified `Status` line on ADR-20260804-01
    - The Register part is the design's fourth, and it is verified by tasks 19-21, which are sequenced after this task. State it here as the fourth part of the definition of done and record its state as pending until 21.1 closes; the corpus, Splice, and ingest parts do not wait on it and it does not wait on them
    - **Ingest:** a recorded `--dry-run` showing `articles=24 aliases=71 rejected=0` before any write, and **either** a write pass under a current, unused, operation-specific authorization followed by the 16.5 read-back, **or** a recorded `DEFER` naming the specific mismatch with zero mutation. Both are acceptable completions of the repository work; only the first produces `dev` runtime evidence
    - Close by restating the promotion boundary: a `dev` ingest plus a green local suite is dev evidence. It is not staging qualification, not canary authorization or observation, and not production enablement or GA
    - Ensure all checks pass, ask the user if questions arise
    - _Requirements: 6.4, 8.13_

- [x] 19. Correct the patient-facing register label

  Design 9.4 and 9.5. Two rendered strings, their doc comments, and the assertions that match them. The whole point of this task is what it does **not** change: the label moves to `Taglish` and every `filipino` identifier stays, because a patient never sees an enum value and renaming one would mean a contract change (design 9.5). Line numbers below are the design's readings and are approximate — locate by content, not by line.

  - [x] 19.1 Change the two rendered register strings and the doc comments in `PatientEducationCard.tsx`
    - File: `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.tsx`
    - The toggle label at line ~166: `{option === "filipino" ? "Filipino" : "English"}` becomes `{option === "filipino" ? "Taglish" : "English"}`. The button's `capitalize` class is a no-op on `Taglish`, so no styling follows
    - The unavailable-register string at line ~198: `Not available in {language === "filipino" ? "Filipino" : "English"} yet` becomes `Not available in {language === "filipino" ? "Taglish" : "English"} yet`
    - Add a doc comment directly above `type Language` (line ~21) recording three things: that `filipino` is the stored `CdsPatientEducationSection.language` value defined in `contracts/openapi.yaml`, that `Taglish` is the **displayed** name for that same register, and that the value is **not renameable without a contract change**. This is the nearest documentation to the code most likely to be edited, which is why design 9.5 lists it first of the four mapping points
    - Update the two prose doc comments that name the register: line ~33 (`a language toggle over reviewed English and Filipino text`) and line ~211 (`supplies these as [English, Filipino] in order`). A comment reading `Filipino` above code rendering `Taglish` is exactly the trap 9.5 exists to close
    - **Change nothing else.** Design 9.4 enumerates all five things that stay, and each is an identifier or a contract-shaped selection rather than a label: `type Language = "english" | "filipino"` (line 21); the `(["english", "filipino"] as const).map(...)` option list (line 152); the `language === "filipino" && payload.titleFilipino` guard (lines 91-92); the `language === "filipino" ? group.filipino : group.english` selection (lines 187-188), where `group.filipino` is populated from `section.language === "filipino"`; and the `language === "filipino" ? signs[1] : signs[0]` index (line 226), which picks the Filipino-tagged red-flag string the Splice guarantees is second
    - No type, identifier, contract field name, `className`, ARIA attribute, or branch changes in this sub-task
    - _Requirements: 10.8, 10.9, 10.16_

  - [x] 19.2 Retarget the label assertions in `PatientEducationCard.test.tsx` and add the two new register cases
    - File: `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.test.tsx`
    - Change the two assertions matching displayed text: `toggleButton(m.container, /^Filipino$/)` at line ~213 and `expect(toggleButton(m.container, /^Filipino$/)).toBeUndefined()` at line ~253 both become `/^Taglish$/`. Reword the test names and prose comments that describe the register
    - Keep the local `const filipino` binding name on purpose: it holds the button for the `filipino` register, and leaving it puts the label/identifier split in front of the reader at the one place they are most likely to notice it
    - **Leave the fixture untouched.** `titleFilipino: "Pag-aalaga sa bahay"`, the `language: "filipino"` section tags, and `expect(text).toContain("Paliwanag sa Filipino.")` are payload values and fixture content, not labels (Requirement 10.10). A fixture edit here is the signal that the change strayed
    - **Scope every register-name assertion to component-emitted text, not to the whole container.** The new negative assertion is that no button inside `[role="group"][aria-label="Reading language"]` has text matching `/Filipino/`, in both toggle states. A container-wide `expect(container.textContent).not.toMatch(/Filipino/)` would **fail on approved content**, because the `bilingualArticle()` fixture body legitimately reads `Paliwanag sa Filipino.` — such an assertion tests the fixture rather than the label
    - Add the second new case: give `bilingualArticle()` a heading present in `english` only, toggle to the second register, and assert the rendered hint reads `Not available in Taglish yet`, so the second displayed string is covered and not just the toggle label
    - Reuse the three existing fixtures rather than adding a harness: `bilingualArticle()` (line ~64), `toggleButton(container, label)` (line ~134, itself unchanged), and `mountCard(consultationId, poll)` (line ~93)
    - Keep the existing assertions on `titleFilipino`, the `filipino` section body, the second `warningSigns` entry, and `aria-pressed="true"` — they are what prove the selection still keys on `filipino` while the label reads `Taglish`
    - _Requirements: 10.8, 10.10, 10.16_

  - [x] 19.3 Property tests for the label/identifier divergence and the change-set confinement
    - **Property 29: The label and the identifier diverge, and both halves hold** — **Validates: Requirements 10.8, 10.9**
    - Assert **both directions**, since one-directional coverage passes on a unification: every register name the component itself emits (the two toggle button labels and the unavailable-register hint) reads `Taglish` and never `Filipino`; and every value the component compares or keys on (the `Language` union members, the option list, the value compared against `CdsPatientEducationSection.language`, the `titleFilipino` guard, and the second-`warningSigns` index) reads `filipino` and never `taglish`
    - Quantify over **component-emitted text**, not over the whole rendered container, for the reason recorded in 19.2 and in the design's Property 29 note: the fixture body contains the word "Filipino" as approved content
    - **Property 30: The frontend change set is confined to displayed text and its assertions** — **Validates: Requirements 10.10, 10.16**
    - Verify Property 30 as a static check plus a line-by-line `git diff` review of `frontend/`: exactly the two `patientEducation/` files appear; zero `"Filipino"` rendered literals remain in `PatientEducationCard.tsx`; zero `/^Filipino$/` label assertions remain in the test; `type Language`, the option list, and every `=== "filipino"` comparison are all still present and unchanged; and no changed line alters a type, identifier, contract field name, fixture payload value, `className`, ARIA attribute, or control flow
    - Exclude `titleFilipino` and the fixture's `Paliwanag sa Filipino.` from the rendered-literal grep **by name** — one is a contract field, the other is content
    - `fast-check` is already a frontend devDependency, so a generated-input variant over toggle state and article shape is available; the two properties are small enough that the render-time and static checks carry them
    - _Requirements: 10.8, 10.9, 10.10, 10.16_

  - [x] 19.4 Run the frontend gate
    - From `frontend/bayan-health-mvp/`, using the script names as they actually exist in that `package.json` (verified: `lint` → `eslint`, `typecheck` → `tsc --noEmit`, `test` → `vitest --run`):

      ```bash
      cd frontend/bayan-health-mvp
      npm run lint
      npm run typecheck
      npm test
      ```

    - All three green. `npm test` already runs vitest once via `--run`, so no watch-mode flag is added
    - A two-string change should move nothing else. Any failure outside `PatientEducationCard.test.tsx` means the edit left the displayed-text boundary
    - Re-read `package.json` before running rather than trusting this list, in case the scripts moved after this plan was written
    - _Requirements: 10.8, 10.16_

- [x] 20. Record the register clarification in governance and the schema document

  Design 9.6 drafts both ADR texts in full and the design's Documentation Edits section drafts the schema text. Carry them across rather than rewriting them.

  - [x] 20.1 Append `ADR-20260824-01` to `architecture/DECISIONS.md`
    - Use the entry drafted in design 9.6 (Edit 1) verbatim in substance: title, `Date: 2026-08-24`, `Status`, `Owner`, `Context` (the two-register finding with its verified V2 and v1 wording evidence, plus the three unrelated `taglish` sightings), `Decision` (seven bullets: two registers; no third register; no identifier renamed; the patient-facing label corrected; the divergence documented at four points; `bilingual` unchanged; the solver strings not promoted), `Alternatives considered` (four, each with its refusal), `Consequences` (positive, trade-offs, follow-up actions), and `Related files`
    - Follow the file's existing heading and field conventions: `### ADR-YYYYMMDD-NN: <title>` with `Date`, `Status`, `Owner`, `Context`, `Decision`, `Alternatives considered`, `Consequences`, `Related files`
    - Design verified that the highest existing id in the file is **`ADR-20260823-01`**, which is why the next available date-suffixed id is `ADR-20260824-01`
    - **Re-check the highest id at implementation time** before writing — `grep -oE '^### ADR-[0-9]{8}-[0-9]{2}' architecture/DECISIONS.md | sort | tail -3` — in case another ADR landed since the design was written. If a higher id exists, take the next available one and use it consistently in the ADR heading, in the 20.2 cross-reference note, in the 20.3 schema section, and in the doc comment from 19.1
    - Append only. No existing entry is touched in this sub-task
    - _Requirements: 6.3, 10.12_

  - [x] 20.2 Add the cross-reference note to ADR-20260804-01's `Status` line only
    - Append the register clause drafted in design 9.6 (Edit 2) to that entry's existing `Status` line: register naming clarified by `ADR-20260824-01`, the bilingual requirement satisfied by exactly two registers — English and Taglish, where Taglish is the accurate name for the content stored in the `*_fil` columns and tagged `filipino` — no third register added, and no wording in that ADR amended
    - **A one-line diff.** ADR-20260804-01's `Context`, `Decision`, `Alternatives considered`, `Consequences`, and `Related files` stay **byte-unchanged**, which is what keeps Requirement 10.13's "otherwise unamended" verifiable rather than merely asserted
    - The note goes on `Status` and not in `Context` or `Consequences` because those two fields are the historical record of a decision made on 2026-08-04, and rewriting them would falsify what was decided then. `Status` is the field that legitimately carries later qualification, and the file already uses it that way — ADR-20260805-04's status line carries its own supersession note (design 9.6)
    - This sub-task and 20.1 are the **only** two edits this feature makes to `architecture/DECISIONS.md`, per Requirement 6.3
    - _Requirements: 6.3, 10.13_

  - [x] 20.3 Add the register section to `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md`
    - Carry across the third schema section drafted in the design's Documentation Edits, written as the answer to a question that will be asked again, so it leads with the answer: **two registers, and the second one is Taglish**
    - Cover Requirements 10.2 through 10.6 and 10.14: the `*_fil` columns hold deliberately code-switched Filipino carrying English clinical terms, with the V2 and v1 wording evidence (10.2); this is a naming correction over content that already exists, and the document already asked for a "Common Filipino/Taglish name" in `condition_name_fil` (10.3); the `taglish` member of `CdsPatientEducationPayload.language` denotes model-generated output with no corpus backing and is not reviewed retrievable content (10.4); a third stored register would require a `contracts/openapi.yaml` change that Requirement 7.15 forbids, on top of 120 new clinical strings, a fresh sign-off, an ADR-20260804-01 amendment, `BilingualText` becoming a triple, six new columns, and a three-way toggle (10.5); the Retired_Taglish_Paths are unrelated to the corpus, naming `validLang` in `backend/src/handlers/cds.ts` and `patientEducation.taglish[]` in `backend/src/lib/cds/solver-content.ts` documented in `architecture/AI_INFERENCE.md`, neither corpus-backed nor reachable from `findPatientEducationForDiagnosis` (10.6); and `language: 'bilingual'` denoting exactly the English register and the Taglish register (10.14)
    - Add the stored-identifier paragraph: the section tag value, the six `*_fil` column names, `BilingualText.filipino`, and the ingest script's required-column list all keep the name `filipino`, only the displayed toggle label reads `Taglish`, and the reason is recorded in `ADR-20260824-01`
    - Add the **10.15 follow-up**: `groundingPassagesFor` in `backend/src/lib/cds/patient-education.ts` labels its Filipino grounding passages `(FIL):`; that label is model-facing rather than patient-facing, the file is frozen by Requirement 2.7, and it is recorded here rather than changed
    - Do not touch the 18-column table, the character limits, or the ingest rules
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.14, 10.15_

  - [x] 20.4 Assert the governance change set is exactly two edits
    - **Property 32: The governance change set is exactly two edits** — **Validates: Requirements 6.3, 10.12, 10.13**
    - `git diff architecture/DECISIONS.md` must show exactly two changes: one appended `### ADR-20260824-01` block, and one modified `Status` line on ADR-20260804-01. No other line of that file added, removed, or modified
    - Assert specifically that ADR-20260804-01's `Context`, `Decision`, `Alternatives considered`, `Consequences`, and `Related files` are byte-unchanged. A modified-line count of one on that entry is the check; a hunk touching any other field fails the property
    - Assert no other ADR entry appears in the diff at all
    - _Requirements: 6.3, 10.12, 10.13_

- [x] 21. Final register-scope assertion

  - [x] 21.1 Assert that no third register entered by any route, and that the contract's register vocabulary is unchanged
    - **Property 28: No third register is introduced anywhere in the change set** — **Validates: Requirements 10.1, 10.7, 10.17**
    - Check every register-bearing surface across the whole change set: the CSV header is the same 18 `CORE_COLUMNS` with **no `*_tgl` member**; `REQUIRED_COLUMNS`, `CHAR_LIMITS`, and `EXT_CONSTANTS` gain **no key**; `PatientEducationArticle` and `BilingualText` gain **no field**; `CdsPatientEducationSection.language` gains **no enum member**; the frontend `type Language` union has **exactly two members**; every `bilingual` payload either generation path publishes carries exactly two distinct section `language` values; and no added line in any changed file introduces a `taglish`-tagged stored register or **renames any existing `filipino` identifier**
    - **Property 31: The contract's register vocabulary is unchanged, not merely the file** — **Validates: Requirements 10.11, 7.15**
    - Assert **both halves**, because each catches what the other misses: `contracts/openapi.yaml` and the generated contract types are **byte-unmodified**, *and* independently of the file diff, `CdsPatientEducationSection.language` enumerates exactly `[english, filipino]` and `CdsPatientEducationPayload.language` exactly `[english, taglish, bilingual]` — same members, same order, nothing added, removed, or reordered. A regenerated-then-reverted file passes the byte check while a hand-edited enum passes neither, so one assertion alone is not the bound
    - Assert Requirement 10.17 explicitly as the closing statement: no third register, no `taglish` member on the Section_Language_Tag, no `*_tgl` column, and no rename of any existing `filipino` identifier — and record any proposal that would introduce one as out of scope rather than implementing it
    - Repository-only. Change-set greps and source assertions, no AWS call, no new environment mutation, and no new test harness
    - _Requirements: 10.1, 10.7, 10.11, 10.17, 7.15_

## Notes

- Tasks marked with `*` are optional, and only genuine hardening carries the marker: 1.4 (generated-input checks on the two unbounded Python helpers), 7.5 (byte-level idempotence confirmation of what 7.2 already exercises), and 13.9 (zero-sends proof for a dry run whose real recorded output is already the primary evidence). Skipping any of the three weakens no freeze proof, no zero-blocker claim, and no Splice property.
- Task 7.6 is **not** optional. It is the only task that verifies Requirements 3.3, 3.4, and 5.3, which are negative assertions about the gate that a passing zero-blocker build cannot demonstrate. It stays sandboxed in a temp directory, so requiring it mutates no tracked file.
- **Two hard gates, neither optional and neither skippable.** Task 11.3 is the written acknowledgement that decision 6.7(a) narrows an existing safety guard, and task 12.6 must not start without it. Task 16.3 is the point-of-action authorization stop, and tasks 16.4 and 16.5 are unreachable without it. A graph-driven executor must honour both even though they produce no file diff of their own.
- The vitest/fast-check suite **is** extended, correcting an earlier claim in this plan that it would not be. Task 13 covers the Splice, which is TypeScript, is a pure function over an unbounded input domain (any model candidate crossed with any article), and decides what a patient reads. The corpus half stays Python-verified because its domain is a fixed 24-record population where `verify`, `freeze`, the validator run, and the report diff are exhaustive and randomized generation would test generators rather than the corpus.
- Tasks 2.1, 2.2, and 2.3 run before any tracked file is modified. If either fails, the correct outcome is a content conversation, not a revert of a half-written corpus.
- Tasks 11.1 and 11.2 are failing-test-first on purpose. Both reproduce defects the design found by executing shipped code, and both must be red before task 12 makes them green.
- **The only environment mutation in this plan is the `dev` corpus ingest write pass in task 16.4**, and it is gated by task 16.3's authorization (Requirement 8). Everything else — the whole corpus half, the Splice, the register label, the tests, the documentation — performs zero AWS calls, zero Terraform actions, and zero DynamoDB writes. Task 16.2's dry run issues no AWS request at all; task 16.5's read-back is read-only. `staging` and `prod` corpus ingest are out of scope: no dry run, no write pass, no read-back, and `ALLOW_NON_DEV_CORPUS_INGEST` is not set. A completed `dev` ingest is dev evidence, not staging qualification, canary authorization, or production enablement.
- **`architecture/DECISIONS.md` is amended, by exactly two edits, and this corrects an earlier claim in this plan that it stays unamended.** Design 9.6 and Requirement 6.3 permit precisely two: task 20.1 appends `ADR-20260824-01`, and task 20.2 appends a register cross-reference clause to ADR-20260804-01's `Status` line. What still does not change is that entry's `Context`, `Decision`, `Alternatives considered`, `Consequences`, and `Related files` — the keyed-ICD-10 retrieval design, the bilingual approval condition, the citation requirement, the admin-only CSV ingest, and the no-embeddings position all stand as written, and the bilingual condition is satisfied by two registers rather than three. Task 20.4's Property 32 is the bound: any third edit fails it.
- **`frontend/` is no longer wholly out of scope, and this corrects the earlier claim that it is untouched.** Exactly two files are in: `PatientEducationCard.tsx` and `PatientEducationCard.test.tsx`, and only their displayed text and the assertions matching it (design 9.4, Requirement 10.16). Everything else under `frontend/` stays out, including `frontend/.../lib/api/patientEducation.ts`, which needs no change because its five `filipino` occurrences are identifiers and contract field names and it renders no register name. Property 30 is what keeps that boundary checkable.
- `contracts/openapi.yaml` and the generated contract types stay unmodified — the contract already permits every field the Splice publishes, and it already fixes the register vocabulary the label change deliberately does not touch. Property 31 asserts the enum **members** as well as the file bytes, because a regenerated-then-reverted file passes only one of those checks.
- **The register label and the identifier deliberately disagree, and that is the design's decision rather than an oversight.** A patient reads `Taglish`; the code compares `filipino`. Four places carry the mapping so the next reader finds it instead of "fixing the inconsistency": the doc comment above `type Language` (task 19.1), the Schema_Document register section (task 20.3), `ADR-20260824-01` (task 20.1), and Property 29 (task 19.3), which fails if anyone unifies the two in either direction.
- **Design 9.1 moved a number that task 11.2 reproduces.** The post-merge `PATIENT_EDUCATION_MEDICATION` count is **2** payload-reaching `prescription` occurrences, not 3, because V2's PE-001 `Gawin ngayon` replaces `doctor-approved Plan o prescription` with `plano o reseta ni Doc`, taking the word out of J06.9's `self_care_fil`. Expect 3 against the **v1** corpus and 2 against **v2**. The count moved; the decision did not — J06.9 still trips on frozen `self_care_en` and I10 still trips on `self_care_fil`, so both articles still trip the guard and task 11.3's scoping acknowledgement remains required and load-bearing.
- **Tasks 19-21 add no optional sub-task.** All nine leaves are required: two file edits, two property-test sub-tasks, one gate run, three documentation and governance edits, and one closing assertion.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.5", "1.4"] },
    { "id": 4, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2"] },
    { "id": 7, "tasks": ["5.1"] },
    { "id": 8, "tasks": ["5.2"] },
    { "id": 9, "tasks": ["7.1", "7.2"] },
    { "id": 10, "tasks": ["7.3", "7.4", "7.5", "7.6"] },
    { "id": 11, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 12, "tasks": ["8.4"] },
    { "id": 13, "tasks": ["9.1"] },
    { "id": 14, "tasks": ["11.1", "14.1"] },
    { "id": 15, "tasks": ["11.2"] },
    { "id": 16, "tasks": ["11.3"] },
    { "id": 17, "tasks": ["12.1"] },
    { "id": 18, "tasks": ["12.2"] },
    { "id": 19, "tasks": ["12.3"] },
    { "id": 20, "tasks": ["12.4"] },
    { "id": 21, "tasks": ["12.5"] },
    { "id": 22, "tasks": ["12.6"] },
    { "id": 23, "tasks": ["12.7"] },
    { "id": 24, "tasks": ["13.1", "13.7"] },
    { "id": 25, "tasks": ["13.2", "13.8"] },
    { "id": 26, "tasks": ["13.3"] },
    { "id": 27, "tasks": ["13.4"] },
    { "id": 28, "tasks": ["13.5"] },
    { "id": 29, "tasks": ["13.6"] },
    { "id": 30, "tasks": ["13.9"] },
    { "id": 31, "tasks": ["15.1"] },
    { "id": 32, "tasks": ["16.1"] },
    { "id": 33, "tasks": ["16.2"] },
    { "id": 34, "tasks": ["16.3"] },
    { "id": 35, "tasks": ["16.4"] },
    { "id": 36, "tasks": ["16.5"] },
    { "id": 37, "tasks": ["17.1"] },
    { "id": 38, "tasks": ["17.2"] },
    { "id": 39, "tasks": ["18.1"] },
    { "id": 40, "tasks": ["18.2"] },
    { "id": 41, "tasks": ["19.1", "19.2"] },
    { "id": 42, "tasks": ["19.3"] },
    { "id": 43, "tasks": ["19.4"] },
    { "id": 44, "tasks": ["20.1"] },
    { "id": 45, "tasks": ["20.2"] },
    { "id": 46, "tasks": ["20.3"] },
    { "id": 47, "tasks": ["20.4"] },
    { "id": 48, "tasks": ["21.1"] }
  ]
}
```

### Why the new waves are shaped this way

- **Waves 17-23 are one sub-task each** because `12.1` through `12.6` all edit `backend/src/lib/cds/protected-output-adapters.ts`. Same file, so no two may run in parallel. `12.7` follows because it consumes both the exported headings constant from `12.1` and the context type from `12.2`.
- **Waves 24-30 are one adapter-test sub-task each** for the same reason: `13.1` through `13.6` and `13.9` all edit `protected-output-adapters.test.ts`. `13.7` (`patient-education.test.ts`) and `13.8` (`released-patient-education.test.ts`) touch different files, so they ride along in waves 24 and 25.
- **`14.1` sits in wave 14** because the `cds-demo-readiness.ts` hint fix is independent of the Splice; it is scheduled early so the ingest in task 16 never runs while the printed remediation still says `v1`.
- **`17.1` and `17.2` are separate waves** because both edit `PATIENT_EDUCATION_CORPUS_SCHEMA.md`, which `8.1` also edits in wave 11. Three writers, three waves.
- **Waves 32-36 are strictly sequential** because the ingest is a procedure, not a set: derived-set equality establishes the expected keys, the dry run decides whether a write is permissible, the authorization stop decides whether it is allowed, the write pass mutates, and the read-back verifies.
- **`19.1` and `19.2` share wave 41** because they write different files — the component and its test — and neither reads the other's output. This is the only shared wave in the register half.
- **`19.3` is its own wave (42)** because the Property 29 and 30 coverage lands in `PatientEducationCard.test.tsx`, which `19.2` also writes. Same file, so no parallelism. `19.4` follows at wave 43 because running the gate is only meaningful once both the edit and its assertions exist.
- **`20.1` and `20.2` must not share a wave** (44 and 45) because both write `architecture/DECISIONS.md`. They are also genuinely ordered: the cross-reference note in `20.2` names the id that `20.1` establishes, so a parallel run could cite an id that the other wave then took.
- **`20.3` is its own wave (46)** because it writes `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md`, which `8.1` (wave 11), `17.1` (wave 37), and `17.2` (wave 38) also write. Four writers, four waves. It also cites the ADR id, so it follows `20.1`.
- **`20.4` at wave 47 and `21.1` at wave 48 are read-only assertions** and write no file, but both are sequenced after the work they bound: `20.4` reads the `DECISIONS.md` diff that waves 44 and 45 produce, and `21.1` closes the feature over the complete change set, so it runs after every other leaf including the register half. Neither introduces a new test harness.

### Gates and checkpoints the graph does not list

The waves contain leaf sub-tasks only, so the checkpoints are absent from the JSON. All of the following are load-bearing and a graph-driven executor MUST honor them anyway:

- **Checkpoint 6 — "transcription verified before any artifact is regenerated"** runs **between wave 8 (`5.2`) and wave 9 (`7.1`, `7.2`)**. It is the last gate before any generated artifact is written; passing wave 8 straight into wave 9 would regenerate the v2 CSV, extended JSON, and validation report from a transcription whose `verify` result and 120-line diff were never reviewed.
- **Checkpoint 10 — the corpus definition-of-done state** runs **after wave 13 (`9.1`)**, once the corpus scope-boundary review has completed.
- **Task 11.3 — the 6.7(a) acknowledgement — is a hard gate at wave 16.** It produces no file diff, so an executor that schedules purely on file conflicts will be tempted to skip it. It must not. Wave 22 (`12.6`) implements a **narrowing of an existing safety guard**, and the acknowledgement is the record that the narrowing was a decision rather than a convenience. No acknowledgement, no `12.6`.
- **Task 16.3 — the point-of-action authorization stop — is a hard gate at wave 34.** Waves 35 and 36 (`16.4`, `16.5`) are the only environment mutation and the only environment read in this plan, and both are unreachable without a current, unused, operation-specific authorization bound to this operation, this table, `dev`, and one window. If it is missing, expired, already used, or mismatched: zero mutation, record `DEFER` with the specific mismatch, and treat the repository work as complete. **`DEFER` at wave 34 is a valid terminal state for waves 35 and 36** — an executor must not retry, escalate, narrow the operation, or route around it.

Wave 4 additionally holds `2.3`, the pre-modification baseline capture. Every wave from 5 onward assumes it has already run, since `4.1` (`apply`) is the first task that modifies a tracked file and the capture is worthless afterwards.

The register half (waves 41-48) adds **no new gate**. It performs no environment mutation, needs no authorization, and depends on no build output, so an executor may run it independently of the ingest outcome — including after a recorded `DEFER` at wave 34. What it does depend on is order within itself, which the wave shape above already encodes.
