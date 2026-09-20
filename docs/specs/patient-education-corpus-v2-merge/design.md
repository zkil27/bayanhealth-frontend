# Design Document

## Overview

This is no longer confined to `architecture/`. It began as a Python-tooling and content-transcription change, and the approved scope expansion in the requirements document extends it across two languages, one small patient-facing label, one authorized environment mutation, and two governance edits: **Python content tooling under `architecture/`, plus backend TypeScript under `backend/src/lib/cds/`, plus a two-file displayed-text change under `frontend/`, plus an authorization-gated `dev` corpus ingest, plus exactly two edits to `architecture/DECISIONS.md`.**

The reason the boundary moved is stated in the requirements and confirmed by reading the runtime code: a v2 CSV that nothing ingests is a file, and a v2 article that the model paraphrases is not the reviewed register correction reaching a patient. Sections 1 through 5 below carry the artifact; sections 6 through 8 carry it to the screen; section 9 makes the screen name the register honestly.

Seven moving parts, of which the first three are the original corpus work:

1. A **reproducible extraction** of the 24 V2 cards from `BayanHealth_Patient_Education_Corpus_V2_Corpus_Only_Linked.docx`, using only the standard library (`zipfile` + `re` over `word/document.xml`). `python-docx` is deliberately not a dependency.
2. A **transcription** of five Filipino columns per record into `architecture/corpus_data.py`, leaving English, provenance, `condition_name_fil`, and `_ext` untouched.
3. A **version-aware regeneration** in `architecture/build_corpus.py` that writes `*_v2` artifacts into the checkout's own `architecture/` directory, plus a validator run that must come back with 24 rows, 0 blockers, and a warning set identical to the committed baseline.
4. **The Splice** (section 6) — reviewed Filipino survives the model path, in `backend/src/lib/cds/protected-output-adapters.ts` plus one import line in `protected-generation.ts`.
5. **An authorization-gated `dev` ingest** (section 7) of the v2 CSV into `app_core`, running the existing ingest script unmodified.
6. **A written statement of released-artifact immutability** (section 8), which is a documentation obligation rather than a code change.
7. **A register naming correction** (section 9) — the corpus carries exactly two registers, the second one is Taglish rather than Tagalog, and no third is added. Documentation, two displayed strings in one frontend component and the assertions matching them, and two `DECISIONS.md` edits.

Three verification vehicles, not one. The corpus merge is verified by the Corpus_Build_Script's own validator plus a purpose-built Python comparison tool. The Splice is TypeScript and **is** covered by the repository's backend vitest/fast-check suite — see the Testing Strategy section, which corrects the earlier claim that this change contains no TypeScript. The register label is covered by the existing frontend vitest suite in `PatientEducationCard.test.tsx`.

### Facts established by reading the source before designing

These were confirmed by direct inspection of `word/document.xml` and `corpus_data.py`, not assumed:

| Observation | Value | Consequence |
|---|---|---|
| Cards in V2_Document | exactly 24, `PE-001`..`PE-024` | matches V1's 24 `RECORDS` |
| Card metadata table | 5 columns: `Card ID`, `Legacy record`, `Legacy code`, `Corrected code candidate`, `Correction link` | correlation is stated in the document, not inferred from order |
| `Corrected code candidate` vs V1 `icd10_code` | identical for all 24 cards | ordinal correlation is *verified*, not assumed |
| `Legacy code` primary portion vs V1 `icd10_code` | identical for all 24 cards | a second document-stated code signal, independent of order |
| V2 card title vs V1 `condition_name_fil` | equal on 19 cards; differs on PE-005, PE-007, PE-012, PE-015, PE-023 | the title is a *reported* signal with an enumerated mismatch set, not a hard abort (section 2) |
| V1 `icd10_code_alt` | already empty on all 24 rows | Requirement 2.5 is a non-regression, not a repair |
| Section headings per card | all six present on all 24 cards, no card missing any | Requirement 1.6's antecedent is currently false everywhere |
| Red-flag section | a heading paragraph plus 7-13 bullet paragraphs; no bullet contains a comma; none ends in a period | comma-joining is unambiguous |
| XML shape | no `<w:br/>`, no `<w:tab/>`, zero XML entities, all-ASCII text, 121 of 768 paragraphs split across multiple `<w:r>` runs | run-joining inside a paragraph is mandatory; entity unescaping is not |
| Tables per card | 3 (metadata; a two-row table holding `Gawin ngayon` and the red-flag block; one holding the unmapped reply-scale/teach-back block) | a paragraph-order walk flattens cells into the correct reading order |
| Pre-flight rule scan of mapped V2 text | zero BRAND_NAME, VAGUE_RED_FLAG, POSSIBLE_PII, POSSIBLE_DOSING, or `[[` hits | the zero-blocker outcome in Requirement 5 is achievable, and no new warning code should appear |
| Derived column lengths | order-of-magnitude maxima, **informative not exact**: `red_flags_fil` ~350, `explanation_fil` ~260, `self_care_fil` ~270, `what_to_expect_fil` ~260, `followup_fil` ~220 | every value sits far below its `CHAR_LIMITS` bound; the pass condition is the bound, never a reproduced observed maximum |

## Architecture

```
BayanHealth_..._V2_Corpus_Only_Linked.docx
        │  zipfile.read("word/document.xml")  →  regex paragraph walk
        ▼
  v2_corpus_tool.py extract ──► in-memory Card records (24)
        │                        · card_id, legacy_record ordinal
        │                        · legacy_code, corrected_code
        │                        · 5 mapped section strings
        │                        · dropped[] (unmapped + placeholder lines)
        │
        ├─ v2_corpus_tool.py apply  ──► rewrites 120 string literals
        │                               in architecture/corpus_data.py
        │
        └─ v2_corpus_tool.py verify ──► re-derives expected strings and
                                        byte-compares against RECORDS
        ▼
architecture/corpus_data.py  (single editable source of corpus content)
        ▼
architecture/build_corpus.py  (the gate)
        ├─► architecture/patient_education_corpus_v2.csv
        ├─► architecture/patient_education_extended_v2.json
        └─► architecture/corpus_validation_report.md
        ▼
  v2_corpus_tool.py freeze ──► column-scoped v1 vs v2 CSV diff
                               (English + provenance + condition_name_fil)
```

`architecture/patient_education_corpus_v1.csv` and `architecture/patient_education_extended_v1.json` are never opened for writing by any step. `freeze` opens them read-only.

The second half of the pipeline is the runtime path the scope expansion adds. It begins where the first half ends, at the certified CSV:

```
architecture/patient_education_corpus_v2.csv
        │  ingest-patient-education-corpus.ts  (UNMODIFIED; --dry-run, then an
        │  authorized dev write pass — section 7)
        ▼
app_core:  PATIENT_EDU#<ICD10>/APPROVED        x24   (same keys as v1)
           PATIENT_EDU#ALIAS#<normalized>/APPROVED x71 (same keys as v1)
        │
        │  findPatientEducationForDiagnosis(confirmed diagnosis)
        ▼
protected-generation.ts
        │  education = article | null
        │  groundingSources    = groundingPassagesFor(education)      (bilingual)
        │  deterministicTemplate = patientEducationTemplate(education) ── the ONE
        │                                                    corpus projection
        ▼
protected-output-adapters.ts               ── where the Splice lives (section 6)
        ├─ prompt: corpus-grounded shape → "author ENGLISH only, these 4 headings"
        ├─ provider path → validate model shape → spliceCorpusEducation(corpus, …)
        │                     → re-validate as corpus origin → publish
        └─ template path → validate corpus payload as-is        → publish
        ▼
CdsPatientEducationPayload  { language: 'bilingual', titleFilipino, icd10Code,
                              citation, corpusVersion, 8 sections, 2 warningSigns }
        ▼
release  ──►  artifact.payload stored at release time
        ▼
released-patient-education.ts  toReleasedArtifact  (UNMODIFIED — reads the stored
                               payload, never the corpus; section 8)
```

The one-line summary of section 6 is visible in that diagram: `patientEducationTemplate` sits upstream of the fork, so both branches consume the same corpus projection, and the corpus is absent from the released-artifact read path entirely.

## Components and Interfaces

### 1. Extraction: `architecture/v2_corpus_tool.py` (new)

One new script, four subcommands, standard library only. It is committed because the extraction must stay reproducible after the transcription lands — otherwise `verify` has nothing to compare against.

```python
# python v2_corpus_tool.py extract [--json PATH]   # inspect what will be written
# python v2_corpus_tool.py apply                   # rewrite the 120 literals
# python v2_corpus_tool.py verify                  # byte-compare RECORDS vs docx
# python v2_corpus_tool.py freeze                  # column-scoped v1/v2 CSV diff
```

All paths resolve from the script's own directory, never from the working directory:

```python
HERE = os.path.dirname(os.path.abspath(__file__))
DOCX = os.path.join(HERE, "BayanHealth_Patient_Education_Corpus_V2_Corpus_Only_Linked.docx")
```

#### Paragraph extraction

`python-docx` is not used, and the document is not parsed as a tree. The reason is narrow and worth stating: the only structure this transcription needs is *paragraph text in reading order*, and table cells already appear in reading order in the flat `<w:p>` sequence. A regex walk over `<w:p>` blocks gives exactly that in ten lines with no third-party dependency.

```python
PARA_RE = re.compile(r"<w:p[ >].*?</w:p>", re.S)
RUN_RE  = re.compile(r"<w:t[^>]*>(.*?)</w:t>", re.S)

def paragraphs(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    out = []
    for para in PARA_RE.findall(xml):
        text = "".join(RUN_RE.findall(para))        # runs joined with no separator
        out.append(html.unescape(text).strip())
    return out
```

Two guards make the shortcut safe rather than merely convenient. Both are asserted at extract time and abort with a named error rather than producing partial content:

- **`ASSERT_NO_MARKUP`** — no residual `<` or `>` survives in any extracted paragraph. If Word ever writes a `<w:br/>` or a field code into the corpus text, this fires instead of silently concatenating fragments.
- **`ASSERT_ASCII`** — the extracted text is pure ASCII, matching what was observed. A non-ASCII character is not an error in itself, but it means the document changed since this design was written, so it stops and asks for a look. `html.unescape` runs regardless so a later `&amp;` cannot corrupt a value.

Runs are joined with the empty string, not a space, because Word splits a single word across runs for spell-check and revision-tracking reasons; inserting a separator would corrupt words in the 121 multi-run paragraphs.

#### Card segmentation

A card starts at the paragraph matching `^PE-\d{3}$` and ends at the paragraph before the next such match (or end of document). Within a card, the metadata table's five values are the five paragraphs immediately following the `PE-0NN` paragraph, in the fixed header order. Rather than trusting that offset, the tool asserts the five header labels appear immediately *before* the `PE-0NN` paragraph in their documented order; a layout change fails loudly.

### 2. Correlation: PE-0NN ↔ `icd10_code`

The ordinal correlation is used, but it is never the evidence. Each V2 card carries its own link back to V1, and the tool cross-checks five signals before accepting a card-to-record pairing — four that abort on disagreement, and one that is reported:

| Signal | Source | Check | On disagreement |
|---|---|---|---|
| Card ordinal | `PE-0NN` | `NN == index + 1` | **abort** |
| Legacy record | `V1 condition #N` cell | `N == NN` | **abort** |
| Legacy code | `Legacy code` cell, primary portion before ` \| Alt:` | equals `RECORDS[index]["icd10_code"]` | **abort** |
| Corrected code | `Corrected code candidate` cell | equals `RECORDS[index]["icd10_code"]` | **abort** |
| Card title | `N. <title_fil>` heading | equals `RECORDS[index]["condition_name_fil"]` | **reported**, unless enumerated (below) |

The weight is carried by the four numeric signals, and specifically by the two ICD-10 signals. `Legacy code` and `Corrected code candidate` are per-card values printed in the document itself rather than derived from position, so they pin a card to a record independently of ordering; both were verified to agree with `RECORDS[index]["icd10_code"]` on all 24 rows, as did both ordinals. Any of those four disagreeing aborts extraction with the card id, the signal, the expected value, and the found value. There is no "closest match" fallback, for the same reason the retrieval path has none — a wrong pairing would attach one condition's red flags to another condition's diagnosis.

**The card title is a correlation *signal*, not a gate.** V2 retitles 5 of the 24 conditions into a plainer register, so the title does not equal `condition_name_fil` everywhere and cannot be a hard abort. The mismatches were verified by direct comparison and are enumerated, not tolerated by pattern:

```python
# V2 card title  vs  V1 RECORDS[index]["condition_name_fil"]
EXPECTED_TITLE_MISMATCHES = {
    "PE-005": ("Sore throat o pamamaga ng lalamunan",
               "Acute sore throat o pharyngitis"),
    "PE-007": ("Allergy sa ilong",
               "Allergic rhinitis o allergy sa ilong"),
    "PE-012": ("Tension headache",
               "Tension headache o pressure-type na sakit ng ulo"),
    "PE-015": ("Masakit na regla o dysmenorrhea",
               "Dysmenorrhea o masakit na regla"),
    "PE-023": ("Hilo o dizziness",
               "Dizziness, hilo, o vertigo-like symptoms"),
}
```

Handling, per card:

- title equals `condition_name_fil` → recorded as `title_match: exact` in the correlation report;
- title differs and the card is in `EXPECTED_TITLE_MISMATCHES` with both strings matching the enumerated pair → recorded as `title_match: expected_v2_retitle`, extraction continues;
- title differs in any other way — an unenumerated card, or an enumerated card whose actual pair no longer matches what is written above → **abort**, naming the card, the expected value, and the found value.

That last branch is what keeps the signal useful. A genuine mis-pairing would put some *other* condition's title on a card, which is not in the enumeration, so it still stops the run. What the enumeration permits is exactly the five known register simplifications and nothing else, and if V2 is revised so that a sixth card is retitled, the tool fails until someone looks.

These five retitles are deliberately not adopted. Requirement 1.3 freezes `condition_name_fil` at its V1 value on every row, and Property 6 checks that freeze cell by cell — so here the V1 titles are the target state and the V2 titles are the deviation, which is the reverse of how the other four signals read. Requirement 6.7 records the non-adoption in the schema document.

The `Correction link` cell (for example `V1 #1 linked; J00 cross-link removed`) is read and reported but not parsed for control flow. It documents why `icd10_code_alt` is empty; the tool separately asserts that no code appearing after `Alt:` in a `Legacy code` cell reappears in any record's `icd10_code_alt`.

### 3. Section_Mapping transcription rules

Two heading shapes occur, and the rules handle both:

- **Inline** — `Sa madaling sabi: <text>`, `Ano ang aasahan: <text>`, `Babalik o magme-message kapag: <text>`. Value is everything after the first `: `, stripped.
- **Block** — `Gawin ngayon` is a standalone heading paragraph; the value is the single following paragraph. `Magpatingin agad ngayon; ER kung malubha o mabilis lumalala:` is a standalone heading followed by bullet paragraphs.

Mapping table, applied by exact heading prefix:

| V2 heading | Column | Shape |
|---|---|---|
| `Sa madaling sabi:` | `explanation_fil` | inline |
| `Ano ang aasahan:` | `what_to_expect_fil` | inline |
| `Gawin ngayon` | `self_care_fil` | block, next paragraph |
| `Magpatingin agad ngayon; ER kung malubha o mabilis lumalala:` | `red_flags_fil` | block, bullet join (below) |
| `Babalik o magme-message kapag:` | `followup_fil` | inline |

Every other paragraph inside a card is dropped, and the tool records each dropped paragraph in the card's `dropped[]` list so the exclusions are reviewable rather than invisible. Dropped content is:

- the `Kumusta po, [[preferred_name]]. ...` greeting (placeholder-bearing),
- the `Trabaho at safety:` section — deliberately dropped even though it is clean text, because there is no schema column for it and the near-equivalent content already lives in `_ext.occupational_advice_fil`, which this feature does not touch,
- `Sa [[followup_due_at]], reply lang:` and the `1 Mas gumagaan | 2 ...` reply scale (placeholder-bearing),
- the closing teach-back question,
- the card title and the five metadata cells.

**Placeholder exclusion is a line-level filter applied before mapping, not after.** Any paragraph containing `[[` is dropped and recorded as `dropped_placeholder`, whatever its heading. If a future V2 revision puts a placeholder inside a mapped section, the result is a missing value that trips `REQUIRED_EMPTY` — a loud failure — rather than a `[[slot]]` reaching the CSV. The `PLACEHOLDER_IN_CONTENT` blocker in the validator remains the backstop, unmodified and undowngraded.

#### Red-flag bullet join

The V1 convention for `red_flags_fil` is one sentence: an imperative lead-in, `kung`, then comma-separated observable triggers with `o` before the last, terminated by a period. V2 supplies the same triggers as bullets under a heading that also carries an ER escalation clause. The join reproduces V1's shape and preserves the escalation clause:

```python
RF_LEAD = "Magpatingin agad ngayon kung "
RF_TAIL = " Pumunta agad sa ER kung malubha o mabilis lumalala."

# Two enumerations, not one, and neither is pattern-matched.
#
# STRIP: the bullet's own imperative duplicates the lead-in, so it is removed.
# Verified to occur on exactly THREE bullets across the corpus.
STRIP_PREFIXES = {
    "Magpatingin kung ":            ("PE-002", "PE-006"),   # first bullet each
    "Kailangan ng urgent care kung ": ("PE-003",),           # first bullet
}

# CARRY: the bullet's imperative names a *different* escalation level, so it is
# known, allowed, and carried verbatim. Never stripped, never an abort.
CARRIED_PREFIXES = {
    "Mag-emergency kung ": ("PE-020",),
}

# An imperative-prefixed bullet in NEITHER set aborts extraction rather than
# being silently rewritten or silently carried.

def join_red_flags(bullets):
    items = [strip_if_in_strip_set(b) for b in bullets]   # carried prefixes pass through
    items = [lower_first(i) for i in items]
    if len(items) == 1:
        body = items[0]
    else:
        body = ", ".join(items[:-1]) + ", o " + items[-1]
    return RF_LEAD + body + "." + RF_TAIL
```

Rules, in order:

1. **No bullet is dropped, reordered, or de-duplicated.** Document order is preserved.
2. **Redundant-imperative normalization — the STRIP set, exactly three bullets.** A leading `Magpatingin kung ` or `Kailangan ng urgent care kung ` is removed, because the lead-in already says it and leaving it produces "Magpatingin agad ngayon kung magpatingin kung hirap huminga". Verified to occur on exactly **three** bullets across the corpus: `Magpatingin kung ` on PE-002 and PE-006 (first bullet each), and `Kailangan ng urgent care kung ` on PE-003 (first bullet). No other bullet is stripped.
3. **`Mag-emergency kung ` is known and carried — the CARRY set, one bullet.** It names a different escalation level than the lead-in, so removing it would delete clinical routing. PE-020's `Mag-emergency kung hirap huminga` is carried verbatim as a trigger clause. It is *not* in the STRIP set and it is *not* an unknown prefix; it is separately enumerated so that carrying it is an explicit decision rather than a gap in the strip list. This is the one place where the rule is asymmetric, and it is asymmetric on purpose: normalization may remove a duplicated instruction, never a distinct one.
   - Consequence for the abort rule: the two sets partition the imperative prefixes this corpus contains. A bullet whose prefix is in the STRIP set is rewritten; in the CARRY set, carried; in **neither**, extraction aborts. PE-020 is in the CARRY set, so it never trips the abort.
4. **First-character lowercasing only**, and only when the first token is not all-caps. No bullet in the corpus starts with an acronym, and the guard exists so a future `BP` or `ER` bullet is not mangled.
5. **Separator** `, `, with `, o ` before the final item — V1's convention.
6. **Terminator** `.` followed by the ER escalation tail, so the heading's `ER kung malubha o mabilis lumalala` survives into patient-visible content instead of being lost with the heading.

Worked example, PE-001 (11 bullets, roughly 300 characters — informative; the pass condition is the 1000-character `CHAR_LIMITS` bound, not this figure):

> Magpatingin agad ngayon kung hirap huminga, may chest pain, namumutla o nangingitim ang labi, nalilito, sobrang nanghihina, tuyong bibig, sobrang uhaw, kaunti ang ihi, tuloy-tuloy ang mataas na lagnat, may dugong inuubo, o gumaling tapos biglang lumala. Pumunta agad sa ER kung malubha o mabilis lumalala.

Note what V2 adds clinically: V1 compressed dehydration to the clinical token `dehydrated`; V2 spells out `tuyong bibig`, `sobrang uhaw`, `kaunti ang ihi`. That is the register correction this feature exists to carry, and it is why the join must not collapse bullets.

### 4. Applying the transcription: `apply` mode

The transcription lands as string literals in `corpus_data.py`, which stays the single editable source of corpus content. The rewrite is scripted rather than hand-typed because it is 120 literals and a hand-typo in Filipino clinical text is both easy and invisible in review.

```python
# For each record block, anchored by its own '"icd10_code": "<code>",' line:
#   locate the single line matching  ^"<column>": ".*",$
#   replace it with  "<column>": <json.dumps(value)>,
# Refuse to write unless every one of the 120 target lines matched exactly once.
```

Design constraints on `apply`:

- Anchored per record by `icd10_code`, so a block is never confused with its neighbour.
- Exactly one match required per target line; zero or two matches aborts with the record code and column, writing nothing.
- Values are emitted with `json.dumps`, which produces a valid Python string literal for this content (verified: zero `"` characters, zero backslashes, zero newlines, two apostrophes, all ASCII). `apply` asserts these preconditions per value and refuses otherwise.
- One line in, one line out — the file's existing one-literal-per-line style is preserved, so `git diff` shows exactly 120 changed lines and nothing else. That diff *is* the reviewable transcription record.
- `_ext` blocks are never matched, because the five target column names do not appear inside them.
- `apply` is idempotent: re-running against an already-transcribed file rewrites identical bytes.

The module docstring in `corpus_data.py` gains a V2 provenance paragraph: which document the Filipino columns now come from, that English and provenance are frozen at V1, and that `condition_name_fil` was not replaced — including the note that V2's shorter retitles for PE-005, PE-007, PE-012, PE-015, and PE-023 were deliberately not adopted.

### 5. Version-aware output in `architecture/build_corpus.py`

Current state, and why it cannot regenerate in place:

```python
OUT = "/mnt/user-data/outputs"          # authoring-sandbox path, absent from any checkout
os.makedirs(OUT, exist_ok=True)
...
csv_path = os.path.join(OUT, "patient_education_corpus_v1.csv")   # emit site 1
ext_path = os.path.join(OUT, "patient_education_extended_v1.json")# emit site 2
rep_path = os.path.join(OUT, "corpus_validation_report.md")
```

Replacement:

```python
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)                # so `from corpus_data import ...` works
                                        # from any working directory
OUT = HERE                              # write beside the source, in the checkout
CORPUS_VERSION = "v2"

CSV_NAME = f"patient_education_corpus_{CORPUS_VERSION}.csv"
EXT_NAME = f"patient_education_extended_{CORPUS_VERSION}.json"
REPORT_NAME = "corpus_validation_report.md"

FROZEN_ARTIFACTS = {"patient_education_corpus_v1.csv",
                    "patient_education_extended_v1.json"}
if CSV_NAME in FROZEN_ARTIFACTS or EXT_NAME in FROZEN_ARTIFACTS:
    sys.exit("refusing to overwrite a shipped v1 artifact")
```

Decisions and their reasons:

- **Script-directory based, not cwd-based.** `os.path.dirname(os.path.abspath(__file__))` means `python architecture/build_corpus.py` from the repo root and `python build_corpus.py` from `architecture/` write to the same place. A cwd-based path would scatter artifacts and quietly produce a second, stale copy.
- **`sys.path.insert(0, HERE)` is required, not cosmetic.** Today the import of `corpus_data` only resolves because the script happens to be run from `architecture/`. Fixing the output path without fixing the import path would trade one cwd dependency for another and break Requirement 4.7's "no traceback" claim from the repo root.
- **A module constant, not a CLI flag.** A `--corpus-version` flag invites `--corpus-version v1`, which would overwrite a shipped, approved artifact — exactly what Requirement 4.5 forbids. The `FROZEN_ARTIFACTS` guard makes that refusal explicit even if someone later edits the constant.
- **`os.makedirs(OUT, exist_ok=True)` is kept** and is a no-op on an existing directory. It costs nothing and keeps the script runnable if `architecture/` is ever synthesized elsewhere.
- **The report filename stays unversioned**, per Requirement 4.4: it is the current state of the gate, overwritten each run, and its baseline lives in git history rather than in a second file.
- **V1 artifacts stay untouched on disk** as a consequence of the naming, reinforced by the guard. No step deletes or rewrites them.
- The docstring and the "Build and validate ... V1" header are updated to describe v2 output. No validation rule, threshold, brand list, PII pattern, or severity changes — the diff is confined to paths, names, and the docstring.

## 6. The Splice: reviewed Filipino on the model path

Sections 6 through 9 continue the numbering begun under **Components and Interfaces** and sit at document level rather than inside it, because only section 6 is a component design — section 7 is an operational procedure, section 8 is a statement about existing behaviour, and section 9 is a naming decision plus a two-string edit. Nothing in sections 1 through 5 is renumbered or restated.

### Facts established by running the code, not by reading it

Two of these change what Requirement 7 actually is. Both were produced by executing the shipped functions against the shipped corpus, and both are reproducible.

| Finding | Evidence | Consequence |
|---|---|---|
| The prompt-shape constant is named **`SCHEMA_INSTRUCTIONS`**, not `PROTECTED_OUTPUT_SHAPES` | `backend/src/lib/cds/protected-output-adapters.ts`, module-private `Readonly<Record<ProtectedOutputType, string>>` | naming only; this document uses the real identifier |
| **The corpus-backed deterministic template does not validate today.** `validateProtectedOutputPayload('patient_education', patientEducationTemplate(article))` throws `ProtectedOutputValidationError: Protected output contains an unknown field` | executed directly against the shipped validator with a `bilingual` payload carrying `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, and `language`-tagged sections | see "What 7.14 actually means" below |
| **Two of the 24 articles fail the patient-education content guard.** `PATIENT_EDUCATION_MEDICATION` matches the literal word `prescription` in `self_care_en` (J06.9) and `self_care_fil` (J06.9, I10) | regex scan of `architecture/patient_education_corpus_v1.csv` reproducing `defaultContentValidation`'s joined-text rule; 3 payload-reaching occurrences across 2 articles | section 6.7 — without a decision here, Requirement 7 is unsatisfiable for J06.9, the demo condition |
| `assertNoPii` is clean on all 24 corpus-derived payloads | `checkForPii(JSON.stringify(payload))` over all 24 assembled bilingual payloads: **0 violations** | the PII gate needs no scoping change and keeps running over the whole published payload |
| Every corpus value fits the validator's bounds | measured maxima: `condition_name_en` 66/200, `condition_name_fil` 48/200, longest section 304/4000, longest red-flag string 304/1000, citation 163/1000, `icd10_code` 8/16 | no bound risk; the only array-bound risk is section **count**, which drives the pairing decision in 6.5 |
| Production wires the adapter with no `renderTemplate` override | `createDefaultProtectedOutputAdapter()` = `createProtectedOutputAdapter({ metrics })`; the default is `(input) => input.deterministicTemplate` | the deterministic payload really does pass through `validateProtectedOutputPayload`, so the validator is the gate on both paths |
| No test covers the corpus-backed template through the validator | `grep` for `titleFilipino` / `patientEducationTemplate` across `backend/src/lib/cds/*.test.ts` returns nothing | the defect above is untested, which is why it survived |

**What 7.14 actually means.** Requirement 7.14 says the Deterministic_Template_Path "SHALL continue to emit the Approved_Article's English and Filipino text verbatim, with the payload shape it produces today unchanged." The shape it produces today never reaches a patient: `closedObject(['title','language','sections','warningSigns'])` rejects `titleFilipino` as an unknown field, `validateEducationSection`'s `closedObject(['heading','content'])` rejects the section `language` tag, and `record.language !== 'english' && !== 'taglish'` rejects `bilingual`. Because `ProtectedOutputValidationError` is listed in `shouldRejectWithoutFallback`, the template branch does not degrade — it rethrows, and the whole generation fails. So with an approved article present, patient education today has exactly two outcomes: a model paraphrase with no citation, or a failed request. The reviewed Filipino reaches a patient on **neither** path, not merely on the failure path.

That makes the validator widening in Requirement 7.9 load-bearing twice over. It is what enables the Splice, and it is also the fix for a live defect on the path Requirement 7.14 assumes already works. Treat 7.14 as "the deterministic payload shape is not redesigned", which is what this design does, rather than as a statement that the path currently functions.

### 6.1 Where the Splice executes

**Decision: inside the adapter, as part of `patient_education` validation and assembly — not in `protected-generation.ts` after the adapter returns.**

The tradeoff is which object gets safety-checked. `createProtectedOutputAdapter().generate` does this, in order: parse provider JSON → `validateProtectedOutputPayload` → `validateSafety` (output-size bound, `assertNoPii` over the serialized payload, `defaultContentValidation`, optional injected `validateContent`) → emit metrics → return `{ payload, source }`. `ProtectedGenerationCoordinator` then hands `generated.payload` straight to `this.artifact(...)` and publishes it.

Splicing *after* the adapter returns would mean the payload that was validated is not the payload that was published. The corpus Filipino, the citation, and the corpus title would enter the artifact without passing `assertNoPii` or the output-size bound; `protected_output_generation_total{validationOutcome:'accepted'}` would describe a different object than the one in DynamoDB; and `source: 'llm'` would be attached to a payload assembled by the coordinator. It would also push output-shape knowledge into a module whose current job is strictly to assemble adapter *inputs* and manage the gate/reservation/publish transaction.

Splicing *inside* the validation step keeps one invariant that is worth more than the convenience: **the object returned by the validator is the object that gets published, and everything the validator and safety checks assert holds of the published bytes.** The cost is that `validatePatientEducation` stops being a pure shape check and becomes shape-check-plus-assembly, and it needs one piece of context it does not have today (6.6). That cost is paid once, in one function, and it is visible in the function's signature rather than hidden in a caller.

### 6.2 How the Approved_Article reaches the Splice point

**It already does, and no interface widens at all.**

`protected-generation.ts` resolves `education` before building `adapterInput`, and then puts the corpus payload into the input as the deterministic template:

```ts
deterministicTemplate: education
  ? patientEducationTemplate(education)
  : defaultTemplate(outputType, diagnosis, this.now()),
```

`patientEducationTemplate(article)` already projects every field the Splice needs — `title`, `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, the four English/Filipino section pairs, and `warningSigns: [redFlags.english, redFlags.filipino]`. So `input.deterministicTemplate` **is** the corpus-derived payload whenever an article was retrieved, and the adapter reads it through one named accessor:

```ts
/**
 * The corpus-derived patient-education payload for this generation, or undefined.
 *
 * `patientEducationTemplate(article)` is the only producer of a `bilingual`
 * patient-education payload in the system; `defaultTemplate` emits `english`.
 * Reading it back off the input is therefore exact, and it is deliberately the
 * *same object* both generation paths consume — see 6.8.
 */
function corpusEducationFrom(
  input: ProtectedOutputAdapterInput,
): components['schemas']['CdsPatientEducationPayload'] | undefined {
  if (input.outputType !== 'patient_education') return undefined;
  const template = input.deterministicTemplate as components['schemas']['CdsPatientEducationPayload'];
  return template.language === 'bilingual' ? template : undefined;
}
```

Alternative considered and rejected: add `readonly corpusEducation?: CdsPatientEducationPayload` to `ProtectedOutputAdapterInput` and have the coordinator set it. It reads more explicitly, but it puts two independently-constructed copies of the same corpus content into one input object, and nothing would detect a divergence between them. Requirement 7.16 asks for byte equality across paths; deriving both paths from one object makes that structural, while carrying two copies makes it a convention. One object, one producer.

What is *not* threaded is the `PatientEducationArticle` itself. The adapter has no business knowing about DynamoDB item shapes or `BilingualText`, and it does not need to: every field the Splice publishes is already in the projected payload. The article stays inside `protected-generation.ts` and `patient-education.ts`, exactly as today.

### 6.3 The prompt-shape change

A model told to write Filipino writes Filipino, and a validator that then rejects Filipino turns a well-behaved model into a failed request. The prompt and the validator have to agree, so the shape string changes in the same edit as the validator.

`SCHEMA_INSTRUCTIONS` stays a static `Record` for the six other output kinds and for the no-article patient-education case. A second literal covers the corpus-grounded case, and `buildMessages` selects between them:

```ts
/** The four heading slots `patientEducationTemplate` emits, in order. */
export const PATIENT_EDUCATION_SECTION_HEADINGS = [
  'What this is',
  'What to expect',
  'Self care',
  'Follow up',
] as const;

const SCHEMA_INSTRUCTIONS: Readonly<Record<ProtectedOutputType, string>> = {
  // ... six other kinds unchanged ...

  // No approved article: unchanged from today, English or Taglish, free headings.
  patient_education: '{"title": "<string>", "language": "english" | "taglish", "sections": [{"heading": "<string>", "content": "<string>"}], "warningSigns": ["<string>", "..."]} '
    + '— "sections" is a JSON array of 1 to 20 objects; "warningSigns" is a JSON array of 1 to 20 strings.',
};

/**
 * Corpus-grounded patient education: the model writes ENGLISH ONLY.
 *
 * The Filipino sections, the Filipino title, the citation, the corpus version and
 * the warning signs are supplied verbatim from the clinician-approved corpus and
 * are NOT the model's to write. Asking for them and then discarding them would
 * spend budget on text nobody reads; asking for them and keeping them would ship
 * an unreviewed machine translation of clinical advice.
 */
const PATIENT_EDUCATION_CORPUS_GROUNDED_SHAPE =
  '{"title": "<string>", "language": "english", "sections": [{"heading": "<string>", "content": "<string>"}]} '
  + '— write EVERY value in English only. Do not write Filipino, Tagalog, or Taglish text anywhere in the object. '
  + '"sections" is a JSON array of exactly 4 objects whose "heading" values are, in this order, '
  + `${PATIENT_EDUCATION_SECTION_HEADINGS.map((heading) => `"${heading}"`).join(', ')}; `
  + 'put your English text for that heading in "content". '
  + 'Do not include "warningSigns", "titleFilipino", "citation", "corpusVersion", or "icd10Code" — '
  + 'the server supplies the reviewed warning signs and citation.';
```

Three details in that string are deliberate:

- **"English only" is stated twice**, once as an instruction and once as a prohibition naming Tagalog and Taglish explicitly. The grounding passages the model receives are bilingual (`groundingPassagesFor` emits `Heading (EN): ...\nHeading (FIL): ...`), so the model is looking at approved Filipino while being told not to produce any. That is the whole point — it may draw meaning from the Filipino, and it may not restate it.
- **The four headings are named literally**, because they are literal constants of `patientEducationTemplate` rather than article-derived values. That is what makes a static prompt string sufficient and keeps the slotting rule in 6.5 achievable.
- **`warningSigns` is not requested.** Requirement 7.6 says a model-supplied warning sign is *discarded*, not that it is rejected, so the validator tolerates the key if it appears; not asking for it is how the common case stays cheap.

### 6.4 The composition rule, field by field

| Published field | Source | Requirement |
|---|---|---|
| `language` | literal `'bilingual'` — inherited from the corpus payload | 7.1 |
| `title` | corpus (`article.conditionName.english`) | 7.4 — model-authored text is accepted "only for sections carrying `language: 'english'`", which excludes the title |
| `titleFilipino` | corpus (`article.conditionName.filipino`) | 7.2 |
| `icd10Code` | corpus | 7.2 |
| `citation` | corpus (`citationFor(article)`) | 7.2 |
| `corpusVersion` | corpus | 7.2 |
| sections tagged `language: 'filipino'` | corpus, verbatim, never touched | 7.3 |
| sections tagged `language: 'english'` | **model**, per matched heading; corpus English where the model supplied none | 7.4 |
| `warningSigns` | corpus, exactly `[redFlags.english, redFlags.filipino]` in that order | 7.5, 7.6 |
| model `title`, model `warningSigns`, model `language` | **discarded** | 7.6 |

The model's own `language` value is discarded because the composed payload is `bilingual` by construction. That is why the validator accepts `english` **or** `taglish` from a provider candidate on the corpus path rather than insisting on `english`: strictness there would buy nothing and would add a hard-failure mode, since `ProtectedOutputValidationError` skips the fallback.

`source` on the returned `ProtectedOutputAdapterResult` stays `'llm'` for a spliced payload. The contract's enum is `'llm' | 'template'` and Requirement 7.15 forbids touching the contract, so a third value is unavailable — and `source` legitimately records *which generation path ran*, not the provenance of each field. Field provenance is recorded in the payload itself, by `citation` and `corpusVersion`, which is where a reader needs it.

### 6.5 Section pairing

This is the part that cannot be hand-waved, because three inputs disagree about shape: the corpus supplies **four fixed heading slots in two languages**, the model may return **1 to 20 sections with arbitrary headings**, and the contract caps `sections` at **`maxItems: 20`** with `additionalProperties: false`.

**Rejected — (ii) append model English sections, then the four corpus Filipino sections.** 20 model sections + 4 corpus sections = 24, which breaks both the contract's `maxItems: 20` and the validator's `boundedArray(..., 1, 20, ...)`. Requirement 7.15 forbids raising the cap, so this option only works with a truncation rule, which makes the published section set depend on how verbose the model was. It also breaks pairing: a patient-facing surface can no longer show "this heading in either language" because the English and Filipino halves no longer correspond.

**Rejected — (iii) reject model output whose headings do not match the corpus set.** Heading drift is the single likeliest deviation from a free-text-heading instruction: `Self-care` for `Self care`, `What to expect:` with a colon, `Follow-up`. Rejection here means `ProtectedOutputValidationError`, which `shouldRejectWithoutFallback` turns into a failed generation with no deterministic fallback. Trading a cosmetic mismatch for a 5xx on patient education is the wrong exchange, and it recreates the current defect in a new place.

**Chosen — (i) fixed corpus headings, model English slotted per heading.**

```ts
/**
 * Overlay model-authored English onto the corpus payload.
 *
 * Structure, order, count, language tags, and every non-English value come from
 * the corpus. The model contributes English `content` for a heading it recognised,
 * and nothing else. A heading the corpus does not have is dropped; a heading the
 * model omitted keeps its approved English.
 */
function spliceCorpusEducation(
  corpus: components['schemas']['CdsPatientEducationPayload'],
  modelSections: readonly { heading: string; content: string }[],
): components['schemas']['CdsPatientEducationPayload'] {
  const english = new Map<string, string>();
  for (const section of modelSections) {
    // First occurrence wins, so a duplicated heading is deterministic.
    if (!english.has(section.heading)) english.set(section.heading, section.content);
  }
  return {
    ...corpus,
    sections: corpus.sections.map((section) =>
      section.language === 'english' && english.has(section.heading)
        ? { ...section, content: english.get(section.heading)! }
        : section),
  };
}
```

Consequences, stated rather than left to be discovered:

- **The published payload always has exactly 8 sections** — four headings x two languages, in corpus order. Section count is independent of the model, so the `maxItems: 20` bound cannot be reached, and the shape is identical to the deterministic path's. That is also what makes Requirement 7.16 checkable field by field.
- **A model heading with no corpus counterpart is dropped.** The map is only ever read at corpus headings, so unmatched entries are never consulted. This is a real quality cost: a model that writes four good sections under four renamed headings loses all four, and the patient sees approved English instead. It is a quality regression, never a safety one, and it is made observable rather than silent by a counter — `protected_output_education_section_total{outcome: 'model_slotted' | 'model_heading_unmatched' | 'corpus_english_retained'}`. If that counter shows `model_heading_unmatched` dominating in `dev`, the fix is a prompt iteration, not a validator change.
- **A model heading the corpus does not have is *not* an error.** No rejection, no fallback, no failed request.
- **A heading the model omits keeps its corpus English.** Degradation is per-section and lands on approved text, so a partially-cooperative model produces a partially-improved article rather than a failure.
- **Heading matching is exact.** No trimming, case-folding, or punctuation-stripping, because a normalizing match is a matching heuristic and every fuzzy match in this subsystem has been deliberately refused (`normalizeEducationKey` is canonicalization for a keyed Get, not similarity). If drift proves common in `dev`, the honest fix is a stricter prompt.

### 6.6 The validator change

`validatePatientEducation` needs one thing it does not have: the corpus payload to compose from and compare against. It gets it through an optional third parameter on the existing entry point, so no existing call site changes and the six other output kinds are untouched:

```ts
export interface ProtectedOutputValidationContext {
  /**
   * Which generation source produced the candidate. A `bilingual` payload is only
   * ever valid from `'template'` — the composed result is re-validated in that
   * mode, so the published object is validated in its published form.
   */
  readonly candidateOrigin?: 'provider' | 'template';
  /** Corpus-derived payload for this generation; absent on the no-article path. */
  readonly corpusEducation?: components['schemas']['CdsPatientEducationPayload'];
}

export function validateProtectedOutputPayload<K extends ProtectedOutputType>(
  outputType: K,
  value: unknown,
  context?: ProtectedOutputValidationContext,
): ProtectedOutputPayloadMap[K];
```

Omitting `context` means `{ candidateOrigin: 'provider', corpusEducation: undefined }`, which is exactly today's behaviour — English or Taglish, closed four-key object, no Filipino. `backend/src/tools/cds-safety-regression.ts` and the existing tests keep calling with two arguments and keep getting the same answers.

The allowed-key sets widen, and they widen *per origin* rather than globally. `closedObject` currently forbids `titleFilipino`, `icd10Code`, `citation`, and `corpusVersion`; the corpus-origin branch adds all four as optional, and `validateEducationSection` gains `language` as an optional key restricted to `'english' | 'filipino'`. The provider-origin branch keeps today's narrow set, which is what makes 7.7 and 7.13 enforceable without a content comparison: a model that tags a section `language: 'filipino'`, or that emits `citation`, is rejected by the closed-key rule before anything has to be compared.

Two modes:

```ts
function validatePatientEducation(
  value: unknown,
  context: ProtectedOutputValidationContext,
): ProtectedOutputPayloadMap['patient_education'] {
  const corpus = context.corpusEducation;

  if (context.candidateOrigin === 'template') {
    // Corpus / composed shape. Accepts language-tagged sections and the four
    // corpus-owned fields (Requirement 7.9).
    const payload = validateCorpusEducationShape(value);
    // 7.8 — `bilingual` with no retrieved article is rejected outright.
    if (payload.language === 'bilingual' && !corpus) {
      return fail('Bilingual patient education requires an approved corpus article');
    }
    // 7.7 — every corpus-owned field must be byte-equal to the corpus payload.
    // The four English section contents are exempt: those are the Splice's slots.
    if (corpus) assertCorpusOwnedFieldsUnchanged(payload, corpus);
    return payload;
  }

  // Provider shape. Closed to {title, language, sections{heading,content}},
  // `warningSigns` optional-and-discarded, language english|taglish.
  const candidate = validateProviderEducationShape(value);
  if (!corpus) return candidate;                       // 7.10, 7.11, 7.12 — unchanged
  return validatePatientEducation(                     // 7.1-7.6, 7.9
    spliceCorpusEducation(corpus, candidate.sections),
    { candidateOrigin: 'template', corpusEducation: corpus },
  );
}
```

Where each rejection lands, precisely:

| Rule | Rejected by | Where |
|---|---|---|
| 7.7 — Filipino section content not from the corpus | provider branch: `language` is not an allowed section key, so a model-tagged Filipino section is an unknown field | `validateProviderEducationShape` |
| 7.7 — a corpus-origin candidate whose Filipino content diverges | `assertCorpusOwnedFieldsUnchanged`, byte comparison against `context.corpusEducation` | corpus branch |
| 7.8 — `bilingual` with no article | explicit check in the corpus branch; and on the provider branch `language` may only be `english`/`taglish`, so a provider candidate can never claim `bilingual` | both branches |
| 7.13 — no article, model supplies Filipino text or a citation | provider closed-key set forbids `citation`, `corpusVersion`, `titleFilipino`; section closed-key set forbids `language` | `validateProviderEducationShape` |

The comparison happens **inside** the validator, not outside, because the validator is the only place that both sees the candidate and is guaranteed to run on every published payload from both paths. `assertCorpusOwnedFieldsUnchanged` compares `title`, `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, `warningSigns`, the section count, and every section's `heading`/`language`, plus the `content` of every section tagged `filipino` — everything except the four English `content` values. Any difference is a `ProtectedOutputValidationError`.

That is also the answer to "how does the validator get the article": it never sees the article. It sees the article's projection, which is the only thing it needs to compare against, and which both paths share.

### 6.7 The content guard needs scoping, or two of 24 conditions cannot publish

`defaultContentValidation` joins `title`, every section `heading` and `content`, and every `warningSigns` entry, then rejects the payload if `PATIENT_EDUCATION_MEDICATION` matches. Scanning the shipped corpus reproduces three matches across two articles, all on the literal word `prescription`:

| Article | Column | Matched text |
|---|---|---|
| J06.9 (the demo condition) | `self_care_en` | `prescription` in "...medicines approved in the physician's Plan or prescription." |
| J06.9 | `self_care_fil` | `prescription` in "...medicines na nasa doctor-approved Plan o prescription." |
| I10 | `self_care_fil` | `prescription` in "Inumin ang medicines nang eksakto sa prescription..." |

`prescribed` (17 occurrences) and `Prescribing` (3) do **not** match — the pattern is `prescri(?:be|ption)\b`, and the trailing word boundary fails on `prescribed`. Only the exact noun matches, and it matches under `/i`.

So the moment the validator accepts the bilingual shape, both paths reach `defaultContentValidation` and 2 of 24 articles throw `ProtectedOutputContentError` — which is also in `shouldRejectWithoutFallback`, so the request fails with no fallback. The corpus's own validator raises nothing here: `POSSIBLE_DOSING` looks for dosing patterns, not the word "prescription", which is why this is invisible upstream.

Options:

- **(a) Scope the guard to model-authored text.** The patient-education medication rule exists to stop an *unreviewed model* putting dosing into patient-facing content. Corpus text is clinician-reviewed, signed off, and already passed the corpus validator's `BRANDS`, `DOSE_PATTERNS`, and `POSSIBLE_DOSING` rules. Applying an anti-hallucination guard to reviewed text is a category error.
- **(b) Edit the corpus.** Rejected: `self_care_en` is frozen by Requirement 2.1, and rewording `self_care_fil` to satisfy a regex would break byte-fidelity to the V2 card required by Requirement 1.2 and Property 3. Editing approved clinical text to appease a lint rule is the wrong direction of causation.
- **(c) Allowlist the word globally.** Rejected: it weakens the rule for model output too, which is the only place it was ever meant to bite.

**Decision: (a).** For `patient_education`, the medication scan runs over the *provider candidate's* text — its `title`, its section headings and contents, and its `warningSigns` if present — and not over corpus-derived content. On the template path, where every byte is reviewed corpus text, the patient-education medication scan does not run at all. Everything else is unchanged: the output-size bound, `assertNoPii` over the whole serialized payload (verified clean on all 24 articles), the prescription brand-name rule, and any injected `validateContent` all keep running exactly as today.

This is a narrowing of an existing safety guard, so it is called out rather than buried: **it should be acknowledged explicitly before implementation.** Without it, Requirement 7 cannot be met for J06.9 or I10, and J06.9 is the article `cds-demo-readiness.ts` checks for.

### 6.8 Cross-path equality is structural, not coincidental

Requirement 7.16 asks that both paths produce byte-equal corpus-sourced fields. Three properties of the design make that true by construction rather than by parallel implementation:

1. **One producer.** `patientEducationTemplate(article)` is the only function in the system that emits a `bilingual` patient-education payload. It is the shared helper the requirement asks for; no second corpus-projection routine is introduced.
2. **One object.** The template path validates that object. The model path retrieves that same object via `corpusEducationFrom(input)` and spreads it (`{ ...corpus, sections: corpus.sections.map(...) }`), replacing only `content` on sections already tagged `english`. Every other value is the identical string reference.
3. **One re-validation.** The composed payload is re-validated in `'template'` mode against the same corpus object, so `assertCorpusOwnedFieldsUnchanged` asserts the equality the requirement states. If a future edit introduces a second projection or mutates a corpus field during composition, that assert fails loudly instead of shipping two nearly-equal payloads.

The four headings live in one exported constant that both `patientEducationTemplate` and the prompt string consume, so the slot vocabulary cannot drift between the template and the instruction that tells the model which slots to fill.

### 6.9 The no-article path stays exactly as it is

When `findPatientEducationForDiagnosis` returns null — no alias, no article, or a malformed row failing closed — nothing above runs:

- `deterministicTemplate` is `defaultTemplate('patient_education', diagnosis, now)`, `language: 'english'`, so `corpusEducationFrom` returns undefined;
- `groundingSources` stays the single approved-grounding-bundle entry, unchanged;
- the prompt uses today's `SCHEMA_INSTRUCTIONS.patient_education` string, English or Taglish, free headings, 1-20 sections, 1-20 warning signs;
- the validator takes the provider branch and returns the candidate unchanged — no `titleFilipino`, no `icd10Code`, no `citation`, no `corpusVersion`, no `filipino`-tagged section, because those keys are forbidden on that branch (7.11, 7.12);
- **no citation is fabricated.** The composed branch is the only thing that ever sets `citation`, and it requires a corpus payload to run. A condition with no approved article publishes uncited English, which is the truthful outcome (7.13).

### 6.10 Change surface

| File | Change |
|---|---|
| `backend/src/lib/cds/protected-output-adapters.ts` | `PATIENT_EDUCATION_SECTION_HEADINGS`; the corpus-grounded prompt shape and its selection in `buildMessages`; `ProtectedOutputValidationContext` and the optional third parameter on `validateProtectedOutputPayload`; `validatePatientEducation` split into provider-shape, corpus-shape, `spliceCorpusEducation`, and `assertCorpusOwnedFieldsUnchanged`; `validateEducationSection` gains the optional `language` key; medication-scan scoping (6.7); one section-outcome counter |
| `backend/src/lib/cds/protected-generation.ts` | imports `PATIENT_EDUCATION_SECTION_HEADINGS` for `patientEducationTemplate`'s heading list, and passes `{ candidateOrigin, corpusEducation }` — nothing else. `education`, `adapterInput`, `groundingSources`, and `deterministicTemplate` wiring are unchanged |
| `backend/src/lib/cds/patient-education.ts` | **none.** `PatientEducationArticle`, `groundingPassagesFor`, `citationFor`, `aliasKeysFor`, and `normalizeEducationKey` are untouched (Requirement 2.7) |
| `backend/scripts/ingest-patient-education-corpus.ts` | **none** (Requirements 2.7, 8.14) |
| `contracts/openapi.yaml`, generated contract types | **none** (Requirement 7.15) — the contract already permits every field the Splice publishes |
| `backend/src/lib/cds/released-patient-education.ts` | **none** (Requirement 9.6) |

## 7. Authorization-gated `dev` ingest

### 7.1 What needs authorization, and what does not

The `--dry-run` pass issues **zero** AWS calls. Reading `main()`: the environment guard runs, arguments parse, the CSV is read from disk, and inside the row loop `if (options.dryRun) { written += 1; aliasCount += ...; continue; }` returns before any `docClient.send`. Nothing before the loop sends either. So the dry run is a local file validation that happens to print the resolved table name — it is not an environment mutation and needs no Point_Of_Action_Authorization.

The **write pass** is the mutation. It requires its own current, unused, operation-specific authorization bound to this operation, this target table, `dev`, and one window. If that authorization is missing, expired, already used, or mismatched on any of those four, the outcome is `DEFER` with the specific mismatch recorded and **zero writes** — not a partial ingest, not a "just the demo article" ingest (Requirements 8.1, 8.2).

Authorization for the corpus ingest does not extend to anything else in the same environment. In particular it does not authorize `npm run script:seed-cds-demo-policy`, which server-enables protected generation for all actors with no canary allowlist.

### 7.2 The exact commands

Both run from `backend/`. The environment variables are not optional decoration: `ENVIRONMENT` drives the script's own non-`dev` refusal, and `DYNAMODB_APP_CORE_TABLE` selects the table the writes land in.

```bash
# Dry run — local validation, zero AWS calls, no authorization required.
cd backend
ENVIRONMENT=dev \
AWS_REGION_NAME=ap-southeast-1 \
DYNAMODB_APP_CORE_TABLE=bayanhealth-dev-app-core \
  npm run script:ingest-patient-education -- \
    ../architecture/patient_education_corpus_v2.csv --corpus-version v2 --dry-run
```

Required output before the write pass may run (Requirements 8.3, 8.4):

```text
[corpus] environment=dev table=bayanhealth-dev-app-core version=v2 (DRY RUN — no writes)
[corpus] file=<abs>/architecture/patient_education_corpus_v2.csv rows=24
[corpus] articles=24 aliases=71 rejected=0
[corpus] done.
```

`aliases=71`, not 72. `aliasKeysFor` de-duplicates, and on `U07.1` the English and Filipino condition names both normalize to `covid 19`, so that row contributes 2 alias keys instead of 3. The number is derived from the three frozen columns (`icd10_code`, `condition_name_en`, `condition_name_fil`), so it is the same for v1 and v2 — which is the point of 7.3 below.

Any rejection, or any row count other than 24, withholds the write pass and the rejection detail is recorded instead (Requirement 8.5). A rejection is loud by construction: `toArticle` rejects a row whole rather than partially, prints `[corpus] REJECTED <code>: <reason>`, and sets a non-zero exit (Requirement 8.8).

```bash
# Write pass — an environment mutation. Runs only against a current, unused,
# operation-specific authorization for this operation, table, environment, and window.
cd backend
ENVIRONMENT=dev \
AWS_REGION_NAME=ap-southeast-1 \
DYNAMODB_APP_CORE_TABLE=bayanhealth-dev-app-core \
  npm run script:ingest-patient-education -- \
    ../architecture/patient_education_corpus_v2.csv --corpus-version v2
```

Expected: `[corpus] articles=24 aliases=71 rejected=0`, exit 0, `corpusVersion: 'v2'` and a one-year `Ttl.PatientEducation` on every written item (Requirements 8.6, 8.10). If `ENVIRONMENT` resolves to anything but `dev` and `ALLOW_NON_DEV_CORPUS_INGEST` is unset, the script throws before parsing arguments; that refusal is recorded as `DEFER` (Requirement 8.7). The guard and its escape hatch are not modified, and the escape hatch is not used (Requirement 8.14).

### 7.3 Why re-ingest is safe

Three independent reasons, none of which depends on operator care:

- **Idempotent by key.** `writeArticle` issues a plain `PutCommand` at `patientEducationPrimaryKey(icd10Code)` and at `patientEducationAliasPrimaryKey(alias)` — no conditional expression, no version fence. Re-running overwrites the same items in place. The 24 article keys are `PATIENT_EDU#<ICD10> / APPROVED`, and the ICD-10 codes are frozen by Requirement 2.2, so the v2 pass lands on exactly the keys the v1 pass wrote (Requirement 8.9).
- **Never deletes.** There is no `DeleteCommand` anywhere in the script, and its docstring states the position: a row removed from the CSV is not removed from the table, because deletion is a separate deliberate operation. Nothing that exists in `dev` can be lost by running it.
- **No orphaned aliases, because the alias inputs are frozen.** `aliasKeysFor` reads exactly three values: `icd10Code`, `conditionName.english`, `conditionName.filipino`. `icd10_code` and `condition_name_en` are frozen by Requirement 2.2 and 2.1; `condition_name_fil` is frozen by Requirement 1.3, which is precisely why the five V2 retitles (PE-005, PE-007, PE-012, PE-015, PE-023) were declined in section 2. The derived alias set is therefore byte-identical between v1 and v2 — the same 71 keys — so re-ingest overwrites every alias and creates none. Had the retitles been adopted, five old alias keys would have been stranded in `app_core`, each still resolving to its article, and a diagnosis matching an old Filipino title would keep working while a diagnosis matching the new one would find nothing until a separate cleanup ran. Declining the retitles is what makes this a same-key overwrite instead of a migration (Requirements 6.9, 8.12).

### 7.4 Read-back verification

The alias-set comparison is done in two halves, because only one of them needs AWS.

**Derived-set equality — repository-only, no AWS.** Compute `aliasKeysFor` over both CSVs and assert set equality. This is a local check of the freeze, it runs before any write, and it establishes the expected key set independently of what is in the table.

**Sampled article — one keyed read.** For a sampled `icd10_code`, read `PATIENT_EDU#<ICD10> / APPROVED` and assert: `corpusVersion === 'v2'`; `explanation.filipino`, `whatToExpect.filipino`, `selfCare.filipino`, `redFlags.filipino`, and `followUp.filipino` byte-equal to that row's v2 CSV values; all six `*.english` values and `conditionName.filipino` byte-equal to the **v1** CSV values; `reviewedBy`/`reviewDate` unchanged; `ttl` roughly one year out. Sample J06.9 at minimum, since it is the demo condition and the one `cds-demo-readiness.ts` probes. Verifying through `findPatientEducationForDiagnosis(<condition name>)` rather than a raw `GetItem` proves the alias hop as well as the article, which is what Requirement 8.11 is actually asking about (Requirements 8.10, 8.11).

**Alias set present and no orphan — one keyed read per expected alias, plus one filtered scan.** Get each of the 71 expected alias keys and assert presence with the right `icd10Code` target; then a `Scan` projecting `pk` only, filtered on `begins_with(pk, 'PATIENT_EDU#ALIAS#')`, to enumerate what is actually there and assert the actual set equals the expected 71. The scan is the only way to prove absence of an orphan — a Get can only confirm what you already thought to look for. It is a read, it projects one attribute, and `dev` is small (Requirement 8.12).

All verification is read-only. Every read-back is recorded with the table name, the environment, and a timestamp.

### 7.5 Scope boundary

`staging` and `prod` corpus ingest are out of scope and receive no dry run, no write pass, and no read-back (Requirement 8.13). The `ALLOW_NON_DEV_CORPUS_INGEST=true` escape hatch is not set. A successful `dev` ingest is dev evidence: it is not staging qualification, not canary authorization, and not production enablement.

## 8. Released-artifact immutability

Short, because the code already has this property and the obligation is to state it rather than to build it.

`toReleasedArtifact` reads `item.payload` — the payload captured on the artifact item at release time — and returns it after checking `lifecycleStatus === 'released'`, both visibility flags, `stale !== true`, and the expected `outputType`. It never re-reads `PATIENT_EDU#<ICD10>`, never calls `findPatientEducationForDiagnosis`, and never consults `corpusVersion`. `findReleasedArtifact` follows the `CDS#OUTPUT_CURRENT#<outputType>` pointer to that same stored artifact. The corpus is therefore not in the read path of released education at all.

The consequence is the intended one: **the `dev` ingest in section 7 cannot reach education a patient has already been given.** An artifact released before the ingest keeps its v1 Filipino verbatim, and that is correct — it is what the physician released and what the patient read. The v2 wording applies to education generated after the ingest (Requirements 9.1, 9.2, 9.3).

No re-release path, no backfill path, and no artifact-rewrite path is introduced. `toReleasedArtifact` is unmodified (Requirements 9.5, 9.6). The Schema_Document records this under Requirement 9.4:

> **Released education is immutable under corpus re-ingest.** A released patient-education artifact serves the payload stored on the artifact item at release time, not a fresh read of the corpus. Re-ingesting the corpus — v1 to v2 or otherwise — therefore changes nothing a patient has already received. Artifacts released before a corpus revision keep the wording that was released, by design: retroactively editing published clinical guidance is not a content update, it is a rewrite of the record. Newly generated education uses the current corpus.

## 9. Register naming: two registers, the second is Taglish

The question that opened this section was whether the corpus offers English, Tagalog, and Taglish. It carries two registers, and the second one is misnamed rather than missing. That makes this the cheapest section in the document to implement and the easiest to get wrong, because the honest fix is a label and the tempting fix is a schema.

### 9.1 The finding, checked against the shipped sources

Every count below came from reading the two shipped files, not from the claim under test. The V2 counts are a standard-library paragraph walk over `word/document.xml` — the same extraction section 1 specifies. The CSV counts are literal substring counts over `architecture/patient_education_corpus_v1.csv`, which is the only corpus CSV in the checkout today (`patient_education_corpus_v2.csv` does not exist until section 5 runs).

| Probe | In V2_Document | In shipped v1 CSV | What it actually shows |
|---|---|---|---|
| `may chest pain` | 1 lowercase, in `Very high ang BP na may chest pain` | 5 | see the correction below — the phrase is mostly a **capitalized bullet** in V2, `May chest pain`, on 3 cards plus `May chest pain na hindi malinaw na dahil lang sa ubo` |
| `Sundin lang ang medicines na nasa plano o reseta ni Doc` | 1 (PE-001 `Gawin ngayon`) | **0** | this exact phrasing is V2's rewrite. v1 carries the older `Sundin lang ang medicines na nasa doctor-approved Plan o prescription.` |
| `reseta ni Doc` | 7 | 0 | V2's preferred formulation, replacing v1's `doctor-approved Plan` |
| `Trabaho at safety` | 24 — once per card | **0** | an Unmapped_V2_Section. Register evidence, not content that lands (section 3) |
| `prescription` | 1 (I10 `Gawin ngayon`) | 3 | interacts with section 6.7 — see below |
| `medicines` / `fluids` / `check-up` / `ER` / `safety` | 8 / 15 / 24 / 27 / 25 | — | English clinical and logistical nouns inside Filipino syntax, on every card |

**Three corrections to the wording as quoted.** They do not change the conclusion; they sharpen what the evidence is.

1. **`may chest pain` is a bullet, and the lowercase form is manufactured by this feature's own join rule.** V2 writes the red-flag trigger as the standalone bullet `May chest pain`. The `join_red_flags` rule in section 3 lowercases the first character before joining, which is exactly why the design's own PE-001 worked example already reads `...hirap huminga, may chest pain, namumutla...`. So the phrase is genuine register evidence, but it is evidence about a *bullet*, and the lowercase form quoted is the post-join string rather than a document string. The single lowercase occurrence in the document is a different construction, `Very high ang BP na may chest pain`, which is itself the better example: an English intensifier (`Very high`), an English abbreviation (`BP`), and an English symptom noun in one Filipino clause.
2. **`Sundin lang ang medicines na nasa plano o reseta ni Doc` is not in the shipped CSV at all.** The shipped v1 text is `Sundin lang ang medicines na nasa doctor-approved Plan o prescription.` Both are code-switched — v1 borrows `medicines`, `Plan`, and `prescription`; V2 borrows `medicines` and drops back to `plano` and `reseta`. **The register was already Taglish before V2.** That matters for Requirement 10's framing: the naming correction is not a consequence of the V2 merge and would have been correct against v1. V2 makes the register plainer, not more code-switched.
3. **`Trabaho at safety` appears 24 times in the document and zero times in the CSV**, which is the Unmapped_V2_Sections rule working. Citing it as register evidence is fair — it is a Filipino noun bolted to an English one — but it is evidence about the source document, not about a schema column, and it will never appear in an artifact this feature emits.

**One consequence worth recording, because it moves a number in section 6.7.** V2's PE-001 `Gawin ngayon` replaces `doctor-approved Plan o prescription` with `plano o reseta ni Doc`, so the word `prescription` leaves `self_care_fil` for J06.9 and survives only in I10's. After the merge, the `PATIENT_EDUCATION_MEDICATION` scan finds **two** payload-reaching occurrences across two articles rather than three: `self_care_en` on J06.9 (frozen English, Requirement 2.1) and `self_care_fil` on I10. Both articles still trip the guard, so **the medication-scan scoping decision in 6.7 is unchanged and still load-bearing** — the count in that section's table is a v1 measurement and should be read as such.

The conclusion the evidence supports: the corpus's second register is code-switched Filipino carrying English clinical vocabulary. Naming it `Filipino` on a patient's screen overstates it, and the Schema_Document has been asking for a "Common Filipino/Taglish name" in `condition_name_fil` since before V2 existed, so the ambiguity is older than this feature.

### 9.2 Why a third register is expensive, and is refused

Adding a stored `taglish` register is not a column. It is seven changes, and the first one is forbidden outright.

| Cost | Detail |
|---|---|
| **A contract change, which Requirement 7.15 forbids** | `CdsPatientEducationSection.language` is `enum: [english, filipino]` with `additionalProperties: false` (verified in `contracts/openapi.yaml`). It is the only place a *stored* register is tagged. A third stored register cannot be represented without adding an enum member, which means editing the contract and regenerating types — prohibited by Requirements 7.15 and 10.11 |
| **New clinical content: 24 rows x 5 sections = 120 values** | The corpus has no third-register text anywhere. Someone has to write 120 clinical strings, and they are patient-facing clinical advice, not translations of convenience |
| **A new clinical sign-off** | ADR-20260804-01 makes review status load-bearing and reviewer identity per-topic. 120 new values means a new approval pass by the approving physician, and it cannot ride on the 2026-08-06 sign-off that V1 and V2 share (Requirement 2.3) |
| **An amendment to ADR-20260804-01** | Its bilingual approval condition is explicit: a topic reaches `approved` only when **both** languages are present and reviewed, and a single-language topic is never eligible for grounding. A third register turns that condition into a three-way completeness gate, which is a real amendment to the decision text — not the cross-reference note Requirement 6.3 permits |
| **`BilingualText` becomes a triple** | `backend/src/lib/cds/patient-education.ts` defines `BilingualText` and uses it for all six bilingual fields plus `conditionName`. Requirement 2.7 freezes that file. A third member also changes `bilingual()`'s fail-closed parse, `groundingPassagesFor`'s passage pairs, and `patientEducationTemplate`'s section count from 8 to 12 — which invalidates Property 20 as written |
| **The ingest and the CSV schema** | A `*_tgl` column set means `CORE_COLUMNS` grows from 18 to 24, `REQUIRED_COLUMNS` and `CHAR_LIMITS` grow with it, the v1/v2 header-identity claim in Requirement 2.6 breaks, and the Ingest_Script — frozen by Requirements 2.7 and 8.14 — needs new column reads |
| **The frontend toggle becomes three-way** | `type Language`, the `["english", "filipino"]` map, the section-selection branches, the `titleFilipino` selection, and the two-entry `warningSigns` pairing all assume exactly two registers. So does `groupSectionsByHeading` in `patientEducation.ts` |

Set against that: the content the third register would supply **already exists**, under the name `filipino`. Requirement 10 is therefore a naming correction, and the refusal is recorded rather than left implicit so that the next reader who asks the same question finds the answer instead of the column.

### 9.3 The three `taglish` sightings, and why none is a third register

All three were checked in the checkout. None is corpus-backed, and none is modified by this feature.

| Sighting | Verified state | Why it is not a third register |
|---|---|---|
| `CdsPatientEducationPayload.language: [english, taglish, bilingual]` | `contracts/openapi.yaml` | A **payload-level** value describing model-authored output with no corpus backing. It is what the no-article path may publish (section 6.9). It tags a whole payload, never a stored section, and there is no reviewed content behind it |
| `validLang = ['english', 'taglish']` | `backend/src/handlers/cds.ts` line 729, inside the validation for `handlePatientCards` | The terminally retired patient-cards path. It is a request-input validator for `preferredLanguage`, not a store of content |
| `patientEducation.taglish[]` | `backend/src/lib/cds/solver-content.ts` — **5 solver entries** (`URTI-001`, `UTI-001`, `GERD-001`, `HYPERTENSION-001`, `DIABETES-001`), **5 Taglish strings each, 25 in total**, read at `cds.ts` line 747 as `solverContent.patientEducation[lang]` | Keyed by **solver id**, not by ICD-10, and reachable only from `handlePatientCards`, retired per ADR-20260806-03 |

**The solver content store really does still hold Taglish text**, and the strings are unambiguous — `Uminom po ng maraming tubig — at least 8 baso bawat araw`, `Magpahinga po nang maayos, lalo na sa unang 1-2 araw`. So the honest statement is not "there is no Taglish content in the repository" but "there is no *corpus-backed, ICD-10-retrievable, physician-approved* Taglish register." Three properties separate those 25 strings from the corpus: they are keyed by solver id so the Keyed_Lookup cannot reach them, they carry no reviewer, review date, or citation, and their only caller is retired.

That makes them a **possible future source** for a third register, and this feature deliberately does not draw on them. Doing so would import unreviewed, uncited clinical text into a path where ADR-20260804-01 makes citation mandatory and review status a visibility gate — the exact substitution the assessment-first design exists to prevent. If a third register is ever wanted, these strings are a starting draft for the approving physician, not content that may be promoted; and promoting them would still incur every cost in 9.2. Recorded here so the option is visible and its price is attached to it.

### 9.4 The exact change surface: displayed text only

Two files, both under `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/`. Two rendered strings, their doc comments, and the assertions that match them.

**`PatientEducationCard.tsx` line 166 — the toggle label.**

```tsx
// before
          {option === "filipino" ? "Filipino" : "English"}
// after
          {option === "filipino" ? "Taglish" : "English"}
```

**`PatientEducationCard.tsx` line 198 — the unavailable-register string.**

```tsx
// before
                Not available in {language === "filipino" ? "Filipino" : "English"} yet
// after
                Not available in {language === "filipino" ? "Taglish" : "English"} yet
```

That is the whole rendered change. The button carries a `capitalize` class, which is a no-op on `Taglish`, so no styling follows.

Everything else in the file stays `filipino`, deliberately:

| Stays as-is | Line | Why |
|---|---|---|
| `type Language = "english" \| "filipino"` | 21 | The internal enum value, not a label (Requirement 10.9) |
| `(["english", "filipino"] as const).map(...)` | 152 | The option list is the enum, not the label |
| `language === "filipino" && payload.titleFilipino` | 91-92 | Selects the contract field `titleFilipino`, which is frozen |
| `language === "filipino" ? group.filipino : group.english` | 187-188 | `group.filipino` is populated from `section.language === "filipino"`, the contract's Section_Language_Tag |
| `language === "filipino" ? signs[1] : signs[0]` | 226 | Picks the second `warningSigns` entry, which the Splice guarantees is the Filipino-tagged red-flag string (Requirement 7.5) |

Doc comments that name the register in prose are updated in the same edit — line 33 (`a language toggle over reviewed English and Filipino text`) and line 211 (`supplies these as [English, Filipino] in order`) — because a comment that says `Filipino` above code that renders `Taglish` is precisely the trap 9.5 is about.

**`PatientEducationCard.test.tsx`** changes only the assertions that match displayed text, at lines 213 and 253:

```tsx
// before
      const filipino = toggleButton(m.container, /^Filipino$/);
      ...
      expect(toggleButton(m.container, /^Filipino$/)).toBeUndefined();
// after
      const filipino = toggleButton(m.container, /^Taglish$/);
      ...
      expect(toggleButton(m.container, /^Taglish$/)).toBeUndefined();
```

The local `const filipino` keeps its name on purpose: it holds the button for the `filipino` register, and leaving it makes the label/identifier split visible at the one place a reader is most likely to notice it. The fixture stays untouched apart from the two regexes — `titleFilipino: "Pag-aalaga sa bahay"`, `language: "filipino"` section tags, and the assertion `expect(text).toContain("Paliwanag sa Filipino.")` are all payload values and fixture content, not labels (Requirement 10.10). Test names and comments that describe the register in prose are reworded to `Taglish`.

**No third frontend file is needed.** `frontend/.../lib/api/patientEducation.ts` was checked: its five `filipino` occurrences are all identifiers or contract field names (`language?: "english" | "filipino"`, `titleFilipino`, `group.filipino`) and it renders nothing. Requirement 10.16's two-file confinement is therefore achievable rather than aspirational.

### 9.5 Why the label and the identifier diverge, and how that stops being a trap

The divergence is deliberate and it is asymmetric in cost. Renaming the identifier would mean touching `contracts/openapi.yaml`, the generated types, `BilingualText`, six CSV column names, `REQUIRED_COLUMNS`, the ingest script, `groundingPassagesFor`, and every `language === 'filipino'` comparison in the Splice — for zero patient-visible benefit, since a patient never sees an enum value. Leaving the label wrong costs a patient an inaccurate promise about what they are about to read. So the label moves and the identifier does not.

The risk is real and worth naming: a reader who greps `Taglish` in the frontend will find one string and no type, and a reader who greps `filipino` will find a type and no label. Left undocumented, someone eventually "fixes the inconsistency" and either renames the enum — breaking the contract comparison silently, because `section.language === "taglish"` is simply never true and the register goes blank rather than throwing — or reverts the label.

Four places carry the mapping, deliberately at the points where a reader lands:

1. **A doc comment directly above `type Language` in `PatientEducationCard.tsx`**, stating that `filipino` is the stored Section_Language_Tag value defined in `contracts/openapi.yaml`, that `Taglish` is the displayed name for that same register, and that the value is not renameable without a contract change. This is the nearest documentation to the code most likely to be edited, which is why it is first.
2. **The Schema_Document register section** (Requirements 10.2 through 10.6), which is where the corpus schema is described and therefore where someone considering a `*_tgl` column looks.
3. **The Register_Clarification_ADR** (9.6), which is the durable record of *why* and carries the refusal of a third register.
4. **This section**, which is the design-level statement, plus Property 29, which is the executable one — a check that every compared value still reads `filipino` while the displayed text reads `Taglish` fails loudly if someone unifies the two in either direction.

### 9.6 The ADR plan: one new entry, one cross-reference note

`architecture/DECISIONS.md` uses `### ADR-YYYYMMDD-NN: <title>` with `Date`, `Status`, `Owner`, `Context`, `Decision`, `Alternatives considered`, `Consequences`, `Related files`. The highest current id in the file is **`ADR-20260823-01`**, so the next available date-suffixed id is **`ADR-20260824-01`**. These are the only two edits this feature makes to that file, and Requirement 6.3 permits exactly these two.

**Edit 1 — append the new ADR.**

> ### ADR-20260824-01: Patient education carries two registers, and the second one is Taglish
>
> - Date: 2026-08-24
> - Status: Accepted — documentation plus one patient-facing label; no third register added, no schema or contract change
> - Owner: Lead Engineer (Dev A); register named against content approved by Marco Paolo Perpetua, General Physician (2026-08-06)
> - Context: A question was raised about whether the patient-education corpus offers English, Tagalog, and Taglish. It carries two registers, `*_en` and `*_fil`, and the second one is misnamed rather than missing. The `*_fil` content is code-switched Filipino carrying English clinical vocabulary, verified in both the shipped v1 CSV and the V2 source document: `Sundin lang ang medicines na nasa doctor-approved Plan o prescription` in v1 becomes `Sundin lang ang medicines na nasa plano o reseta ni Doc` in V2; red-flag bullets read `May chest pain`; `Trabaho at safety` heads a section on all 24 cards; `medicines`, `fluids`, `check-up`, and `ER` appear throughout. The register was already Taglish before the V2 merge, so this is not a consequence of that merge. `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md` has asked for a "Common Filipino/Taglish name" in `condition_name_fil` since the first ingest, so the ambiguity predates both. Separately, three `taglish` occurrences in the codebase are unrelated to the corpus and are routinely mistaken for a third register: the `CdsPatientEducationPayload.language` enum member, which describes model-authored output with no corpus backing; `validLang = ['english', 'taglish']` in `backend/src/handlers/cds.ts`, a request-input check on the retired patient-cards path; and `patientEducation.taglish[]` in `backend/src/lib/cds/solver-content.ts`, 25 strings across 5 solver entries, keyed by solver id, uncited, unreviewed, and reachable only from the retired `handlePatientCards` (ADR-20260806-03).
> - Decision:
>   - **The corpus carries exactly two registers**: English, in the `*_en` columns and tagged `english`; and **Taglish**, in the `*_fil` columns and tagged `filipino`. The name describes the content.
>   - **No third register is added.** No `*_tgl` column, no third `PatientEducationArticle` field, no `taglish` member on `CdsPatientEducationSection.language`, no third `BilingualText` member.
>   - **No identifier is renamed.** The `filipino` Section_Language_Tag value, the six `*_fil` column names, `BilingualText.filipino`, and the Ingest_Script's `REQUIRED_COLUMNS` all stand. `contracts/openapi.yaml` is unmodified and its generated types are not regenerated.
>   - **The patient-facing label is corrected.** `PatientEducationCard.tsx` renders `Taglish` on the reading-language toggle and in its unavailable-register string. The internal `Language` enum value, the value compared against `CdsPatientEducationSection.language`, and the keys selecting `titleFilipino` and the second `warningSigns` entry all remain `filipino`.
>   - **The label/identifier divergence is documented** at four points: a doc comment above `type Language`, the register section of the Schema_Document, this ADR, and a correctness property asserting that displayed text reads `Taglish` while every compared value reads `filipino`.
>   - **`language: 'bilingual'` continues to denote a two-register payload** — English and Taglish — and keeps its meaning unchanged.
>   - **The solver content store's 25 Taglish strings are not promoted.** They are uncited, unreviewed, and keyed by solver id rather than ICD-10. They may serve as a starting draft if a third register is ever approved; they are not content this system may publish.
> - Alternatives considered:
>   - Add a third stored register: rejected for V1. It requires a contract change forbidden by the accepted spec, 120 new clinical strings, a fresh sign-off from the approving physician, an amendment to ADR-20260804-01's bilingual approval condition, `BilingualText` becoming a triple in a frozen file, six new CSV columns and a frozen ingest script that reads them, and a three-way frontend toggle — to supply content the corpus already carries under a wrong name.
>   - Rename `filipino` to `taglish` throughout: rejected. It touches the contract, the generated types, the column names, the ingest script, and every comparison in the generation path, for no patient-visible benefit, and a partial rename fails silently — a section tagged `filipino` compared against `"taglish"` renders blank rather than throwing.
>   - Leave the label as `Filipino`: rejected. It tells a patient the text is Filipino when it is code-switched, and it leaves the next reader to rediscover the question from scratch.
>   - Reuse the solver content store's Taglish strings as the third register: rejected. Uncited and unreviewed clinical text on a path where ADR-20260804-01 makes citation mandatory and review status a visibility gate.
> - Consequences:
>   - Positive: a patient reads an accurate name for the register in front of them; the "do we support Tagalog and Taglish" question has a written answer with its cost attached; no schema, contract, or clinical-approval work is incurred; the two-register bilingual gate in ADR-20260804-01 stays satisfied as written.
>   - Trade-offs: the displayed label and the stored identifier deliberately disagree, which is a standing readability cost mitigated by four documentation points and one correctness property rather than removed. `groundingPassagesFor` continues to label its Filipino grounding passages `(FIL):` because `backend/src/lib/cds/patient-education.ts` is frozen by the accepted spec; that label is model-facing, not patient-facing, and is recorded as follow-up.
>   - Follow-up actions: (a) align the `(FIL):` prompt label when `patient-education.ts` next opens for edit; (b) if a third register is ever wanted, start from this ADR's cost list rather than from a column.
> - Related files: `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md`, `architecture/corpus_data.py`, `contracts/openapi.yaml`, `backend/src/lib/cds/patient-education.ts`, `backend/src/lib/cds/solver-content.ts`, `backend/src/handlers/cds.ts`, `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.tsx`, `frontend/bayan-health-mvp/src/features/consultation/components/patientEducation/PatientEducationCard.test.tsx`, `.kiro/specs/patient-education-corpus-v2-merge/`

**Edit 2 — the cross-reference note on ADR-20260804-01.** It appends to that entry's `Status` line and touches nothing else, which is what keeps Requirement 10.13 ("leaving ADR-20260804-01's bilingual approval condition in force and otherwise unamended") verifiable as a one-line diff:

> - Status: Accepted — **register naming clarified by ADR-20260824-01**: the bilingual requirement below is satisfied by exactly two registers, English and Taglish, where "Taglish" is the accurate name for the content stored in the `*_fil` columns and tagged `filipino`. No third register is added, and no wording in this ADR is amended.

The note goes on `Status` rather than in `Context` or `Consequences` because those are the historical record of a decision made on 2026-08-04 and rewriting them would falsify what was decided then. `Status` is the field that legitimately carries later qualification, and the file already uses it that way — ADR-20260805-04's status line carries its own supersession note.

### 9.7 What `bilingual` denotes

`Payload_Language_Value` keeps its three members and `bilingual` keeps its meaning: **a payload carrying both Corpus_Registers — the English_Register and the Taglish_Register.** Concretely, a `bilingual` payload carries four sections tagged `english` and four tagged `filipino`, `titleFilipino`, and `warningSigns` as `[English red flag, Taglish red flag]`. The contract's own description of the field says "reviewed English and Filipino text side by side"; that description is accurate about the tags and imprecise about the register, and it is not edited, because the contract is frozen by Requirements 7.15 and 10.11. The Schema_Document carries the precise reading (Requirement 10.14), and section 9.5 point 2 is where a reader finds it.

`bilingual` also stays the right word. Two registers is two, whatever the second is called, and renaming the enum member would be a contract change for a synonym.

### 9.8 The `(FIL):` prompt label stays, as recorded follow-up

`groundingPassagesFor` builds each passage as:

```ts
content: `${heading} (EN): ${text.english}\n${heading} (FIL): ${text.filipino}`,
```

`(FIL):` is now an inaccurate name for the same register the toggle calls `Taglish`. It is not changed, for three reasons, and the reasons are recorded rather than the change deferred silently:

1. **`backend/src/lib/cds/patient-education.ts` is frozen by Requirement 2.7**, which this feature states in five places and verifies with `git diff --name-only` (Property 27). Editing a string inside it to fix a label would spend a cheap, checkable freeze claim on a cosmetic gain.
2. **The label is model-facing, not patient-facing.** It appears in a grounding passage inside a prompt. No patient reads it, and the model is separately and explicitly instructed not to reproduce Filipino, Tagalog, or Taglish text at all (section 6.3). The worst case is a slightly less accurate hint to a model told to ignore that text.
3. **Changing it perturbs the prompt.** Grounding passage content feeds the prompt the Splice depends on, and `soap-multi-transaction-cds` requires deterministic grounding assembly with a stable bundle digest. Editing passage text for a naming reason changes prompt bytes for no functional gain, which is a poor trade inside a feature whose whole point is that reviewed wording survives.

Recorded in the follow-ups table below, alongside the ingest script's docstring, which is deferred on the same freeze ground.

## Data Models

### Extracted card (in-memory, and the shape written by `extract --json`)

```python
{
  "card_id": "PE-001",
  "legacy_record_ordinal": 1,
  "legacy_code": "J06.9", "legacy_alt": ["J00"],
  "corrected_code": "J06.9",
  "correction_link": "V1 #1 linked; J00 cross-link removed",
  "title_fil": "Viral URTI o karaniwang sipon at ubo",
  "mapped": {
    "explanation_fil": "...", "what_to_expect_fil": "...",
    "self_care_fil": "...", "red_flags_fil": "...", "followup_fil": "...",
  },
  "red_flag_bullets": ["Hirap huminga", "May chest pain", ...],
  "dropped": [{"reason": "unmapped_section", "text": "Trabaho at safety: ..."},
              {"reason": "dropped_placeholder", "text": "Kumusta po, [[preferred_name]]..."}],
}
```

`extract --json` writes to an operator-supplied path and defaults to a non-committed scratch file. It is an inspection aid; `apply` and `verify` both re-derive from the docx, so no derived JSON is trusted as input.

### Record delta in `corpus_data.py`

| Field group | Change |
|---|---|
| `explanation_fil`, `what_to_expect_fil`, `self_care_fil`, `red_flags_fil`, `followup_fil` | replaced from V2, 5 x 24 = 120 literals |
| `condition_name_fil` | unchanged — V2's retitles for PE-005, PE-007, PE-012, PE-015, PE-023 are deliberately not adopted (section 2, Requirements 1.3 and 6.7) |
| All six `*_en` columns | unchanged |
| `icd10_code`, `icd10_code_alt`, `source`, `reviewed_by`, `review_date`, `notes` | unchanged |
| `_ext` (including `occupational_advice_fil` and `dynamic_slots`) | unchanged |
| `CORE_COLUMNS`, `REQUIRED_COLUMNS`, `CHAR_LIMITS`, `EXT_CONSTANTS`, `PENDING_REVIEWER`, `PENDING_DATE` | unchanged |

`_ext.dynamic_slots` legitimately contains `[[...]]` tokens. The placeholder scans in this feature are scoped to the 18 `CORE_COLUMNS`, exactly as the existing validator already scopes its `PLACEHOLDER_IN_CONTENT` rule. A scan that included `_ext` would report false blockers.

## Error Handling

Every failure mode below writes nothing and exits non-zero. Nothing degrades to a partial transcription, because a half-transcribed corpus is worse than an untranscribed one: it looks finished.

| Condition | Behaviour |
|---|---|
| Card count is not 24 | abort, report the count |
| Any of the four numeric correlation signals disagrees (card ordinal, legacy record ordinal, `Legacy code` primary portion, `Corrected code candidate`) | abort, naming card, signal, expected, found |
| Card title differs from `condition_name_fil` and the card is not in `EXPECTED_TITLE_MISMATCHES`, or is in it with a different pair of strings | abort, naming card, expected, found. An enumerated match is reported as `expected_v2_retitle` and continues |
| A mapped heading is missing from a card | abort — except `Babalik o magme-message kapag:`, where `followup_fil` becomes `""` (optional column, Requirement 1.6) |
| A mapped section is present but empty after placeholder filtering | abort — silence here would surface later as `REQUIRED_EMPTY` with no explanation |
| An imperative-prefixed red-flag bullet whose prefix is in neither the STRIP set nor the CARRY set | abort — a new lead-in is a content decision, not a formatting one. A prefix in either enumerated set proceeds: STRIP is removed, CARRY (PE-020's `Mag-emergency kung `) is kept verbatim |
| Residual markup or non-ASCII in extracted text | abort — the document changed since this design |
| `apply` target line missing or ambiguous | abort before writing, naming record and column |
| A value fails the literal-safety precondition (`"`, `\`, newline) | abort before writing |
| `verify` finds any byte mismatch | exit non-zero, print a per-mismatch table with both lengths and the first differing offset |
| `freeze` finds a frozen-column difference | exit non-zero, print row, column, and both values |
| Build script resolves an output path matching a v1 artifact | refuse and exit |
| Validator reports any blocker | non-zero blocker count printed and reported; the merge is not done |

Runtime failure modes are separate and are tabulated where they are decided: candidate rejection in section 6.6, the content-guard scoping in 6.7, and ingest refusal and `DEFER` in 7.1 and 7.2. One property they share with the table above is worth restating: on the generation path a rejection is never a partial publication. `ProtectedOutputValidationError` and `ProtectedOutputContentError` are both listed in `shouldRejectWithoutFallback`, so a rejected candidate produces no artifact at all rather than a degraded one — which is also why sections 6.5 and 6.7 work so hard to avoid rejecting for cosmetic reasons.

## Validation Strategy

This section covers the **corpus artifact** only. Six steps, in order. Steps 1 and 2 run before any file is modified, and so does Step 5's baseline capture — only its diff runs at the end. Validation of the Splice is the vitest work in the Testing Strategy section, and validation of the ingest is section 7.2's dry run plus section 7.4's read-back; both come *after* these six, because the ingest consumes the artifact these steps certify.

**Step 1 — Pre-transcription rule scan.** Apply the validator's `BRANDS`, `DOSE_PATTERNS`, `PII_PATTERNS`, and `VAGUE_REDFLAG` rule sets, plus a `[[` scan, to the *mapped-only* V2 text of all 24 cards. Already run during design: zero hits in every category. This catches a blocker-class problem in the source before it is written into `corpus_data.py`, when the cost of a decision is a conversation rather than a revert. It also protects Requirement 5.5, since `POSSIBLE_DOSING` scans Filipino text and a stray `500 mg` would add a warning code absent from the baseline.

**Step 2 — Correlation report.** `extract` prints the 24-row correlation table (card id, ordinal, legacy record ordinal, legacy code, corrected code, title-match state, mapped-section lengths against their `CHAR_LIMITS` bounds, dropped-paragraph count). The title-match column reads `exact` on 19 rows and `expected_v2_retitle` on PE-005, PE-007, PE-012, PE-015, and PE-023; any other value means the run aborted. Reviewed before `apply` runs.

**Step 3 — `verify`.** After `apply`, re-derive all 120 expected strings from the docx and byte-compare against `RECORDS`. This is what makes the transcription a checkable claim instead of a diff someone skimmed. It also re-asserts the correlation — the four numeric signals as hard checks, the title as a reported signal against `EXPECTED_TITLE_MISMATCHES` — so `verify` alone is sufficient evidence that no content crossed conditions.

**Step 4 — Build and read the validator output.** Run from `architecture/` and again from the repo root; both must exit 0 and write to `architecture/`.

Expected stdout: `rows=24 blockers=0 warnings=50`, `blocked rows: 0`, and a warning breakdown of `NO_PH_SOURCE` and `LONG_SENTENCES` only. The 50 decomposes exactly as the Warning_Baseline glossary entry records it: **24 `NO_PH_SOURCE` + 26 `LONG_SENTENCES`**, the 26 being **22 on `red_flags_en` and 4 on `self_care_en`**, spread across 22 rows of which 4 carry two findings each. No `LONG_SENTENCES` finding lands on `explanation_en` in the baseline, even though the rule reads that column too.

Blocker risks specific to the Filipino side, and why each is expected clear:

| Blocker | Risk on Filipino edit | Expectation |
|---|---|---|
| `OVER_LIMIT` | joined red-flag strings are the longest derived values | every value at or below its `CHAR_LIMITS` bound. Longest observed is `red_flags_fil` at roughly 350 against a 1000 bound — informative only; the pass condition is the bound, so a small join-detail delta is not a failure |
| `VAGUE_RED_FLAG` | the rule's phrase list is English; a Filipino value containing an English fragment such as `as needed` would still trip it | zero hits in Step 1 |
| `BRAND_NAME` | Filipino patient register is exactly where `Biogesic` or `Neozep` would appear | zero hits in Step 1; V2 uses `plano o reseta ni Doc` rather than naming products |
| `POSSIBLE_PII` | V2's conversational register raises date, age, and contact risk | zero hits in Step 1; the greeting line that would have carried a name is dropped as placeholder-bearing |
| `PLACEHOLDER_IN_CONTENT` | **two** placeholder-bearing paragraphs per card — the `Kumusta po, [[preferred_name]]` greeting and `Sa [[followup_due_at]], reply lang:` — 48 across the corpus | excluded by the line-level filter; `verify` asserts zero `[[` across all 18 columns |
| `REQUIRED_EMPTY` | a mis-parsed heading yields an empty required column | extraction aborts on an empty mapped section rather than emitting one |

**Step 5 — Warning-set diff against baseline.** The committed report is the baseline. **The baseline must be captured to a scratch file before any tracked file is modified** — that is, before Step 3's `apply` and before Step 4's build, both of which overwrite `architecture/corpus_validation_report.md` in place. Reading the baseline afterwards makes the comparison worthless: `git show HEAD:` resolves against whatever `HEAD` is at that moment, so any commit landing between the transcription and the diff — including the transcription commit itself — would return the already-regenerated report and produce a trivially empty diff that proves nothing.

So the capture happens first, and the source commit is pinned and recorded:

```bash
# BEFORE Step 3 (apply) — no tracked file has been modified yet.
BASELINE_COMMIT=$(git rev-parse HEAD)
git show "$BASELINE_COMMIT:architecture/corpus_validation_report.md" \
  > /tmp/corpus_report_baseline.md
echo "$BASELINE_COMMIT" > /tmp/corpus_report_baseline.commit
```

```bash
# AFTER Step 4 (build) — compare against the pre-modification capture.
diff /tmp/corpus_report_baseline.md architecture/corpus_validation_report.md
```

The recorded evidence cites the pinned `$BASELINE_COMMIT` hash, not `HEAD`, so the comparison stays reproducible and auditable after further commits land. `/tmp/` here is a scratch location outside the checkout, so the capture is never itself a tracked file.

The expected result is an empty diff, and the reason is structural rather than lucky: `NO_PH_SOURCE` reads `source`, and `LONG_SENTENCES` reads `explanation_en`, `self_care_en`, and `red_flags_en` only. Both inputs are frozen, so a Filipino-only replacement cannot move either count. That makes the diff a genuine test of the freeze: any output difference means something English-side or source-side moved when it should not have. If the diff is non-empty, Requirement 5.6 applies and each added or removed warning is accounted for in writing before the change is considered done.

**Step 6 — Column-scoped freeze proof.** `freeze` reads both CSVs with `csv.DictReader` and compares, cell by cell, the union of `English_Columns`, `Provenance_Columns`, and `condition_name_fil` — 13 of 18 columns x 24 rows = 312 cells — after asserting identical header rows and identical `icd10_code` sequences. Zero differing cells is the pass condition, and the tool prints the compared-cell count so a silently empty comparison cannot pass as success. A whole-file diff would be useless here, because the five replaced columns are *supposed* to differ; scoping is what turns the diff into evidence.

The extended JSON is the stronger case: `_ext` and `condition_name_en` are untouched, so `patient_education_extended_v2.json` must be byte-identical to the v1 file. `freeze` asserts that with a direct byte comparison, and any difference means something reached `_ext` that should not have.

**Mutation checks on the gate itself.** Two negative tests confirm the validator still bites, run in a temp directory containing copies of `corpus_data.py` and `build_corpus.py` so the tracked files are never mutated, and deleted afterwards:

- inject `[[test]]` into one `explanation_fil` → expect a `PLACEHOLDER_IN_CONTENT` blocker and a non-zero blocker count (Requirement 3.4);
- pad one `explanation_fil` past 1500 characters → expect an `OVER_LIMIT` blocker naming the column, the character count, and the limit (Requirement 5.3).

**Idempotence.** Run the build twice; the three output files must be byte-identical across runs.

## Documentation Edits

`architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md` gains three sections, and the 18-column table is not touched:

> **Filipino content revision (V2, 2026-08-06).** The six-section Filipino content in the v2 artifacts comes from `BayanHealth_Patient_Education_Corpus_V2_Corpus_Only_Linked.docx`, a Filipino-only rewrite of the same 24 conditions. It replaces `explanation_fil`, `what_to_expect_fil`, `self_care_fil`, `red_flags_fil`, and `followup_fil`; `condition_name_fil` is unchanged. **V2 also supplies shorter, register-simplified Filipino condition titles for 5 of the 24 conditions — PE-005, PE-007, PE-012, PE-015, and PE-023 — and those retitles were deliberately not adopted.** `condition_name_fil` is held at its V1 value on every row, so the condition name a patient sees is unchanged by this revision even where the V2 source document names it differently. English clinical text is frozen at its V1-approved wording, so the bilingual pair is now accepted as **approximate rather than parallel** — the two languages carry the same clinical meaning at different registers, and the Filipino side is deliberately plainer. V2 carries the same clinical sign-off as V1 (Marco Paolo Perpetua, General Physician, 2026-08-06), so no new review date applies and no row's `review_date` advances. The column set, the character limits, and the ingest rules are unchanged. Red-flag bullets in the source document are joined into a single `red_flags_fil` sentence following the V1 formatting convention.

That single section carries Requirements 6.1, 6.2, and 6.7 — the last being the explicit record that the five V2 retitles were not adopted.

A second section carries the four obligations added with the scope expansion, Requirements 6.8 through 6.11, plus 9.4 (the immutability note quoted in section 8):

> **From artifact to screen.** The v2 artifacts change nothing a patient can read until `backend/scripts/ingest-patient-education-corpus.ts` writes them into `app_core`. Retrieval is `findPatientEducationForDiagnosis`, which reads `app_core` only; no runtime code reads a corpus CSV, so a committed CSV is a file until it is ingested (6.8).
>
> **Alias stability is the payoff of declining the V2 retitles.** `aliasKeysFor` derives its keys from `icd10_code`, `condition_name_en`, and `condition_name_fil`, and all three are frozen. Holding `condition_name_fil` at its V1 value therefore makes a v2 ingest a same-key overwrite of the same 24 article keys and the same 71 alias keys, with no orphaned alias left resolving to stale content (6.9).
>
> **Before the Splice, the reviewed Filipino reached a patient only through the deterministic template** — that is, only on provider failure, provider timeout, or a tripped gate. Approved wording surviving only on the failure path is an inversion, and the Splice removes the dependency by composing model-authored English with corpus-supplied Filipino on the success path (6.10).
>
> **The contract already permitted the bilingual payload.** `contracts/openapi.yaml` defines `CdsPatientEducationPayload.language` as `[english, taglish, bilingual]` with `titleFilipino`, `icd10Code`, `citation`, and `corpusVersion`, and `CdsPatientEducationSection.language` as `[english, filipino]`. The output validator was narrower than the contract it serves, so the fix widens the validator and leaves the contract and its generated types untouched (6.11).

A third section carries Requirement 10's documentation criteria — 10.2 through 10.6 and 10.14, plus the follow-up in 10.15. It is written as the answer to a question that will be asked again, so it leads with the answer:

> **Two registers, and the second one is Taglish.** This corpus carries exactly **two** registers, not three. There is no Tagalog register and no separate Taglish register, because the second register **is** Taglish.
>
> **The `*_fil` columns hold code-switched Filipino carrying English clinical terms, deliberately.** That is what a Filipino patient actually reads, and it is what the approving physician signed off. The content states it plainly: red-flag bullets read `May chest pain`; self-care reads `Sundin lang ang medicines na nasa plano o reseta ni Doc`; cards head a section `Trabaho at safety`; and `medicines`, `fluids`, `check-up`, `ER`, and `prescription` appear throughout the Filipino side. The register was already code-switched before the V2 revision — v1 wrote `Sundin lang ang medicines na nasa doctor-approved Plan o prescription` — so naming it Taglish is not a consequence of V2 (10.2).
>
> **This is a naming correction over content that already exists, not a request for new content.** No column, field, or clinical string is added. This document has asked for a "Common Filipino/Taglish name" in `condition_name_fil` since the first ingest, so the ambiguity predates the V2 revision and the correction applies equally to v1 (10.3).
>
> **The `taglish` value in the payload enum is a different thing.** `CdsPatientEducationPayload.language` admits `taglish`, and that member denotes **model-generated output with no corpus backing** — what the generation path may publish for a diagnosis that has no approved article. It is not reviewed retrievable content, it carries no citation, and it is never what a `*_fil` column holds (10.4).
>
> **A third stored register would require a contract change, which is out of scope.** `CdsPatientEducationSection.language` is the only place a *stored* register is tagged, and its enum is exactly `[english, filipino]` with `additionalProperties: false`. A third register cannot be represented without adding an enum member to `contracts/openapi.yaml` and regenerating types, which the accepted specification forbids — on top of 120 new clinical strings, a fresh physician sign-off, an amendment to ADR-20260804-01's bilingual approval condition, `BilingualText` becoming a triple, six new CSV columns, and a three-way frontend toggle (10.5).
>
> **Three `taglish` occurrences in the codebase are unrelated to this corpus.** `validLang = ['english', 'taglish']` in `backend/src/handlers/cds.ts` validates a request field on the retired patient-cards path. `patientEducation.taglish[]` in `backend/src/lib/cds/solver-content.ts`, documented in `architecture/AI_INFERENCE.md`, holds 25 Taglish strings across 5 solver entries — keyed by **solver id**, not by ICD-10, with no reviewer, no review date, and no citation, reachable only from the retired `handlePatientCards` (ADR-20260806-03). Neither is corpus-backed, neither is reachable from `findPatientEducationForDiagnosis`, and neither may be promoted into approved content, because ADR-20260804-01 makes citation mandatory and review status a visibility gate (10.6).
>
> **`language: 'bilingual'` denotes exactly these two registers** — the **English register** in the `*_en` columns, tagged `english`, and the **Taglish register** in the `*_fil` columns, tagged `filipino`. A `bilingual` payload carries four `english` sections, four `filipino` sections, `titleFilipino`, and `warningSigns` as `[English red flag, Taglish red flag]`. The word `bilingual` is unchanged and still accurate: two registers is two, whatever the second is called (10.14).
>
> **The stored identifier stays `filipino`; only the displayed label changes.** The section tag value, the six `*_fil` column names, `BilingualText.filipino`, and the ingest script's required-column list all keep the name `filipino`, because renaming them means a contract change and a partial rename fails silently rather than loudly. What a patient sees on the reading-language toggle is `Taglish`. If you are reading code and wondering why the two disagree, that is the reason, and it is recorded in ADR-20260824-01.
>
> **Known follow-up.** `groundingPassagesFor` in `backend/src/lib/cds/patient-education.ts` labels its Filipino grounding passages `(FIL):` in the prompt it builds. That label is model-facing rather than patient-facing, and that file is frozen by the accepted specification, so it is left as-is and recorded here rather than changed (10.15).

`architecture/corpus_data.py`'s module docstring gains the matching provenance paragraph (section 4), including the non-adoption of the five retitles so that the note sits beside the frozen `condition_name_fil` literals themselves.

`architecture/build_corpus.py`'s docstring is updated for v2 output names and the checkout-relative path.

### Explicit non-changes

| Not changed | Why |
|---|---|
| ~~`architecture/DECISIONS.md`~~ — **no longer a full freeze** | Superseded by section 9.6. Two edits are now permitted and required: appending `ADR-20260824-01`, and appending a register cross-reference clause to ADR-20260804-01's `Status` line. What still does not change is ADR-20260804-01's `Context`, `Decision`, `Alternatives considered`, `Consequences`, and `Related files` — the keyed-ICD-10 retrieval design, the **bilingual approval condition**, the citation requirement, the admin-only CSV ingest, and the no-embeddings/no-vector-store position all stand as written, and the bilingual condition is satisfied by two registers rather than three (Requirements 6.3, 10.12, 10.13; Property 32) |
| `PatientEducationArticle` type | column set unchanged, so the type is unchanged |
| The `filipino` identifier, everywhere it appears | The Section_Language_Tag value in `contracts/openapi.yaml`, the six `*_fil` column names, `BilingualText.filipino`, `group.filipino` in the frontend API module, and the frontend `Language` union member all keep the name. Only *displayed* text becomes `Taglish` — renaming the identifier would mean a contract change, a regenerated type set, six column renames, and an edit to a frozen ingest script, and a partial rename fails silently rather than loudly (section 9.5; Requirements 10.7, 10.9; Properties 28, 29) |
| `BilingualText` | Stays a pair, and stays in a file frozen by Requirement 2.7. A third member would change `bilingual()`'s fail-closed parse, `groundingPassagesFor`'s passage pairs, and `patientEducationTemplate`'s section count from 8 to 12, invalidating Property 20 (section 9.2) |
| The Ingest_Script's `REQUIRED_COLUMNS` | Reads the same 18 columns. No `*_tgl` column exists to require, and the script is frozen by Requirements 2.7 and 8.14 in any case (Requirement 10.7; Property 28) |
| `backend/scripts/ingest-patient-education-corpus.ts` | the script is **run** (section 7) but not **edited**: it already accepts a CSV path and `--corpus-version`, so it consumes v2 unchanged, and its non-`dev` guard and `ALLOW_NON_DEV_CORPUS_INGEST` escape hatch stay exactly as written (Requirements 2.7, 8.14) |
| `contracts/openapi.yaml` and the generated contract types | the contract already permits every field the Splice publishes, so the validator widens and the contract does not (Requirement 7.15) |
| `backend/src/lib/cds/patient-education.ts` | `PatientEducationArticle`, `groundingPassagesFor`, `citationFor`, `aliasKeysFor`, `normalizeEducationKey` all untouched; the Splice consumes the article's projection, not the article (Requirement 2.7) |
| `backend/src/lib/cds/released-patient-education.ts` | released artifacts serve a stored payload; no re-release, backfill, or rewrite path is introduced (Requirements 9.5, 9.6) |
| `groundingPassagesFor` | reads article fields, not the CSV |
| Schema column set, names, order, limits, required flags | unchanged; the v2 CSV header is byte-identical to v1's |
| Validator rule sets, thresholds, and severities | unchanged; only paths, filenames, and the docstring move |
| `PENDING_REVIEWER` / `PENDING_DATE` | retained as validator sentinels. They are not reintroduced into any record — all 24 rows already carry the real reviewer and date |

## Out of Scope

This section was rewritten by the approved scope expansion. Two of its three original bullets no longer hold, and saying so is more useful than quietly deleting them.

**Moved into scope:**

- **`dev` corpus ingest.** Previously listed here as out of scope. It is now Requirement 8's gated scope: a non-mutating dry run, then a write pass that runs only against its own current, unused, operation-specific point-of-action authorization for this operation, this table, `dev`, and one window — or `DEFER` with zero mutation (section 7).
- **Backend TypeScript.** Previously "none". The Splice edits `backend/src/lib/cds/protected-output-adapters.ts` and adds one import plus one call-site argument in `protected-generation.ts` (section 6.10).
- **The vitest/fast-check suite.** Previously "intentionally not extended". It is extended — see the Testing Strategy section, which corrects the claim.
- **Two frontend files.** `frontend/` was previously out of scope in its entirety. **Exactly two files are now in**, and only their displayed text and the assertions matching it: `PatientEducationCard.tsx` (the toggle label at line 166, the unavailable-register string at line 198, and the doc comments naming the register) and `PatientEducationCard.test.tsx` (the `/^Filipino$/` assertions and the prose describing them). Everything else under `frontend/` remains out, including `frontend/.../lib/api/patientEducation.ts`, which needs no change because its `filipino` occurrences are identifiers and it renders no register name (section 9.4, Requirement 10.16).
- **Two `DECISIONS.md` edits.** That file was previously frozen entirely. **Exactly two edits are now permitted**: appending `ADR-20260824-01`, and appending a register cross-reference clause to ADR-20260804-01's `Status` line. No third edit, and no change to any other ADR (section 9.6, Requirements 6.3, 10.12, 10.13).

**Still out of scope:**

- **A third register, by any route.** No `*_tgl` CSV column, no third `PatientEducationArticle` field, no third `BilingualText` member, no `taglish` member on `CdsPatientEducationSection.language`, and no third register in the frontend toggle. The content a third register would carry already exists under the name `filipino`; what is missing is an accurate label, and that is what this feature supplies (Requirements 10.1, 10.17; Property 28).
- **Renaming any existing `filipino` identifier.** The Section_Language_Tag value, the `*_fil` column names, `BilingualText.filipino`, and the frontend `Language` union member all keep their names (Requirements 10.7, 10.17).
- **Promoting the solver content store's Taglish strings.** The 25 strings in `backend/src/lib/cds/solver-content.ts` are uncited, unreviewed, keyed by solver id rather than ICD-10, and reachable only from the retired `handlePatientCards`. They are not drawn on, and `solver-content.ts` is not modified (section 9.3).
- **The `(FIL):` grounding-passage label** in `groundingPassagesFor`. Recorded as follow-up; `patient-education.ts` is frozen by Requirement 2.7 (section 9.8, Requirement 10.15).
- **The `taglish` member of `CdsPatientEducationPayload.language`, and `validLang` in `backend/src/handlers/cds.ts`.** Both are read and documented as unrelated to the corpus, and neither is touched (section 9.3).

- **`staging` and `prod` corpus ingest** (Requirement 8.13). No dry run, no write pass, no read-back. `ALLOW_NON_DEV_CORPUS_INGEST` is not set.
- **Every AWS mutation other than the `dev` corpus ingest.** No Terraform apply, no policy seed, no CDS mode enablement, no alarm change, no DLQ drain, no release or re-release of any artifact. The `dev` ingest authorization covers the corpus write and nothing adjacent to it.
- **Contract and generated-type changes** (Requirement 7.15). The contract already permits the bilingual payload.
- **Frontend changes beyond the two register-label files, and all infrastructure changes.** The bilingual payload was already contracted, so no frontend type regenerates and no data-shape work follows; the only frontend edit is displayed text (section 9.4). No Terraform is touched.
- **Promotion of any kind.** A `dev` ingest plus a green local suite is dev evidence. It is not staging qualification, not canary authorization or observation, and not production enablement or GA.

### Recorded follow-ups

| Location | Issue | Decision |
|---|---|---|
| `backend/src/tools/cds-demo-readiness.ts` line 207 | remediation hint hardcodes `../architecture/patient_education_corpus_v1.csv --corpus-version v1`; stale once the v2 artifacts land and the `dev` ingest runs | **Now in scope — fix it.** See below |
| `backend/scripts/ingest-patient-education-corpus.ts` lines 6 and 37 | docstring and usage example cite the v1 CSV path and `--corpus-version v1` | **Still deferred.** See below |
| `_ext.occupational_advice_fil` and the V2 `Trabaho at safety` section | V2 rewrites occupational advice in the plainer register, but `_ext` is untouched by this feature, so the two now differ in register | Deferred; `_ext` is not a schema column and nothing in the runtime path reads it |
| `backend/src/lib/cds/patient-education.ts` — `groundingPassagesFor`'s `(FIL):` passage label | Names the register `FIL` where the patient-facing label now reads `Taglish`. Model-facing prompt text, not patient-facing | **Deferred**, on the same freeze ground as the ingest docstring: Requirement 2.7 freezes the file, no patient reads the label, and editing grounding-passage bytes for a naming reason perturbs a prompt the Splice depends on and a bundle digest `soap-multi-transaction-cds` requires to be stable (section 9.8, Requirement 10.15) |
| `backend/src/handlers/cds.ts` `validLang`, and `backend/src/lib/cds/solver-content.ts` `patientEducation.taglish[]` | Both use `taglish` for content unrelated to the corpus; the 25 solver strings are real Taglish text with no reviewer, no citation, and no ICD-10 key | **Deferred and documented, not fixed.** They belong to the retired patient-cards path (ADR-20260806-03). Naming them in the ADR and the Schema_Document is the fix this feature makes, so the next reader stops mistaking them for a third register (section 9.3, Requirement 10.6) |
| `defaultContentValidation`'s `prescription` finding count in section 6.7 | Measured against v1. After the merge, J06.9's `self_care_fil` no longer contains the word, so the count is 2 occurrences across 2 articles rather than 3 | **No action; the decision is unchanged.** J06.9 still trips on frozen `self_care_en` and I10 still trips on `self_care_fil`, so the medication-scan scoping in 6.7 remains required (section 9.1) |

The two TypeScript follow-ups were originally deferred on one shared ground — "comment and hint text in files this feature must not touch". That ground has dissolved for one of them and survives for the other, so they now part company.

**`cds-demo-readiness.ts` moves into scope.** The Splice already opens `backend/src/lib/cds/`, and section 7 makes the v1 hint actively wrong rather than merely stale: after the `dev` ingest, an operator who hits the warn branch and pastes the printed remediation would re-ingest **v1 over v2**, silently reverting the corrected Filipino on all 24 articles. That is not a stale comment, it is a documented instruction to undo the feature. It is a two-token edit — `_v2.csv` and `--corpus-version v2` — in a tool this feature's own verification uses, and leaving it deferred would mean shipping a footgun to preserve a boundary that no longer exists. The surrounding `detail` text stays as it is: "patient education still generates, falling back to the generic grounding bundle and deterministic template" remains an accurate description of the no-article path (section 6.9).

**The ingest script's docstring stays deferred.** Requirements 2.7 and 8.14 both say the ingest script is unmodified, and 8.14 names the guard specifically. Editing its docstring in the same change that runs it would mean the artifact under `--dry-run` review is not byte-identical to the reviewed script, and "the script is unmodified" is a cheap, verifiable claim worth keeping intact — `git diff --name-only` either lists that file or it does not. The docstring is also self-limiting: it is an example invocation inside a file whose real invocation is recorded in section 7.2. Follow-up, not now.

Any other finding surfaced while validating is recorded as follow-up rather than fixed, per Requirement 6.6.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

A note on how these are checked. Properties 1 through 16 cover the corpus merge, which is a fixed population of 24 records and 24 cards, so they are verified by **exhaustive enumeration over the entire population** rather than by random sampling. Exhaustive coverage of a finite domain is a stronger guarantee than 100 sampled iterations, and it is what `verify`, `freeze`, and the validator run already do. Properties 1 and 8 quantify over generated inputs rather than the fixed corpus, because they constrain pure functions whose domain is unbounded.

Properties 17 through 27 cover the Splice and the ingest, and they split differently. **17 through 23 are unbounded in the model's output**, which is exactly where randomized generation earns its keep: the model may return any heading, any section count from 1 to 20, duplicated headings, or a heading set disjoint from the corpus, and the composed payload must be correct for all of them. Those are `fast-check` properties over a generated model candidate crossed with a generated article, run through the real validator with at least 100 cases each. **24 through 27** constrain a script, a projection, and a change set, so they are checked exhaustively or by inspection rather than by sampling.

**28 through 32 cover the register clarification** (section 9). Four of the five are change-set and source-text assertions checked by grep and `git diff --name-only` rather than by sampling, because what they constrain is a diff rather than a computation — a register cannot be "mostly" absent. Property 29 is the exception with a runtime half: the card is rendered in both toggle states and the displayed text is read back, which is what the existing `PatientEducationCard.test.tsx` already does.

### Property 1: Placeholder-bearing lines never reach a schema column

For any V2 paragraph containing the substring `[[`, at any position, the transcription filter excludes that paragraph from every one of the 18 schema columns.

**Validates: Requirements 3.1**

### Property 2: No placeholder token survives in the corpus

For all records in `RECORDS` and all 18 `CORE_COLUMNS`, the field value contains no `[[` substring. The claim is scoped to the schema columns; `_ext.dynamic_slots` legitimately contains placeholders and is excluded by the same scoping the validator already applies.

**Validates: Requirements 3.2**

### Property 3: Every mapped section lands in its own record's mapped column

For all 24 V2 cards and for each of the five Section_Mapping entries, the text derived from that card's section by the documented transcription rules is byte-equal to the mapped Filipino column of the record whose card identifier, legacy ordinal, legacy code, corrected code, and Filipino condition-name title all match that card.

**Validates: Requirements 1.2**

### Property 4: No Filipino content crosses conditions

For any two distinct records, no non-empty Filipino_Replaced_Column value of one equals the corresponding value of the other, and every derived value matches exactly one card.

**Validates: Requirements 1.5**

### Property 5: Unmapped V2 sections appear nowhere in the corpus

For all 24 V2 cards and every paragraph of that card not claimed by the Section_Mapping — the greeting, `Trabaho at safety`, the reply-scale block, the teach-back question, the card title, and the metadata cells — no normalized fragment of that paragraph appears in any of the 18 columns of any record.

**Validates: Requirements 1.4**

### Property 6: English, provenance, and Filipino condition names are frozen

For all 24 rows and for every column in the union of `English_Columns`, `Provenance_Columns`, and `condition_name_fil`, the v2 CSV cell is byte-equal to the v1 CSV cell at the same row and column, with both files sharing an identical header row and identical `icd10_code` sequence. This holds on all 24 rows including PE-005, PE-007, PE-012, PE-015, and PE-023, whose V2 card titles differ from `condition_name_fil`: the V2 retitles are not adopted, so their presence in the source document must leave no trace in the artifact.

**Validates: Requirements 1.3, 2.1, 2.2**

### Property 7: Clinical sign-off is carried, not renewed

For all 24 rows of the v2 artifacts, `reviewed_by` equals `Marco Paolo Perpetua, General Physician` and `review_date` equals `2026-08-06`, and no row equals `PENDING_REVIEWER` or `PENDING_DATE`.

**Validates: Requirements 2.3**

### Property 8: Red-flag joining preserves every trigger

For any non-empty list of trigger strings containing no comma and no terminal period, the joined `red_flags_fil` string contains each trigger's text exactly once in input order, opens with the imperative lead-in, separates items with `, ` and `, o ` before the last, and ends with the ER escalation sentence — with no doubled punctuation and no duplicated imperative.

**Validates: Requirements 1.2**

### Property 9: Alternate codes stay empty and uncontradicted

For all 24 rows, `icd10_code_alt` is empty, and no code appearing after `Alt:` in a card's `Legacy code` cell appears in any record's `icd10_code_alt`.

**Validates: Requirements 2.5**

### Property 10: Row identity is preserved across versions

The v2 CSV contains exactly 24 data rows whose `icd10_code` sequence is identical to the v1 CSV's, and the v2 extended JSON's key set is identical to the v1 extended JSON's.

**Validates: Requirements 1.1, 1.7**

### Property 11: Every replaced value is within its character limit

For all 24 records and each of the five Filipino_Replaced_Columns, the value length is at or below that column's `CHAR_LIMITS` bound — 1500 for `explanation_fil` and `self_care_fil`, 1000 for `what_to_expect_fil` and `red_flags_fil`, 500 for `followup_fil`.

**Validates: Requirements 5.2**

### Property 12: No blocker-class finding is produced

For all 24 records, the Corpus_Validator produces no finding with code `OVER_LIMIT`, `VAGUE_RED_FLAG`, `BRAND_NAME`, `POSSIBLE_PII`, `PLACEHOLDER_IN_CONTENT`, or `REQUIRED_EMPTY`, and the total blocker count is 0.

**Validates: Requirements 5.1, 5.4**

### Property 13: The warning code set stays within the baseline allowlist

For every warning the Corpus_Validator emits, its code is a member of `{NO_PH_SOURCE, LONG_SENTENCES}`.

**Validates: Requirements 5.5**

### Property 14: LONG_SENTENCES findings are identical to baseline

The multiset of `LONG_SENTENCES` findings — code, ICD-10 code, column, and reported average — in the regenerated Validation_Report equals the multiset in the baseline report, since the rule reads only frozen English columns.

**Validates: Requirements 5.7**

### Property 15: V1 artifacts are invariant across builds

For any number of Corpus_Build_Script runs, the bytes of `architecture/patient_education_corpus_v1.csv` and `architecture/patient_education_extended_v1.json` are unchanged, and both files remain present.

**Validates: Requirements 4.5**

### Property 16: The build is idempotent and location-independent

For any working directory from which the Corpus_Build_Script is invoked, it writes the same three files into the script's own directory, and running it twice against an unchanged `corpus_data.py` produces byte-identical output each time.

**Validates: Requirements 4.1, 4.4**

### Property 17: Filipino sections on the model path are byte-equal to the corpus

For any approved article and any accepted model candidate, every section of the published payload tagged `language: 'filipino'` has content byte-equal to the corresponding field of `patientEducationTemplate(article)`, regardless of what the model wrote, how many sections it returned, or what it named them.

**Validates: Requirements 7.3**

### Property 18: Corpus-owned fields on the model path come from the corpus

For any approved article and any accepted model candidate, the published payload's `language` equals `bilingual` and its `title`, `titleFilipino`, `icd10Code`, `citation`, and `corpusVersion` are byte-equal to `patientEducationTemplate(article)`'s, independently of the model's own values for those fields.

**Validates: Requirements 7.1, 7.2, 7.4**

### Property 19: Warning signs are the two reviewed red-flag strings, never the model's

For any approved article and any accepted model candidate — including one that supplies its own `warningSigns` — the published payload's `warningSigns` is exactly `[article.redFlags.english, article.redFlags.filipino]` in that order, and no model-supplied warning-sign string appears anywhere in the published payload.

**Validates: Requirements 7.5, 7.6**

### Property 20: Section pairing is total, bounded, and slot-shaped

For any approved article and any accepted model candidate carrying 1 to 20 sections with arbitrary headings, the published payload carries exactly 8 sections — the four corpus headings in corpus order, each once as `english` and once as `filipino` — and each English content is either the model's content for that exact heading or the article's approved English for it. A model heading with no corpus counterpart appears nowhere in the published payload; a corpus heading the model omitted retains its approved English.

**Validates: Requirements 7.3, 7.4, 7.9**

### Property 21: Both generation paths agree byte for byte on corpus-sourced fields

For any approved article, the payload published by the model path and the payload published by the deterministic template path have byte-equal `title`, `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, `warningSigns`, section count, section headings, section language tags, and `filipino` section contents. The two payloads may differ only in the content of sections tagged `english`.

**Validates: Requirements 7.16**

### Property 22: Filipino that did not come from the corpus is rejected

For any candidate carrying a section tagged `language: 'filipino'`, or a `citation`, `corpusVersion`, or `titleFilipino` field, or `language: 'bilingual'`, submitted as provider output, the validator rejects it; and for any candidate claiming `language: 'bilingual'` when no article was retrieved, the validator rejects it.

**Validates: Requirements 7.7, 7.8, 7.13**

### Property 23: The no-article path is unchanged

For any provider candidate accepted when no article was retrieved, the published payload is byte-equal to what today's validator returns for the same candidate: `language` is `english` or `taglish`, and `titleFilipino`, `icd10Code`, `citation`, `corpusVersion`, and every `filipino`-tagged section are absent. No citation is synthesized.

**Validates: Requirements 7.10, 7.11, 7.12**

### Property 24: Re-ingest overwrites the same keys and orphans nothing

For any two successive ingests of corpus artifacts whose `icd10_code`, `condition_name_en`, and `condition_name_fil` columns are byte-equal, the written key set is identical — the same 24 `PATIENT_EDU#<ICD10> / APPROVED` article keys and the same 71 `PATIENT_EDU#ALIAS#<normalized> / APPROVED` alias keys — no item is deleted, and after the second ingest every article and alias item carries the second run's `corpusVersion` and a one-year `Ttl.PatientEducation`.

**Validates: Requirements 8.9, 8.10, 8.12**

### Property 25: The dry run decides exactly what the write pass would, and writes nothing

For any corpus CSV, a `--dry-run` pass issues zero DynamoDB requests, and it accepts a row if and only if the write pass would accept the same row; a rejected row contributes no partial write in either mode and forces a non-zero exit.

**Validates: Requirements 8.3, 8.5, 8.8**

### Property 26: Released artifacts are a function of their stored payload alone

For any stored artifact item, the released projection depends only on that item's own fields, so for any corpus state before or after ingest the projection of an unchanged item is byte-identical. No corpus read occurs on the released-artifact path.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 27: The frozen surface is untouched

The change set contains no modification to `contracts/openapi.yaml`, the generated contract types, `backend/src/lib/cds/patient-education.ts`, `backend/scripts/ingest-patient-education-corpus.ts`, or `backend/src/lib/cds/released-patient-education.ts`.

*Amended by section 9.* `architecture/DECISIONS.md` was previously listed here as untouched. It is no longer: Requirement 6.3 permits exactly two edits to it, and Property 32 bounds them.

**Validates: Requirements 2.7, 7.15, 8.14, 9.5, 9.6**

### Property 28: No third register is introduced anywhere in the change set

For every file in the change set, and for every register-bearing surface in it, the set of registers remains exactly two. Concretely: the CSV header is the same 18 `CORE_COLUMNS` with no `*_tgl` member; `REQUIRED_COLUMNS`, `CHAR_LIMITS`, and `EXT_CONSTANTS` gain no key; `PatientEducationArticle` and `BilingualText` gain no field; `CdsPatientEducationSection.language` gains no enum member; the frontend `type Language` union has exactly two members; every `bilingual` payload either path publishes carries exactly two distinct section `language` values; and no added line in any changed file introduces a `taglish`-tagged stored register or a rename of an existing `filipino` identifier.

**Validates: Requirements 10.1, 10.7, 10.17**

### Property 29: The label and the identifier diverge, and both halves hold

For any rendered `bilingual` article and either toggle state, every **register name the component itself emits** — the two toggle button labels and the unavailable-register hint — names the second register `Taglish` and never `Filipino`; and simultaneously, for every value the component compares or keys on — the `Language` union members, the toggle option list, the value compared against `CdsPatientEducationSection.language`, the guard selecting `titleFilipino`, and the index selecting the second `warningSigns` entry — the second register's value is `filipino` and never `taglish`. Unifying the two in either direction fails the property.

The quantification is over component-emitted text, not over the whole rendered container, because article content may legitimately contain the word "Filipino" — the existing `bilingualArticle()` fixture body reads `Paliwanag sa Filipino.` A container-wide text assertion would fail on approved content and would be testing the fixture rather than the label.

**Validates: Requirements 10.8, 10.9**

### Property 30: The frontend change set is confined to displayed text and its assertions

The change set touches exactly two files under `frontend/` — `PatientEducationCard.tsx` and `PatientEducationCard.test.tsx` — and within them every changed line is either a rendered string literal, a doc comment or test description naming the register in prose, or an assertion matching a rendered string. No changed line alters a type, an identifier, a contract field name, a fixture payload value, a `className`, an ARIA attribute, or control flow.

**Validates: Requirements 10.10, 10.16**

### Property 31: The contract's register vocabulary is unchanged, not merely the file

`contracts/openapi.yaml` and the generated contract types are byte-unmodified, and independently of the file diff, `CdsPatientEducationSection.language` enumerates exactly `[english, filipino]` and `CdsPatientEducationPayload.language` exactly `[english, taglish, bilingual]` — the same members, in the same order, with no addition, removal, or reordering. The byte check and the member check are both asserted, because a regenerated-then-reverted file passes one and a hand-edited enum could pass neither.

**Validates: Requirements 10.11, 7.15**

### Property 32: The governance change set is exactly two edits

The diff of `architecture/DECISIONS.md` consists of exactly two changes: one appended `### ADR-20260824-01` entry, and one modified `Status` line on `ADR-20260804-01`. No other line of that file is added, removed, or modified, and ADR-20260804-01's `Context`, `Decision`, `Alternatives considered`, `Consequences`, and `Related files` are byte-unchanged.

**Validates: Requirements 6.3, 10.12, 10.13**

## Testing Strategy

**Correction to the earlier version of this section.** It said "no property-based test suite is added" and "the repository's vitest/fast-check suite tests TypeScript, which this change does not touch." **The second clause is now false**, and the first is false as a consequence. The Splice is TypeScript in `backend/src/lib/cds/`, it is a pure function over an unbounded input (any model candidate crossed with any article), and it is the part of this feature that decides what a patient reads. It gets vitest coverage, including fast-check properties.

What survives from the original reasoning is the split. **The corpus-merge portion stays Python-verified**: a one-shot document transcription, a set of file emissions, and a documentation edit over a fixed 24-row population, where exhaustive checks cover 100% of the domain and randomized generation would test generators rather than the corpus. **The Splice portion is vitest-verified**, because its input domain is not fixed and its failure modes are shape-dependent.

Three existing files set the pattern to follow, and the new coverage sits alongside them rather than in a new harness:

- `backend/src/lib/cds/patient-education.test.ts` — the article fixture builder (`article(overrides)`), the `vi.mock('../dynamo.js')` document-client stub, and `fast-check` already imported. The Splice tests reuse that fixture builder for the article side.
- `backend/src/lib/cds/protected-output-adapters.test.ts` — the `harness(content)` factory over `createProtectedOutputAdapter` with an injected `completeWithChainSafe` and `renderTemplate`, a `PAYLOADS` record keyed by output type, and an existing `fc.constantFrom` property over `PROTECTED_OUTPUT_TYPES`. Splice tests extend `PAYLOADS.patient_education` and add a corpus-grounded input variant. **A regression test for the defect in section 6's fact table belongs here**: `validateProtectedOutputPayload('patient_education', patientEducationTemplate(article), { candidateOrigin: 'template', corpusEducation: ... })` must accept, and today it throws.
- `backend/src/lib/cds/released-patient-education.test.ts` — the stored-item fixture shape for the immutability check.

| Vehicle | Covers | Properties |
|---|---|---|
| `v2_corpus_tool.py verify` (exhaustive over 24 cards x 5 sections) | transcription equality, correlation, placeholder absence, cross-condition distinctness, unmapped-section absence | 2, 3, 4, 5 |
| `v2_corpus_tool.py freeze` (312 scoped cells + byte comparison of extended JSON) | English/provenance/condition-name freeze, sign-off values, alt-code emptiness, row identity | 6, 7, 9, 10 |
| `build_corpus.py` validator run | limits, blocker absence, warning allowlist | 11, 12, 13 |
| Report diff against a pre-modification baseline capture, pinned to a recorded commit hash | warning-set equality and per-warning accounting | 14, and Requirement 5.6 |
| Two-directory run, double run, before/after hashes of the v1 files | path resolution, idempotence, v1 invariance | 15, 16 |
| Sandboxed mutation tests in a temp directory | the gate still bites: injected placeholder, padded over-limit value | Requirements 3.4, 5.3 |
| Unit checks on the two pure helpers (`join_red_flags`, the placeholder filter), with generated inputs | bullet-join shape and placeholder exclusion beyond this document's inputs | 1, 8 |
| Change-set review (`git diff --name-only`) | scope boundary: backend TypeScript limited to the two Splice files plus the demo-readiness hint; frontend limited to the two register-label files; `DECISIONS.md` limited to the two permitted edits; no contract, no generated types, no ingest script, no infrastructure | 27, 30, 32, and Requirements 2.7, 6.3, 6.4, 6.5, 6.6 |

Splice and ingest coverage, all in `backend/`:

| Vehicle | Covers | Properties |
|---|---|---|
| `protected-output-adapters.test.ts` — fast-check property over a generated model candidate (1-20 sections, arbitrary/duplicated/disjoint headings, optional `warningSigns`) crossed with a generated article, run through the real `validateProtectedOutputPayload` | Filipino byte-equality, corpus-owned scalar fields, warning-sign substitution, slot-shaped pairing, unmatched-heading drop, omitted-heading retention | 17, 18, 19, 20 |
| `protected-output-adapters.test.ts` — the same generated article rendered through both paths, corpus-owned fields compared field by field | cross-path byte equality; fails loudly if a second corpus projection is ever introduced | 21 |
| `protected-output-adapters.test.ts` — negative cases: model-tagged `filipino` section, model `citation`/`corpusVersion`/`titleFilipino`, provider `language: 'bilingual'`, `bilingual` with no corpus context | validator rejection of non-corpus Filipino and of bilingual-without-article | 22 |
| `protected-output-adapters.test.ts` — two-argument calls to `validateProtectedOutputPayload` for `patient_education`, asserting byte-identical results to today | no-article path unchanged; also guards the six other output kinds against the context parameter | 23 |
| `protected-output-adapters.test.ts` — regression: `patientEducationTemplate(article)` through the validator in `'template'` mode, and all 24 shipped articles through `defaultContentValidation` and `assertNoPii` | the section 6 defect stays fixed; the J06.9/I10 `prescription` finding and the medication-scan scoping in 6.7 stay covered | 21, and Requirement 7.14 |
| `patient-education.test.ts` — `aliasKeysFor` over both CSVs' condition-name and code columns, asserting set equality and a count of 71 | alias-set stability across v1 and v2, checked in the repository with no AWS call | 24 (repository half) |
| `--dry-run` against `patient_education_corpus_v2.csv` with a stubbed document client asserting zero sends, plus the recorded real dry run from section 7.2 | dry run is non-mutating and decides what the write pass would | 25 |
| Read-back after the authorized write pass (section 7.4): keyed article read, 71 alias Gets, one filtered `Scan` | same-key overwrite, `corpusVersion: 'v2'`, one-year TTL, no orphaned alias | 24 (environment half), and Requirements 8.11, 8.12 |
| `released-patient-education.test.ts` — `toReleasedArtifact` over a stored item with v1 Filipino in `payload`, asserted byte-identical before and after the ingest | released artifacts are a function of their stored payload alone | 26 |
| `npm run typecheck`, `npm run lint`, `npm test` | the whole suite stays green with the widened validator signature | — |

Register-label coverage, all in `frontend/bayan-health-mvp/`:

The pattern is already in `PatientEducationCard.test.tsx` and the new coverage reuses it rather than adding a harness. Three existing fixtures do the work:

- **`bilingualArticle()`** (line 64) — a `ReleasedPatientEducation` with `language: "bilingual"`, `titleFilipino: "Pag-aalaga sa bahay"`, one `english` and one `filipino` section under a shared heading, and two `warningSigns`. It is the only article fixture the register tests need, and **its payload values do not change** — the register clarification is a label change, so a fixture edit would be a signal that the change strayed.
- **`toggleButton(container, label)`** (line 134) — resolves a toggle button by a regex over its text. This is the seam the label change moves: `/^Filipino$/` becomes `/^Taglish$/`, and the helper itself is untouched.
- **`mountCard(consultationId, poll)`** (line 93) — mounts the card against the module-mocked API and returns `{ container, cleanup }`.

| Vehicle | Covers | Properties |
|---|---|---|
| `PatientEducationCard.test.tsx` — the existing bilingual toggle test, retargeted to `toggleButton(m.container, /^Taglish$/)`, still asserting `titleFilipino`, the `filipino` section body, the second `warningSigns` entry, and `aria-pressed="true"` | the label reads `Taglish` while every selection still keys on `filipino`; the divergence holds in both directions | 29 |
| `PatientEducationCard.test.tsx` — the existing monolingual test, asserting `toggleButton(m.container, /^Taglish$/)` and `/^English$/` are both undefined and the `role="group"` toggle is absent | a monolingual article still offers no toggle, so the new label cannot promise a register that is not there | 29 |
| `PatientEducationCard.test.tsx` — a new assertion that, in both toggle states, no button inside `[role="group"][aria-label="Reading language"]` has text matching `/Filipino/`, checked against the unchanged `bilingualArticle()` fixture | no stale `Filipino` label survives on the toggle. Scoped to the toggle group rather than the container, because the fixture's own body text reads `Paliwanag sa Filipino.` and a container-wide assertion would fail on approved content | 29, 30 |
| `PatientEducationCard.test.tsx` — a new case where `bilingualArticle()` is given a heading present in `english` only, toggled to the second register, asserting the rendered hint reads `Not available in Taglish yet` | the second displayed string is covered, not just the toggle label | 29 |
| Source grep: zero `"Filipino"` rendered literals remain in `PatientEducationCard.tsx`, zero `/^Filipino$/` label assertions remain in the test, and `type Language`, the option list, and every `=== "filipino"` comparison are all still present and unchanged | the label/identifier split is asserted statically as well as at render time. `titleFilipino` and the fixture's `Paliwanag sa Filipino.` are excluded from the literal grep by name — one is a contract field, the other is content | 29, 30 |
| `git diff` review of `frontend/` restricted to the two files, line by line | no type, identifier, fixture value, `className`, ARIA attribute, or branch changed | 30 |
| Source assertion over `contracts/openapi.yaml`: both `language` enums enumerate exactly their current members | the register vocabulary is unchanged, independently of the file diff | 31 |
| `git diff architecture/DECISIONS.md` — one appended ADR block, one modified `Status` line, nothing else | the governance edit stays inside the two permitted changes | 32 |
| Change-set grep for `*_tgl`, a `taglish` section tag, a third `BilingualText` member, and renames of `filipino` identifiers | no third register entered by any route | 28 |
| `npm run lint`, `npm run typecheck`, `npm test` in `frontend/bayan-health-mvp/` | the frontend suite stays green; a two-string change should not move anything else | — |

Among the corpus properties, 1 and 8 are the only two with an unbounded input domain, so they are the only two where generated inputs add information there. If a lightweight generator is convenient (`random` over bullet lists and placeholder-injected strings, at least 100 cases each), use it there and nowhere else; everything else on the corpus side is exhaustive by construction. On the Splice side the situation inverts: 17 through 23 are all unbounded in the model's output and all get generated inputs, at least 100 cases each, tagged with the feature name and property number in the test description.

The definition of done now has four parts, and the first is unchanged.

**Corpus:** `rows=24 blockers=0 warnings=50` decomposing as 24 `NO_PH_SOURCE` + 26 `LONG_SENTENCES`, an empty report diff against the pre-modification baseline capture whose source commit hash is pinned in the recorded evidence, `verify` and `freeze` both exiting 0, every replaced value at or below its `CHAR_LIMITS` bound, and a byte-identical extended JSON between v1 and v2.

**Splice:** `npm run typecheck`, `npm run lint`, and `npm test` all green; Properties 17 through 23 and 26 passing with at least 100 generated cases each where generated; the corpus-backed deterministic template accepted by the validator; all 24 shipped articles passing `assertNoPii` and the scoped content guard; and `git diff --name-only` listing only `protected-output-adapters.ts`, `protected-generation.ts`, `cds-demo-readiness.ts`, their tests, the two frontend register files, `architecture/DECISIONS.md`, and the `architecture/` artifacts.

**Register:** the two displayed strings in `PatientEducationCard.tsx` reading `Taglish`; `PatientEducationCard.test.tsx` green with `/^Taglish$/` and no `Filipino` text on the toggle group in either state; Properties 28 through 32 passing; `frontend/bayan-health-mvp/` lint, typecheck, and test all green; the Schema_Document register section written; and `git diff architecture/DECISIONS.md` showing exactly one appended `ADR-20260824-01` block and one modified `Status` line on ADR-20260804-01.

**Ingest:** a recorded `--dry-run` showing `articles=24 aliases=71 rejected=0` before any write; either a write pass under a current, unused, operation-specific authorization followed by the section 7.4 read-back, or a recorded `DEFER` naming the specific mismatch with zero mutation. Both are acceptable completions of the repository work; only the first produces `dev` runtime evidence.
