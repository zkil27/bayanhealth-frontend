# Requirements Document

## Introduction

Version 2 of the Patient Education Corpus (`architecture/BayanHealth_Patient_Education_Corpus_V2_Corpus_Only_Linked.docx`) is a Filipino-only rewrite of the same 24 conditions already shipped in V1. It exists because the V1 Filipino columns read as translated clinical prose rather than as language a patient would use. V2 corrects that register while carrying the same clinical meaning, the same card identifiers (PE-001 through PE-024), and the same clinical sign-off (Marco Paolo Perpetua, General Physician, 2026-08-06).

This feature merges V2's Filipino content into the existing corpus by replacing the six `*_fil` content columns in place, emitting the result as a new set of v2 repository artifacts, and finishing on a validation run with zero blockers. The strict 18-column schema, the `PatientEducationArticle` type, the ingest script, and `groundingPassagesFor` are unchanged. English clinical text is frozen. ADR-20260804-01 is unamended.

Two mechanical facts shape the work. First, `architecture/build_corpus.py` writes to a hardcoded `OUT = "/mnt/user-data/outputs"` and emits v1-named files, so it cannot regenerate v2 artifacts in place without change. Second, the reviewer/date situation is narrower than first assumed: verification against `architecture/corpus_data.py` confirmed all 24 `RECORDS` entries already carry the real reviewer and `2026-08-06`, and `PENDING_REVIEWER`/`PENDING_DATE` survive only as validator sentinels. Regenerating therefore does not reintroduce `NO_REVIEWER`/`NO_REVIEW_DATE`, and this requirement set treats reviewer provenance as a verification obligation rather than a repair.

Dev re-ingest is out of scope. It is a separate environment mutation requiring its own point-of-action authorization.

### Approved scope expansion

The boundary stated in the preceding paragraph has been deliberately moved. The corpus-only scope produced a correct repository artifact that changed nothing a patient could read, for two reasons established by reading the runtime code.

First, nothing at runtime reads the CSV. `findPatientEducationForDiagnosis` in `backend/src/lib/cds/patient-education.ts` reads `app_core` only, and `backend/scripts/ingest-patient-education-corpus.ts` is the sole bridge from artifact to runtime. Until that script runs, a v2 artifact is a file.

Second, even after ingest, the reviewed Filipino only survives on one of the two generation paths. `backend/src/lib/cds/protected-generation.ts` branches for `outputType === 'patient_education'`. The Deterministic_Template_Path emits corpus text verbatim: `language: 'bilingual'`, `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, sections tagged `english` or `filipino`, and `warningSigns` as the two reviewed red-flag strings. The Model_Path does not: `groundingPassagesFor` feeds the article into a prompt, and `validatePatientEducation` in `backend/src/lib/cds/protected-output-adapters.ts` accepts only `closedObject(['title','language','sections','warningSigns'])` with `language` restricted to `english` or `taglish` — no Filipino-labelled section, no `corpusVersion`, no citation. The reviewed register correction is rephrased away by the model on the success path, and reaches a patient verbatim only when the provider fails, times out, or a gate trips. That inversion — approved wording surviving only on the failure path — is the defect Requirement 7 fixes.

The fix needs no contract work. `contracts/openapi.yaml` already defines `CdsPatientEducationPayload.language` as the enum `[english, taglish, bilingual]` with `titleFilipino`, `icd10Code`, `citation`, and `corpusVersion`, and `CdsPatientEducationSection.language` as `[english, filipino]`. The validator is narrower than the contract it serves. No contract change and no generated-type regeneration are in scope.

Requirements 7 through 9 therefore extend this feature from artifact to screen: splice the reviewed Filipino into the Model_Path output (Requirement 7), ingest the v2 artifact into `dev` under its own point-of-action authorization (Requirement 8), and state rather than assume that already-released education is immutable (Requirement 9). Staging and prod ingest remain out of scope.

#### The register question: two registers, and the second one is Taglish

A question was raised about whether the corpus offers English, Tagalog, and Taglish. It does not, and Requirement 10 states that it will not be made to. The corpus carries exactly two registers, `*_en` and `*_fil`, and the second one is misnamed rather than missing.

The V2 content settles this on inspection. V2 writes "may chest pain", "Sundin lang ang medicines na nasa plano o reseta ni Doc", "Trabaho at safety", and "prescription" — Filipino syntax carrying English clinical nouns. That is Taglish in practice, not Tagalog, and it is deliberate: it is what a Filipino patient actually reads. The Schema_Document already asks for a "Common Filipino/Taglish name" in `condition_name_fil`, so the ambiguity predates V2. Requirement 10 is therefore a naming correction over content that already exists, not a request for new content.

Three separate `taglish` sightings in the codebase are unrelated to the corpus and must not be mistaken for a third register. `CdsPatientEducationPayload.language` in `contracts/openapi.yaml` admits `taglish` as a payload-level value describing model-authored output with no corpus backing — not reviewed retrievable content. `backend/src/handlers/cds.ts` carries `validLang = ['english', 'taglish']` for the terminally retired patient-cards path. `architecture/AI_INFERENCE.md` documents `patientEducation.taglish[]` in the solver content store (`backend/src/lib/cds/solver-content.ts`), keyed by solver id and reachable only from the retired `handlePatientCards` per ADR-20260806-03. None of the three is the corpus. The one place a stored register is tagged, `CdsPatientEducationSection.language`, admits only `[english, filipino]`, so adding a third stored register would require a contract change — which Requirement 7.15 already forbids.

Scope is therefore documentation plus one patient-facing label. Every identifier stays: the `filipino` section-tag value, the `*_fil` column names, `BilingualText.filipino`, the Ingest_Script's `REQUIRED_COLUMNS`, and the contract. What changes is what a patient sees on the Patient_Education_Card toggle — `Taglish` instead of `Filipino` — and the documentation that names the register honestly. ADR-20260804-01's bilingual approval condition is satisfied by two registers, not three, and remains in force; the register clarification is recorded in a new dated ADR, which is the first and only amendment this feature makes to `architecture/DECISIONS.md` and the reason Requirement 6.3 is now narrower than a flat freeze.

## Glossary

- **Corpus_Source_Module**: `architecture/corpus_data.py` — the Python module holding `RECORDS`, `CORE_COLUMNS`, `REQUIRED_COLUMNS`, `CHAR_LIMITS`, `EXT_CONSTANTS`, `PENDING_REVIEWER`, and `PENDING_DATE`. The single editable source of corpus content.
- **Corpus_Build_Script**: `architecture/build_corpus.py` — the script that validates `RECORDS` and emits the CSV, the extended JSON, and the validation report. It is the regeneration gate, not a one-off tool.
- **Corpus_Validator**: the rule-evaluation stage inside the Corpus_Build_Script that classifies findings as blockers, warnings, or info.
- **V2_Document**: `architecture/BayanHealth_Patient_Education_Corpus_V2_Corpus_Only_Linked.docx` — the Filipino-only V2 source, one card per condition.
- **V2_Card**: one condition's entry in the V2_Document, identified PE-001 through PE-024.
- **Filipino_Content_Columns**: the six schema columns `explanation_fil`, `what_to_expect_fil`, `self_care_fil`, `red_flags_fil`, `followup_fil`, and `condition_name_fil`.
- **Filipino_Replaced_Columns**: the five Filipino_Content_Columns whose values are replaced from V2: `explanation_fil`, `what_to_expect_fil`, `self_care_fil`, `red_flags_fil`, `followup_fil`.
- **English_Columns**: `condition_name_en`, `explanation_en`, `what_to_expect_en`, `self_care_en`, `red_flags_en`, `followup_en`.
- **Provenance_Columns**: `icd10_code`, `icd10_code_alt`, `source`, `reviewed_by`, `review_date`, `notes`.
- **Section_Mapping**: the fixed correspondence from V2_Card section heading to schema column — `Sa madaling sabi` → `explanation_fil`, `Ano ang aasahan` → `what_to_expect_fil`, `Gawin ngayon` → `self_care_fil`, `Magpatingin agad ngayon` → `red_flags_fil`, `Babalik o magme-message kapag` → `followup_fil`.
- **Unmapped_V2_Sections**: V2_Card content with no destination column under the Section_Mapping — the `[[preferred_name]]` greeting line, the `Trabaho at safety` section, the `[[followup_due_at]]` 1-to-4 reply scale, and the closing teach-back question.
- **Placeholder_Token**: any substring delimited by `[[` and `]]`, for example `[[preferred_name]]`.
- **V2_Artifacts**: `architecture/patient_education_corpus_v2.csv` and `architecture/patient_education_extended_v2.json`.
- **V1_Artifacts**: `architecture/patient_education_corpus_v1.csv` and `architecture/patient_education_extended_v1.json`.
- **Validation_Report**: `architecture/corpus_validation_report.md`.
- **Schema_Document**: `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md`.
- **Warning_Baseline**: the verified shipped Validation_Report state of 24 rows, 0 blockers, and 50 warnings, decomposing as 24 `NO_PH_SOURCE` findings plus 26 `LONG_SENTENCES` findings. The 26 `LONG_SENTENCES` findings comprise 22 on `red_flags_en` and 4 on `self_care_en`, distributed across 22 rows, of which 4 rows carry two findings each.
- **Blocker**: a Corpus_Validator finding that marks a row as never shown to a patient. Codes relevant to Filipino-side edits are `OVER_LIMIT`, `VAGUE_RED_FLAG`, `BRAND_NAME`, `POSSIBLE_PII`, `PLACEHOLDER_IN_CONTENT`, and `REQUIRED_EMPTY`.
- **Ingest_Script**: `backend/scripts/ingest-patient-education-corpus.ts` — the only code path that moves corpus rows from a repository artifact into `app_core`. Supports `--dry-run` and `--corpus-version`, refuses any environment other than `dev` unless `ALLOW_NON_DEV_CORPUS_INGEST=true`, rejects a row rather than partially writing it, and exits non-zero on any rejection.
- **Keyed_Lookup**: `findPatientEducationForDiagnosis` in `backend/src/lib/cds/patient-education.ts` — the ICD-10-keyed retrieval used by the CDS pipeline. Reads `app_core` only and never reads a repository artifact.
- **Article_Keys**: the `app_core` items written by the Ingest_Script — `EntityType.PatientEducation` at `PATIENT_EDU#<ICD10>` / `APPROVED`, and `EntityType.PatientEducationAlias` at `PATIENT_EDU#ALIAS#<normalized>` / `APPROVED`, both carrying `Ttl.PatientEducation` of one year.
- **Alias_Keys**: the subset of Article_Keys of type `EntityType.PatientEducationAlias`, derived by `aliasKeysFor` from the condition-name columns.
- **Approved_Article**: a `PatientEducationArticle` returned by the Keyed_Lookup for a confirmed diagnosis — an article present in `app_core` at `APPROVED` status.
- **Reviewed_Filipino**: the Filipino text carried by an Approved_Article in the Filipino_Content_Columns, as clinically reviewed and signed off in the V2_Document.
- **Protected_Generation**: `backend/src/lib/cds/protected-generation.ts` — the gated generation module that dispatches on `outputType`, including `patient_education`.
- **Deterministic_Template_Path**: the `patientEducationTemplate(article)` branch of Protected_Generation. Emits `components['schemas']['CdsPatientEducationPayload']` with `language: 'bilingual'`, `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, sections tagged `language: 'english' | 'filipino'`, and `warningSigns: [redFlags.english, redFlags.filipino]`. Corpus text is emitted verbatim.
- **Model_Path**: the Together.ai inference branch of Protected_Generation for `patient_education`, prompted with the passages returned by `groundingPassagesFor(education)`.
- **Output_Validator**: `validatePatientEducation` in `backend/src/lib/cds/protected-output-adapters.ts` — the schema gate applied to Model_Path output. Currently `closedObject(['title','language','sections','warningSigns'])` with `language` restricted to `english` or `taglish`.
- **Splice**: the mechanism introduced by Requirement 7 that composes a published patient-education payload from model-authored English sections and Approved_Article-supplied Filipino sections, titles, warning signs, citation, and corpus version.
- **Released_Artifact**: a patient-education artifact already published to a patient, served by `toReleasedArtifact` in `backend/src/lib/cds/released-patient-education.ts` from a stored `payload` captured at release time.
- **Taglish_Register**: the second of the corpus's two registers — code-switched Filipino carrying English clinical terms, stored in the Filipino_Content_Columns and tagged `filipino`. Named Taglish because that is what the reviewed content is: V2 writes "may chest pain", "Sundin lang ang medicines na nasa plano o reseta ni Doc", and "prescription". The name describes the content; the stored identifier remains `filipino`.
- **English_Register**: the first of the corpus's two registers — the frozen English clinical text in the English_Columns, tagged `english`.
- **Corpus_Registers**: the complete set of registers the corpus carries — exactly the English_Register and the Taglish_Register. No third register exists and none is added by this feature.
- **Section_Language_Tag**: the `language` field of `CdsPatientEducationSection` in `contracts/openapi.yaml`, whose enum is exactly `[english, filipino]`. The only place a stored register is tagged, and therefore the reason a third stored register would require a contract change.
- **Payload_Language_Value**: the `language` field of `CdsPatientEducationPayload` in `contracts/openapi.yaml`, whose enum is `[english, taglish, bilingual]`. Its `taglish` member denotes model-authored output with no corpus backing and is not reviewed retrievable content; its `bilingual` member denotes a payload carrying both Corpus_Registers.
- **Retired_Taglish_Paths**: the three `taglish` occurrences unrelated to the corpus — `validLang = ['english', 'taglish']` in `backend/src/handlers/cds.ts` for the terminally retired patient-cards path, and `patientEducation.taglish[]` in the solver content store `backend/src/lib/cds/solver-content.ts`, documented in `architecture/AI_INFERENCE.md`, keyed by solver id and reachable only from the retired `handlePatientCards` per ADR-20260806-03. None is corpus-backed and none is modified by this feature.
- **Patient_Education_Card**: `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.tsx` — the patient-facing surface shipped by ADR-20260809-01. Carries a reading-language toggle over the two Corpus_Registers, an internal `type Language = "english" | "filipino"`, a toggle label rendered from `option === "filipino" ? "Filipino" : "English"`, and an unavailable-register string reading `Not available in {…} yet`. Its test file is `PatientEducationCard.test.tsx`, which asserts on `/^Filipino$/`.
- **Register_Label**: the displayed text of the Patient_Education_Card toggle and of its unavailable-register string. Distinct from the internal enum value, which stays `filipino`.
- **Register_Clarification_ADR**: the new dated ADR added to `architecture/DECISIONS.md` by Requirement 10 recording that the corpus carries two registers, that the second is Taglish, and that no third register is added.
- **Point_Of_Action_Authorization**: a current, unused, operation-specific authorization bound to one operation, one target, one environment, and one window, required before any environment mutation.
- **DEFER**: the recorded outcome when a required Point_Of_Action_Authorization is missing, expired, already used, or mismatched to the operation, target, environment, or window — accompanied by the specific mismatch and zero mutation.

## Requirements

### Requirement 1: Filipino content replacement

**User Story:** As the clinical author of record, I want the corpus Filipino columns to carry V2's plainer wording, so that a patient reads guidance in language they actually use instead of translated clinical prose.

#### Acceptance Criteria

1. THE Corpus_Source_Module SHALL contain 24 `RECORDS` entries, one per condition present in V1.
2. WHEN a V2_Card section heading matches an entry in the Section_Mapping, THE Corpus_Source_Module SHALL carry that section's transcribed text in the mapped Filipino_Replaced_Column of the record whose card identifier matches that V2_Card.
3. THE Corpus_Source_Module SHALL preserve each record's existing `condition_name_fil` value byte-for-byte as shipped in V1.
4. WHERE a V2_Card contains an Unmapped_V2_Section, THE Corpus_Source_Module SHALL omit that section's text from every schema column.
5. THE Corpus_Source_Module SHALL derive each Filipino_Replaced_Column value from the V2_Card for the matching condition only, with no text carried across conditions.
6. IF a V2_Card omits the `Babalik o magme-message kapag` section, THEN THE Corpus_Source_Module SHALL leave that record's `followup_fil` value empty, which the schema permits as an optional column.
7. THE V2_Artifacts SHALL contain 24 data rows keyed by the same 24 `icd10_code` values present in the V1_Artifacts.

### Requirement 2: English and provenance freeze

**User Story:** As the approving physician, I want the approved English clinical text and sign-off untouched, so that merging a Filipino rewrite cannot silently alter content I already approved.

#### Acceptance Criteria

1. THE Corpus_Source_Module SHALL preserve every English_Columns value byte-for-byte as shipped in the V1_Artifacts.
2. THE Corpus_Source_Module SHALL preserve every Provenance_Columns value byte-for-byte as shipped in the V1_Artifacts.
3. THE V2_Artifacts SHALL carry `reviewed_by` equal to `Marco Paolo Perpetua, General Physician` and `review_date` equal to `2026-08-06` on all 24 rows.
4. THE Corpus_Source_Module SHALL retain the `PENDING_REVIEWER` and `PENDING_DATE` constants so the Corpus_Validator continues to detect unfilled controlled blanks.
5. THE V2_Artifacts SHALL carry an empty `icd10_code_alt` value on all 24 rows, confirming that V2's ICD-10 alternate-code corrections are already applied.
6. THE Schema_Document SHALL retain its existing 18-column set with no column added, removed, renamed, or re-limited.
7. THE `PatientEducationArticle` type, the corpus ingest script, and `groundingPassagesFor` SHALL remain unmodified by this feature.

### Requirement 3: Placeholder exclusion

**User Story:** As the engineer who owns the retrieval path, I want no template placeholder to survive into corpus content, so that a patient never sees an unresolved slot and the existing blocker keeps working as a real gate.

#### Acceptance Criteria

1. WHEN transcribing a V2_Card line that contains a Placeholder_Token, THE Corpus_Source_Module SHALL exclude that line from every schema column.
2. THE Corpus_Source_Module SHALL contain zero Placeholder_Token occurrences across all `RECORDS` field values.
3. THE Corpus_Validator SHALL continue to raise `PLACEHOLDER_IN_CONTENT` as a Blocker for any column other than `reviewed_by` and `review_date` that contains `[[`, with no exemption, whitelist, or severity downgrade introduced.
4. IF a transcribed value would contain a Placeholder_Token, THEN THE Corpus_Validator SHALL report a `PLACEHOLDER_IN_CONTENT` Blocker and THE Corpus_Build_Script SHALL report a non-zero blocker count.

### Requirement 4: In-place v2 regeneration

**User Story:** As the sole engineer, I want the build script to regenerate v2 artifacts into the repository, so that regeneration is reproducible from the checkout instead of depending on an external output directory.

#### Acceptance Criteria

1. THE Corpus_Build_Script SHALL write its output files into the `architecture/` directory of the current checkout.
2. THE Corpus_Build_Script SHALL emit `architecture/patient_education_corpus_v2.csv` as a UTF-8 CSV with the 18 `CORE_COLUMNS` as its header row, every field quoted.
3. THE Corpus_Build_Script SHALL emit `architecture/patient_education_extended_v2.json` as UTF-8 JSON keyed by `icd10_code`.
4. THE Corpus_Build_Script SHALL overwrite the Validation_Report at `architecture/corpus_validation_report.md` on each run.
5. THE Corpus_Build_Script SHALL leave both V1_Artifacts present and unmodified on disk so a side-by-side diff remains possible.
6. WHEN the Corpus_Build_Script completes, THE Corpus_Build_Script SHALL print the row count, blocker count, and warning count to standard output.
7. THE Corpus_Build_Script SHALL run to completion without a Python traceback on a checkout where no `/mnt/user-data/outputs` path exists.

### Requirement 5: Zero-blocker validation outcome

**User Story:** As the engineer accountable for what reaches a patient, I want the merged corpus to clear every hard rule, so that all 24 conditions stay exportable rather than silently losing patient education.

#### Acceptance Criteria

1. WHEN the Corpus_Build_Script runs against the merged Corpus_Source_Module, THE Corpus_Validator SHALL report 0 blockers and 24 rows clearing every hard rule.
2. THE Corpus_Validator SHALL report each Filipino_Replaced_Column value as within its `CHAR_LIMITS` bound — 1500 for `explanation_fil` and `self_care_fil`, 1000 for `what_to_expect_fil` and `red_flags_fil`, 500 for `followup_fil`.
3. IF a Filipino_Replaced_Column value exceeds its `CHAR_LIMITS` bound, THEN THE Corpus_Validator SHALL report an `OVER_LIMIT` Blocker naming the column, its character count, and its limit.
4. THE Corpus_Validator SHALL report zero `VAGUE_RED_FLAG`, `BRAND_NAME`, `POSSIBLE_PII`, and `REQUIRED_EMPTY` Blockers.
5. THE Validation_Report SHALL record a warning set drawn only from the `NO_PH_SOURCE` and `LONG_SENTENCES` codes present in the Warning_Baseline.
6. WHERE the regenerated warning count differs from the Warning_Baseline count of 50, THE Validation_Report SHALL be accompanied by a written account of each added or removed warning.
7. THE Corpus_Validator SHALL report a set of `LONG_SENTENCES` findings equal as a multiset, matched on `icd10_code` and column name, to the `LONG_SENTENCES` findings recorded in the Warning_Baseline, since `LONG_SENTENCES` is evaluated on English text only.

### Requirement 6: Documentation and scope boundary

**User Story:** As the next person to read this repository, I want the v2 merge recorded and its boundaries stated, so that nobody mistakes a repository artifact change for a deployed corpus change.

#### Acceptance Criteria

1. THE Schema_Document SHALL record that the Filipino columns were replaced from the V2_Document, that the English columns are frozen at their V1-approved text, and that the bilingual pair is accepted as approximate rather than parallel.
2. THE Schema_Document SHALL record that the V2_Document carries the same sign-off as V1, so no new review date applies.
3. THE feature SHALL confine its amendments to `architecture/DECISIONS.md` to exactly two edits — appending the Register_Clarification_ADR defined in Requirement 10, and adding a cross-reference note on ADR-20260804-01 pointing at it — leaving every other entry, and ADR-20260804-01's decision, context, consequences, and bilingual approval condition, unamended and in force as written.
4. THE feature SHALL confine every AWS mutation to the authorization-gated `dev` corpus ingest defined in Requirement 8, and SHALL perform zero corpus ingest into `staging` or `prod`.
5. THE feature SHALL record as follow-up work, without fixing it, that `backend/src/tools/cds-demo-readiness.ts` hardcodes a remediation hint referencing `../architecture/patient_education_corpus_v1.csv --corpus-version v1`, which becomes stale once the V2_Artifacts land.
6. WHERE a validation finding falls outside the corpus artifacts named in this document, THE feature SHALL record that finding as follow-up work rather than changing the affected subsystem.
7. THE Schema_Document SHALL record that the V2_Document supplies shorter register-simplified Filipino condition titles for 5 of the 24 conditions — PE-005, PE-007, PE-012, PE-015, and PE-023 — and that those retitles are deliberately not adopted, `condition_name_fil` being held at its V1 value on every row per Requirement 1.3.
8. THE Schema_Document SHALL record that the V2_Artifacts change nothing a patient can read until the Ingest_Script writes them into `app_core`, because the Keyed_Lookup reads `app_core` only and no runtime code reads a corpus CSV.
9. THE Schema_Document SHALL record that holding `condition_name_fil` at its V1 value per Requirement 1.3 leaves `aliasKeysFor` output unchanged, so a v2 ingest overwrites the same 24 article keys and the same Alias_Keys with no orphaned alias left behind, and SHALL name this alias stability as the operational payoff of declining the V2 retitles.
10. THE Schema_Document SHALL record that before Requirement 7 the Reviewed_Filipino reached a patient verbatim only through the Deterministic_Template_Path — that is, only on provider failure, provider timeout, or a tripped gate — and that the Splice removes that dependency on the failure path.
11. THE Schema_Document SHALL record that `contracts/openapi.yaml` already permits the bilingual payload shape, so the Output_Validator was narrower than the contract it serves, and that Requirement 7 widens the validator rather than the contract.
### Requirement 7: Reviewed Filipino survives the model path

**User Story:** As the approving physician, I want the Filipino wording I signed off to reach the patient's screen unaltered on the normal success path, so that the reviewed register correction is what a patient reads rather than a model's paraphrase of it.

#### Acceptance Criteria

1. WHERE an Approved_Article exists for the confirmed diagnosis, WHEN the Model_Path produces patient-education output, THE Splice SHALL publish a payload whose `language` field equals `bilingual`.
2. WHERE an Approved_Article exists for the confirmed diagnosis, WHEN the Model_Path produces patient-education output, THE Splice SHALL set `titleFilipino`, `icd10Code`, `citation`, and `corpusVersion` from that Approved_Article.
3. WHERE an Approved_Article exists for the confirmed diagnosis, THE Splice SHALL emit every section carrying `language: 'filipino'` with content byte-equal to that Approved_Article's Reviewed_Filipino value for the corresponding Filipino_Content_Column.
4. WHERE an Approved_Article exists for the confirmed diagnosis, THE Splice SHALL accept model-authored text only for sections carrying `language: 'english'`.
5. WHERE an Approved_Article exists for the confirmed diagnosis, THE Splice SHALL emit `warningSigns` as exactly two entries, byte-equal to that Approved_Article's reviewed English red-flag string and reviewed Filipino red-flag string respectively, in that order.
6. IF an Approved_Article exists for the confirmed diagnosis AND the Model_Path output supplies a warning sign, THEN THE Splice SHALL discard the model-supplied warning sign and publish the two reviewed red-flag strings.
7. IF a candidate payload carries a section tagged `language: 'filipino'` whose content is not byte-equal to the Approved_Article's Reviewed_Filipino value for the corresponding Filipino_Content_Column, THEN THE Output_Validator SHALL reject that payload.
8. IF a candidate payload carries `language: 'bilingual'` while no Approved_Article was retrieved for the confirmed diagnosis, THEN THE Output_Validator SHALL reject that payload.
9. THE Output_Validator SHALL accept a payload whose `language` equals `bilingual` and which carries `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, and sections tagged `language: 'english'` or `language: 'filipino'`, matching the `CdsPatientEducationPayload` and `CdsPatientEducationSection` shapes already defined in `contracts/openapi.yaml`.
10. THE Output_Validator SHALL continue to accept a payload whose `language` equals `english` or `taglish` on the no-article path.
11. WHERE no Approved_Article exists for the confirmed diagnosis, THE Model_Path SHALL publish English sections only, with `language` equal to `english`.
12. WHERE no Approved_Article exists for the confirmed diagnosis, THE Splice SHALL omit `titleFilipino`, `citation`, `corpusVersion`, and every section tagged `language: 'filipino'` from the published payload.
13. IF no Approved_Article exists for the confirmed diagnosis AND the Model_Path output supplies Filipino text or a citation, THEN THE Output_Validator SHALL reject that payload.
14. THE Deterministic_Template_Path SHALL continue to emit the Approved_Article's English and Filipino text verbatim, with the payload shape it produces today unchanged.
15. THE feature SHALL leave `contracts/openapi.yaml` unmodified and SHALL leave the generated contract types unregenerated.
16. WHEN the Model_Path and the Deterministic_Template_Path each produce a payload for the same Approved_Article, THE published payloads SHALL carry byte-equal `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, Filipino section content, and `warningSigns` values.

### Requirement 8: Authorization-gated dev ingest of the v2 artifact

**User Story:** As the sole engineer, I want the v2 artifact ingested into dev under its own point-of-action authorization, so that the corrected Filipino is actually retrievable at runtime without any unauthorized environment mutation.

ADR-20260806-03 records that the v1 corpus is already ingested and live in `dev` — 24 articles, 71 alias keys, 0 rejected rows. That independently confirms the Alias_Keys count this requirement reads back against, and it fixes the nature of the write pass: it is a re-ingest that overwrites existing `app_core` items in place, not a first load into empty key space. The authorization obligation is unchanged by that fact, and so is the deletion prohibition in 8.9 — an overwrite that leaves an orphaned alias behind would be a silent regression against a known-good baseline rather than an unmeasurable one.

#### Acceptance Criteria

1. THE `dev` ingest of the V2_Artifacts SHALL be treated as an environment mutation requiring its own current, unused, operation-specific Point_Of_Action_Authorization.
2. IF the required Point_Of_Action_Authorization is missing, expired, already used, or mismatched to the environment, operation, or window, THEN THE feature SHALL perform zero mutation and SHALL record the outcome as `DEFER` together with the specific mismatch.
3. WHEN the Ingest_Script runs with `--dry-run` against `architecture/patient_education_corpus_v2.csv`, THE Ingest_Script SHALL report 24 accepted rows and 0 rejections.
4. THE feature SHALL record the reviewed `--dry-run` output before the write pass runs.
5. IF the `--dry-run` pass reports any rejection or a row count other than 24, THEN THE feature SHALL withhold the write pass and SHALL record the rejection detail.
6. WHEN the write pass runs, THE Ingest_Script SHALL target the `dev` environment with `--corpus-version v2`.
7. IF the ingest target resolves to an environment other than `dev`, THEN THE Ingest_Script SHALL refuse to write and THE feature SHALL record the refusal as `DEFER`.
8. IF a corpus row fails the Ingest_Script's validation, THEN THE Ingest_Script SHALL reject that row without writing any part of it and SHALL exit with a non-zero status.
9. WHEN the write pass completes, THE Ingest_Script SHALL overwrite the same 24 `EntityType.PatientEducation` Article_Keys and the same Alias_Keys written by the v1 ingest, deleting no `app_core` item.
10. WHEN the write pass completes, THE Article_Keys SHALL carry `Ttl.PatientEducation` of one year and `corpusVersion` equal to `v2`.
11. WHEN the write pass completes, THE Keyed_Lookup SHALL return the V2 Reviewed_Filipino for a sampled `icd10_code` on a read-back performed against `dev`.
12. WHEN the write pass completes, THE read-back SHALL confirm that the Alias_Keys present in `dev` equal the Alias_Key set written by the v1 ingest, with no orphaned alias item remaining.
13. THE feature SHALL exclude `staging` and `prod` corpus ingest from its scope.
14. THE feature SHALL leave the Ingest_Script's non-`dev` guard and its `ALLOW_NON_DEV_CORPUS_INGEST` escape hatch unmodified.
15. THE feature SHALL treat the write pass as a re-ingest over the v1 corpus already live in `dev` per ADR-20260806-03 — 24 articles, 71 Alias_Keys, 0 rejected rows — rather than as a first load into empty key space.
16. WHEN the write pass completes, THE read-back SHALL confirm 24 `EntityType.PatientEducation` Article_Keys and 71 Alias_Keys present in `dev`, matching the counts ADR-20260806-03 records for the v1 ingest.

### Requirement 9: Released artifact immutability

**User Story:** As the engineer accountable for the clinical record, I want it written down that re-ingesting the corpus never rewrites education a patient already received, so that nobody reads the v2 merge as a retroactive edit to published clinical guidance.

#### Acceptance Criteria

1. THE Released_Artifact set SHALL remain byte-unchanged by the `dev` corpus ingest defined in Requirement 8.
2. THE Released_Artifact retrieval path SHALL continue to serve the stored `payload` captured at release time rather than re-reading the Article_Keys.
3. WHERE a Released_Artifact carries v1 Filipino text, THE feature SHALL leave that artifact as released.
4. THE Schema_Document SHALL record Released_Artifact immutability under corpus re-ingest as intended behavior.
5. THE feature SHALL introduce no re-release path, no backfill path, and no artifact-rewrite path.
6. THE `toReleasedArtifact` function in `backend/src/lib/cds/released-patient-education.ts` SHALL remain unmodified by this feature.

### Requirement 10: Register is named accurately, and no third register is added

**User Story:** As the engineer who has to answer "does this support Tagalog and Taglish", I want the two registers named for what they actually contain and the absence of a third stated as a decision, so that nobody adds a column, a section tag, or a contract member to supply content the corpus already carries under a wrong name.

#### Acceptance Criteria

1. THE corpus SHALL carry exactly the two Corpus_Registers, and THE feature SHALL add no third schema column, no third `PatientEducationArticle` field, and no third Section_Language_Tag member.
2. THE Schema_Document SHALL describe the second register as the Taglish_Register and SHALL state that its content is deliberately code-switched Filipino carrying English clinical terms, citing V2 wording such as "may chest pain", "Sundin lang ang medicines na nasa plano o reseta ni Doc", and "prescription" as evidence that the content is already Taglish.
3. THE Schema_Document SHALL record that Requirement 10 is a naming correction over content that already exists rather than a request for new content, and SHALL note that the Schema_Document already asked for a "Common Filipino/Taglish name" in `condition_name_fil`.
4. THE Schema_Document SHALL record that the `taglish` member of the Payload_Language_Value enum denotes model-generated output with no corpus backing and is not reviewed retrievable content.
5. THE Schema_Document SHALL record that the Section_Language_Tag enum has no `taglish` member, so a third stored register would require a change to `contracts/openapi.yaml`, which Requirement 7.15 forbids.
6. THE Schema_Document SHALL record the Retired_Taglish_Paths as unrelated to the corpus, naming `validLang = ['english', 'taglish']` in `backend/src/handlers/cds.ts` and the solver content store's `patientEducation.taglish[]` documented in `architecture/AI_INFERENCE.md`, and SHALL state that neither is corpus-backed.
7. THE feature SHALL leave the `filipino` Section_Language_Tag value, the six `*_fil` column names, the `BilingualText.filipino` field, and the Ingest_Script's `REQUIRED_COLUMNS` unchanged.
8. THE Patient_Education_Card SHALL render its Register_Label for the second register as `Taglish`, and SHALL render its unavailable-register string as `Not available in Taglish yet` when the second register is the selected register and its content is absent.
9. WHILE the Register_Label reads `Taglish`, THE Patient_Education_Card SHALL retain `filipino` as the internal `Language` enum value, as the value compared against `CdsPatientEducationSection.language`, and as the key used to select `titleFilipino` and the second `warningSigns` entry.
10. THE `PatientEducationCard.test.tsx` assertions SHALL match the Register_Label `Taglish` in place of `Filipino`, with the fixture payloads' `language: 'filipino'` section tags and `titleFilipino` field left unchanged.
11. THE feature SHALL leave `contracts/openapi.yaml` unmodified and SHALL leave the generated contract types unregenerated, per Requirement 7.15.
12. THE feature SHALL append the Register_Clarification_ADR to `architecture/DECISIONS.md` recording that the corpus carries exactly two registers, that the second is named Taglish, and that no third register is added.
13. THE feature SHALL add a cross-reference note on ADR-20260804-01 pointing at the Register_Clarification_ADR, leaving ADR-20260804-01's bilingual approval condition in force and otherwise unamended.
14. THE Payload_Language_Value `bilingual` SHALL remain the value published for a two-register payload, and THE Schema_Document SHALL name the English_Register and the Taglish_Register as the two registers `bilingual` denotes.
15. THE feature SHALL record as follow-up work, without changing it, that `groundingPassagesFor` in `backend/src/lib/cds/patient-education.ts` labels its Filipino grounding passages `(FIL):`, that file being frozen by Requirement 2.7.
16. THE feature SHALL confine its frontend changes to exactly `PatientEducationCard.tsx` and `PatientEducationCard.test.tsx`, and SHALL change only displayed text and the assertions matching it.
17. IF a proposed change would introduce a third register, a `taglish` Section_Language_Tag member, a `*_tgl` column, or a rename of an existing `filipino` identifier, THEN THE feature SHALL reject that change and SHALL record it as out of scope.
