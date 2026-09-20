# Teleconsult Video, Chat, and AI Scribe — Decision Brief

**Status:** Draft for C-Suite discussion when written (2026-08-17). Its phase-one video recommendation (decisions 1–4 below) is now an accepted ADR — see the update note immediately below. Decision 5 (chat stays on BayanHealth infrastructure) was already true and unaffected. Decision 6 (the two-model AI scribe) remains a recommendation only; no scribe work has shipped.
**Date:** 2026-08-17 (video-path update: 2026-08-19)
**Owner:** Dev A — Lead Engineer (sole engineer, full engineering jurisdiction per CEO)
**Audience:** CEO, C-Suite
**Update (2026-08-19):** The `consultation-media-layer` specification implemented phase one — live video — of decisions 1 through 4 below, with Daily as the launch provider. [ADR-20260819-01](./DECISIONS.md) supersedes [ADR-20260720-02](./DECISIONS.md) as the video path and retires the ADR-20260807-06 demo stand-in. Repository implementation and local validation are complete; `dev` Terraform is defined but not yet applied, and staging qualification, credential population, and the Data Privacy Act confirmations of section 10 remain outstanding launch dependencies. The scribe (decision 6) is unaffected and remains unscheduled.
**Supersedes:** `GOOGLE_MEET_INTEGRATION.md` and [ADR-20260720-02](./DECISIONS.md) — done, per [ADR-20260819-01](./DECISIONS.md)
**Related:** [ADR-20260819-01](./DECISIONS.md) (consultation media layer, phase one), [ADR-20260807-06](./DECISIONS.md) (demo video stand-in, retired), [ADR-20260703-01](./DECISIONS.md) (assessment-first CDS gating), [ADR-20260618-01](./DECISIONS.md) (payment adapter precedent)

## Purpose

This document is the single reference for the video teleconsult, chat, and AI scribe
discussion. It states what engineering has decided, what remains unknown, what the
C-Suite needs to decide, and what the timeline looks like. Every cost figure is
labelled as verified or estimated. Nothing here is presented as proven that has not
been proven.

## Table of contents

- [1. Executive summary](#1-executive-summary)
- [2. What exists today](#2-what-exists-today)
- [3. Decision 1 — Google Meet is not the video path](#3-decision-1--google-meet-is-not-the-video-path)
- [4. Decision 2 — Build the provider seam first](#4-decision-2--build-the-provider-seam-first)
- [5. Decision 3 — Vendor selection](#5-decision-3--vendor-selection)
- [6. Decision 4 — Deliberate media start](#6-decision-4--deliberate-media-start)
- [7. Decision 5 — Chat stays on BayanHealth infrastructure](#7-decision-5--chat-stays-on-bayanhealth-infrastructure)
- [8. Decision 6 — The AI scribe: two models, one corpus](#8-decision-6--the-ai-scribe-two-models-one-corpus)
- [9. Cost breakdown](#9-cost-breakdown)
- [10. Legal and compliance](#10-legal-and-compliance)
- [11. Timeline](#11-timeline)
- [12. Blockers by owner](#12-blockers-by-owner)
- [13. Unknowns and evidence status](#13-unknowns-and-evidence-status)
- [14. Decisions required from the C-Suite](#14-decisions-required-from-the-c-suite)
- [15. Risk register](#15-risk-register)
- [16. Governance actions](#16-governance-actions)
- [Appendix A — Sources](#appendix-a--sources)

## 1. Executive summary

### Six engineering decisions

1. **Google Meet is not the video path.** Every blocker is external to engineering,
   and it is the only option that requires building new infrastructure to capture
   audio for the scribe.
2. **Build a provider adapter seam.** About 70% of this work is vendor-independent.
   The seam makes the vendor choice reversible in roughly two weeks.
3. **Daily is the launch vendor.** Lowest frontend cost, fastest to ship, recording
   into our own S3. LiveKit stays available behind the seam.
4. **Deliberate media start.** Both local tracks begin inactive; each participant explicitly enables microphone or camera.
5. **Chat stays on the existing BayanHealth WebSocket.** Do not adopt a vendor's
   chat, presence, or typing indicators.
6. **The AI scribe is two specialised models over one shared corpus**, not a single
   unified model. The decomposed system is a prerequisite for a unified one.

### The headline for the business

The corpus is the moat, not the model. Models commoditise every few months. A
consented, de-identified, Taglish clinical audio corpus with a matching evaluation
harness does not, and no competitor in the Philippine market has one.

At launch volumes the video layer is likely to cost **under USD 100 per month**, and
possibly nothing at all — both Daily and Agora include 10,000 free participant-minutes
monthly, which covers roughly 250 consultations. Vendor price is not the decision.

### Seven asks of the C-Suite

Detailed in [section 14](#14-decisions-required-from-the-c-suite). In brief: define
what "AI scribe" means for launch, approve separable consent, settle corpus ownership
on exit, approve a small annotation budget, agree the model framing before it reaches
a board deck, set a unit-economics target, and assign ownership of Google Workspace
administrator access.

### The honest framing on launch risk

The video vendor decision is **not** the launch risk. Per our own governance records,
staging has never been qualified, the isolated restore has never been executed, PayRex
is disabled and unqualified, five CDS alarms sit in `ALARM`, and 37 messages sit in the
CDS audit dead-letter queue. Against a 3–4 week launch with one engineer, the video
integration is roughly a fifth of the remaining risk. Qualification is the critical
path.

## 2. What exists today

Verified by reading the repository, not assumed.

| Asset | State | Relevance |
|---|---|---|
| Demo video stand-in | `lib/video-session.ts` + `DEMO_VIDEO_JOIN_URL`; one shared room per environment, `dev` only, Meet-URL validated | **Deleted.** Retired by the `consultation-media-layer` specification (tasks 10.1–10.2) and recorded in [ADR-20260819-01](./DECISIONS.md). Its disclosure rules were inherited by the real integration as intended. |
| Video UI surfaces | Four: `ConsultationRoom`, `PatientBookingDetail`, `DoctorConsultationAccess`, `DoctorDashboardDrawer` | **Migrated.** All four now consume `<ConsultationVideo />` instead of `videoJoinUrl` (ADR-20260819-01). |
| Realtime chat | WebSocket with write-before-emit persistence, HTTP polling fallback, session-keyed presence and typing | Already solved. Do not buy it again. |
| Provider adapter pattern | `payrex-adapter.ts` + `circuit-breaker.ts` + `PAYMENTS_GATEWAY_PROVIDER` env switch with safe fallback | The seam pattern is proven in-repo, not theoretical. |
| Secret handling | `secrets.ts` — Secrets Manager, in-process cache, placeholder detection | Vendor credentials are a copy of a known pattern. |
| Token signing | `jose` already a backend dependency | LiveKit JWT tokens would need no new dependency. |
| Browser media policy | ~~`Permissions-Policy: camera=(self), microphone=(self)` already set — Embedded video needs **no header changes**.~~ **Corrected 2026-08-20, after dev end-to-end testing.** `(self)` excludes the cross-origin Daily iframe `<ConsultationVideo />` embeds; `getUserMedia` inside that iframe was denied until `camera`/`microphone` were widened to also grant `https://*.daily.co` and `https://*.dailywebrtc.com`, in both `next.config.ts` and `src/proxy.ts`. |
| Frame policy | ~~`X-Frame-Options: DENY`, no CSP — Governs others framing us, not us embedding a vendor. No conflict.~~ **Corrected 2026-08-20.** `src/proxy.ts` does carry a CSP (missed when this row was written); it had no `frame-src`, which made the browser fall back to `default-src 'self'` and block the Daily iframe outright. Fixed with a `frame-src` scoped to the same two Daily origins. `X-Frame-Options: DENY` itself was correctly assessed and is unaffected. |
| CDS pipeline | Generates SOAP from structured input; model selected by runtime preset | The scribe reuses this. It is not a new generation path. |
| CDS gate | Assessment-first; Plan/Rx/ICD/medcert/education locked until physician confirms | The scribe inherits the existing safety gate. |
| PII gate | `deidentify.ts` runs a hard pre-inference block | Needs transcript-specific redaction. See [section 8.8](#88-one-known-engineering-landmine). |
| CDS training data | Drafts persist `content`, `source`, `modelUsed`; assessments write immutable `CDS#ASSESSMENT_VERSION#nnnnnn` history | **AI-proposed vs physician-confirmed pairs are already accumulating.** See [section 8.5](#85-cds-training-data-already-exists). |

The practical consequence: of the four subsystems an AI scribe needs, we already own
two and a half. See [section 8.1](#81-what-an-ai-scribe-actually-is).

## 3. Decision 1 — Google Meet is not the video path

### Why Meet was originally chosen

ADR-20260720-02 selected Google Meet to avoid taking on native WebRTC, SFU, and TURN
complexity, while keeping BayanHealth as the system of record. That reasoning was
sound. It then gated implementation on decisions that remain unmade: the organizer
identity model, Workspace plan validation, data-processing terms, retention, and
patient/doctor notices.

### What changed

Three things.

**We do not have Google Workspace administrator access**, and cannot currently confirm
whether `bayanhealth.co` has a paid Workspace plan at all. Domain-wide delegation, Meet
Media API access, transcription policy, and retention are all Admin console controls.
Every Meet blocker is therefore **outside engineering's control**, in a 3–4 week window.

**The AI scribe changed the requirement.** Capturing audio from Meet requires either a
receive-only WebRTC bot joining the conference on long-lived compute — in a stack where
every compute is a Lambda — or accepting Google-generated transcripts deposited into a
Google Drive we would then have to treat as a PHI store. Meet is the **only** candidate
that requires building infrastructure to get audio.

**Access control is weaker.** Meet spaces are `OPEN` (anyone with the link joins),
`TRUSTED` (host organisation plus invited externals), or `RESTRICTED` (invitees only).
Patients are not in our domain, so without paying for per-doctor Workspace seats nobody
can admit a knocking patient — which forces `OPEN`, meaning a forwarded link works
indefinitely. Every alternative issues a short-lived token scoped to one consultation
and one role, which is how the rest of our platform already works.

### Pros and cons

| Google Meet — pros | Google Meet — cons |
|---|---|
| Zero marginal transport cost (Workspace seats are fixed) | Every blocker is external and unresolved |
| Familiar to patients and doctors | Requires Fargate WebRTC bot to capture audio |
| Excellent network quality and mobile clients | Link-holder access control, or per-doctor seat cost |
| No new vendor contract | Transcripts land in Google Drive, a new PHI store |
| Camera toggle, dial-in, accessibility handled | Work is deleted when the scribe arrives |
| | Requires Workspace admin access we do not have |

### Recommendation — done

Superseded by [ADR-20260819-01](./DECISIONS.md). `GOOGLE_MEET_INTEGRATION.md` remains in
the repository as a tombstone rather than being deleted, because the contract and several
governance documents referenced it by path; the `videoJoinUrl` contract property itself
has since been removed as part of the same specification (Requirement 10). See
[section 16](#16-governance-actions).

## 4. Decision 2 — Build the provider seam first

Roughly 70% of this work does not depend on which vendor we pick: the OpenAPI
operations, the consent entity, the DynamoDB items, join authorisation, the four UI
surfaces, recording lifecycle states, and audit events. Only the adapter differs.

We already have the precedent. `PAYMENTS_GATEWAY_PROVIDER` selects `ledger` or `payrex`
behind a circuit breaker that degrades safely. Mirror it:

```text
VIDEO_PROVIDER = none | daily | livekit | agora | chime

lib/video-provider.ts
  createRoom()
  mintJoinCredential()
  startRecording()
  stopRecording()
  endRoom()
```

Wrapped in the existing `circuit-breaker.ts`, a provider outage degrades the
consultation to chat-only — the same shape as PayRex falling back to ledger.

**Why this matters to the business:** the roadmap is not betting on a vendor. If Daily
disappoints, gets expensive, or fails a compliance review, the swap is roughly two
weeks and no product surface changes. This converts an irreversible vendor decision
into a reversible one, which is the single largest risk reduction available in this
whole plan.

The seam should also be abstracted on the frontend as one `<ConsultationVideo />`
component, so that swapping a hosted prebuilt iframe for React components stays
contained to a single file.

## 5. Decision 3 — Vendor selection

### Constraints that drove the choice

| Constraint | Stated by | Effect |
|---|---|---|
| Launch in 3–4 weeks | Business | Eliminates anything with external gates |
| Minimal frontend call UI | Engineering capacity | Favours hosted prebuilt UI |
| Non-AWS processor acceptable for clinical media | Business | Removes Chime SDK's decisive advantage |
| Scribe is a nice-to-have at launch | CEO | Recording can come after launch |
| "Own our AI" via distillation | CEO | Needs recorded audio volume, **not** real-time AI |

That last row matters more than it looks. Distillation is a batch process. It removed
LiveKit's strongest differentiator — its real-time agent framework — from the decision.

### Side-by-side comparison

Per-consultation figures assume 20 minutes and two participants (40 participant-minutes).
All prices are public list rates and must be re-verified before contracting.

| | Google Meet | Daily | LiveKit | Agora | Chime SDK | Zoom Video SDK |
|---|---|---|---|---|---|---|
| Video transport per consult | USD 0 marginal | ~0.16 | Tiered plans + usage | ~0.16 | ~0.07 | ~0.14 |
| Audio-only per consult | USD 0 marginal | ~0.04 | Tiered | ~0.04 | ~0.07 | ~0.14 |
| Free tier | n/a | 10k participant-min/mo | Build tier free | 10k min/mo | none | 10k min/mo |
| Recording to our S3 | No — bot required | Yes | Yes | Yes | Yes | Via Zoom cloud first |
| Breaks Lambda-only architecture | **Yes** | No | No (Cloud) | No | No | No |
| Access control | Link-holder | Our token | Our token | Our token | Our token | Our token |
| Blocked on anything we do not control | **Yes** | No | No | No | No | No |
| Frontend work | None (new tab) | **Lowest** (hosted prebuilt) | Low (React components) | Moderate | **Highest** | Moderate |
| Time to ship, solo engineer | 2–3 wks after gates | **1–2 wks** | 2–3 wks | 2–3 wks | 3–4 wks | 2–3 wks |
| Exit cost | Low | Moderate | **Lowest** (self-hostable) | Moderate | Moderate | Moderate |
| Philippine network quality | Strong | Good | Good | **Strong** (Asia-optimised) | Good | Strong |
| Main risk | External blockers | Smallest vendor | Cloud tier is young | Jurisdiction diligence | Brand EOL confusion | Pricing creep |

### Repository-level integration delta

| | Daily | LiveKit | Agora | Chime SDK |
|---|---|---|---|---|
| New backend dependency | None — plain `fetch` | None — `jose` already present | `agora-token` | `@aws-sdk/client-chime-sdk-meetings` |
| Auth model | API key | Shared secret → JWT | App ID + certificate | **IAM role** |
| Secrets Manager entries | 1 | 1 | 1 | **0** |
| Terraform changes | Env vars + secret | Env vars + secret | Env vars + secret | Native resources + IAM |
| New infrastructure paradigm | None | None (Cloud) | None | None |
| Browser header changes | None | None | None | None |

### Why Daily

It wins on the stated constraints rather than on preference. The hosted prebuilt UI is
the least frontend work available anywhere. Server integration is REST-only, so there
is no SDK to learn on the backend. Recording writes to our own S3. And critically, the
vendor owns the mobile-browser WebRTC edge cases — device permissions, reconnects,
mid-range Android in Chrome — which is exactly where a solo engineer loses weeks and
where a launch date dies.

### What would change the decision

| If this becomes true | Then |
|---|---|
| Regulatory posture demands PHI never leave AWS | Chime SDK — nothing else keeps media wholly inside `ap-southeast-1` |
| Real-time in-consult AI becomes a priority | LiveKit — agents are a first-class primitive there |
| Philippine call quality proves unacceptable | Agora — verify jurisdiction and residency in writing first |
| Volume grows enough that per-minute pricing bites | Self-hosted LiveKit — same server, change a URL |

The seam makes each of these a two-week change rather than a re-platform.

### Excluded and why

**Twilio Video** — lifecycle status is reported inconsistently across current sources.
That ambiguity alone disqualifies it for a new build.

**Amazon Chime versus Amazon Chime SDK** — a distinction worth stating in the meeting
because it is easy to get wrong. AWS ended support for the Chime *application* on
20 February 2026 and states explicitly that the **SDK is unaffected**. The SDK is
viable. But we would spend the rest of the product's life explaining that, which is a
real if soft cost.

## 6. Decision 4 — Deliberate media start

Toggling video and audio independently mid-call is standard on every WebRTC SDK and ships
wired up in Daily's call object. It is **not** a Google Meet differentiator, and should
not be presented as a reason to prefer Meet.

The implementation joins with both microphone and camera inactive. Each participant must
explicitly enable each local track after entering the room. This preserves the low-data,
camera-on-demand goal while preventing ambient audio from being transmitted before the
participant intends to speak.

| Rationale | Detail |
|---|---|
| Cost | Audio is roughly a quarter of HD video transport cost |
| Patient cost | Philippine mobile data is expensive; audio uses far less |
| Reliability | Connects faster and survives variable bandwidth and mid-range devices |
| Clinical sufficiency | Adequate for a large share of follow-ups; video escalates when someone needs to show a rash or wound |
| Corpus quality | Audio is all ASR needs; recorded video is liability with no downstream use |
| Consent clarity | Turning the camera on becomes a deliberate act, not a surprise |

**Open diligence item:** confirm whether Daily bills the audio-only rate *dynamically*
when video tracks are off, or only for rooms created as audio-only. The difference is
roughly USD 0.12 per consultation. Not reliably documented — ask the vendor directly.

## 7. Decision 5 — Chat stays on BayanHealth infrastructure

Every video vendor will sell us chat, presence, and typing indicators. We already have
all three, with write-before-emit persistence and an HTTP polling fallback.

Adopting a vendor's version would mean two realtime systems, two connection state
machines in the UI, and two places a reconnect bug can hide. Use the video SDK for media
only.

This is the single largest complexity saving available and it costs nothing to decide.
It also means chat remains the degradation path when the video provider fails, which is
what makes the circuit breaker in [section 4](#4-decision-2--build-the-provider-seam-first)
meaningful.

## 8. Decision 6 — The AI scribe: two models, one corpus

### 8.1 What an AI scribe actually is

Four subsystems, not one:

1. **Audio capture** — getting consultation audio into our custody
2. **ASR** — speech to a diarised, timestamped transcript
3. **Clinical structuring** — transcript to Subjective / Objective / Assessment / Plan
4. **Physician review and sign-off** — what makes the output legally usable

**We already own 3 and 4.** The CDS pipeline generates SOAP, `deidentify.ts` gates PHI,
model presets allow swapping models with one environment variable, the audit outbox
records everything, and ADR-20260703-01 already locks Assessment, Plan, and Rx behind
physician confirmation. A transcript is simply another **input** to the existing
Subjective/Objective organisation.

So the actual project is 1 and 2. Translated for the business: *we want to own ASR for
Filipino-English code-switched clinical speech.* That is the part nobody sells
off-the-shelf, and the only part where training our own model creates real
differentiation.

### 8.2 Capability ladder

Each rung is independently shippable and independently reversible.

| Rung | Capability | Requirement | Where it lands |
|---|---|---|---|
| 1 | Video consultation | Any provider | Launch |
| 2 | Server-side recording into our S3 | Any except Meet | Week 5–6 |
| 3 | Async transcript into existing CDS Subjective/Objective | ASR only, no platform change | Week 7–9 |
| 4 | Post-consult draft note behind the physician gate | No platform change | Week 10+ |
| 5 | Live transcript during the consultation | Real-time STT | Post-MVP, unscheduled |
| 6 | In-consult AI assist (red-flag prompts, live suggestions) | Real-time agent framework | Post-MVP, unscheduled |
| 7 | Distilled Taglish clinical ASR | Our corpus | Month 4–6 |

**Rungs 3 and 4 deliver roughly 80% of the scribe's practical value**, and neither
requires new media infrastructure or a platform change. This is worth putting to the CEO
directly: he may find that rung 4 is what he actually wanted, at a fraction of the cost
and risk of rung 5.

### 8.3 Why not a single unified model

The CEO's instinct is not wrong in principle — audio-native multimodal models exist. It
is premature rather than misguided, for four reasons.

**The two halves learn from different data at different rates.** ASR improves with raw
audio volume, which every consultation produces automatically and for free. Clinical
reasoning improves with physician-corrected notes, which are scarce and expensive.
Coupling them means the scarce data throttles the abundant data.

**Separability is a safety property.** If a unified model outputs the wrong medication,
we cannot tell whether it mis-heard or mis-reasoned. With two stages we read the
transcript and know immediately. For a system that puts prescriptions on screen, losing
that diagnostic ability is disqualifying at our maturity level.

**Distillation tooling strongly favours the decomposed case.** Whisper distillation is a
well-trodden path with published methods and public recipes. Distilling an audio-native
clinical model is research, not engineering.

**Our assessment-first gate has nowhere to stand in a unified model.** ADR-20260703-01
requires that Subjective/Objective may be organised before confirmation while Plan, Rx,
final ICD, medical certificate, and patient education stay locked server-side until the
physician confirms an Assessment. An end-to-end audio-to-everything model produces the
locked artifacts in the **same forward pass** as the unlocked ones. There is no point in
that pipeline where the gate can be enforced. Adopting a unified model means dismantling
the safety architecture that makes the product defensible.

### 8.4 The reframe: unified corpus, specialised models

One consented Taglish clinical corpus feeds both models.

| Stage | Model | Trains on | Ours? |
|---|---|---|---|
| 1 | Taglish clinical ASR | Raw consented audio (free byproduct) | Yes — distilled from a teacher |
| 2 | Clinical language model for SOAP/CDS | Physician-corrected notes | Yes — distilled from our pipeline |

Both are "our own AI trained on our own data," which is the story the CEO wants.

**And the closing argument: the two-stage system is a prerequisite for a unified one,
not a competing plan.** A unified model cannot be evaluated without a decomposed
baseline to measure against. Building them separately is *on the path* to unification
whenever tooling and data volume justify it. Nothing is foreclosed and the option is
held open at zero cost.

### 8.5 CDS training data already exists

This is the most actionable finding in this document, and it needs no vendor, no
recording, no consent work, and no launch.

CDS drafts persist `content` alongside `source` and `modelUsed`. Confirmed assessments
write an **immutable version history** at `CDS#ASSESSMENT_VERSION#nnnnnn`. The pair that
matters for distillation — what the model proposed versus what the physician confirmed —
is therefore largely reconstructable from `app_core` today. Every completed consultation
is already a training example.

Two caveats before that is true:

1. **Every item in `app_core` carries a `ttl`.** The TTL on CDS draft and
   assessment-history items has **not been audited**. If it is short, the training
   corpus has a silent expiry date and the asset is evaporating on a schedule.
2. There is no export path, so the pairs exist but are not a dataset.

Neither is hard. A curation job assembling `(clinical input snapshot → AI draft +
model used → physician-confirmed version history)` triples, plus a TTL exemption or
`legalHold` for training-relevant items, is roughly two days of work. It is the cheapest
"own our AI" progress available and it can start before the meeting concludes.

### 8.6 Distillation changes the data economics

An earlier estimate in internal discussion put human annotation as the dominant training
cost. **For a distillation approach that is wrong**, and the correction is large enough
to change the roadmap.

Distil-Whisper works by having a large teacher model generate pseudo-labels on
*unlabelled* audio, then filtering with a word-error-rate heuristic. Follow-up work
removes even the labelled-data requirement for that filtering step.

| Input | Earlier assumption | Corrected |
|---|---|---|
| Training data | Human-transcribed audio | **Raw consented audio** — free byproduct of recording |
| Human labels | ~200 hours | **~10–20 hours**, for evaluation only |
| Annotation budget | USD 2,000–6,000 | **USD 200–600** |

The strategic consequence, and the best line for the CEO: **buy-then-own is one
continuous path, not a pivot.** The commercial ASR we pay for at launch *is the teacher*.
Every consultation we serve manufactures a training example for the model that
eventually replaces it.

What distillation still needs is volume. At 500 consultations per month at 20 minutes
each we accumulate roughly **167 audio-hours per month**, so about 1,000 hours in six
months. **Every month without recording is 167 hours that cannot be recovered.**

### 8.7 The platform requirement nobody puts in a comparison table

**Per-participant unmixed audio tracks.** This is a hard criterion.

Diarisation — knowing who said what — is the hardest part of clinical ASR. Separate
doctor and patient tracks make it exact and free. Mixed-down audio means paying for
imperfect diarisation forever, and a misattribution is not cosmetic: "I'm allergic to
penicillin" assigned to the wrong speaker is a clinical safety event that simultaneously
poisons the training corpus.

Daily raw-tracks mode, LiveKit track egress, Agora individual recording, and Chime media
pipelines all offer some form of this. **Exact behaviour is unverified for all four** and
must be confirmed before contracting. This matters more to the roadmap than any price in
[section 5](#5-decision-3--vendor-selection).

### 8.8 One known engineering landmine

`deidentify.ts` is a **hard pre-inference block**. Our own governance record documents
what happens on a false positive: the `ADDRESS_PH` pattern matched the trailing "st" of
ordinary clinical words, so an affected consultation was silently demoted to the
deterministic placeholder template behind an HTTP 200.

A raw consultation transcript contains spoken names, addresses, and birthdays
constantly. Feeding transcripts through the current gate unchanged would demote most
consultations to placeholder notes. Transcript redaction must be designed as its own
component, not inherited. This is scoped work, not a blocker, but it is invisible until
you hit it.

### 8.9 Shadow mode — the cheapest path to the CEO's vision

Record with consent, run the transcript through the existing CDS Subjective/Objective
organisation, store the draft note, and show it to nobody.

Zero clinical risk. Zero UI work. And from the first week of recording we accumulate
both the corpus and the evaluation data. We can report that the scribe is learning from
real consultations by week six while shipping no scribe surface at all. Rung 4 then
becomes a feature flag flipped once evaluation numbers justify it, rather than a launch
commitment to defend.

Given that the scribe is a nice-to-have at launch, this is the correct shape: the **data
collection** ships early, the **feature** ships when it is good.

## 9. Cost breakdown

All figures in USD. Assumes a 20-minute consultation with two participants
(40 participant-minutes). **Verified** means taken from a vendor or AWS pricing page or
its documentation. **Estimated** means inferred and not confirmed against a price sheet.

### 9.1 Video transport, per consultation

| Provider | Rate | Per consult | Status |
|---|---|---|---|
| Google Meet | Fixed Workspace seats | 0 marginal | Verified model |
| Daily | 0.004 / participant-min | 0.16 | Verified |
| Daily, audio-only | 0.00099 / participant-min | 0.04 | Verified |
| Agora HD | 3.99 / 1k participant-min | 0.16 | Verified |
| Agora audio | 0.99 / 1k participant-min | 0.04 | Verified |
| Chime SDK | 0.0017 / attendee-min | 0.07 | Verified |
| Zoom Video SDK | 0.0035 / min | 0.14 | Verified |
| LiveKit Cloud | Build 0 / Ship 50 / Scale 500 per month + usage | Tier-dependent | Verified |

**The number that should end the price debate:** video transport is 0.07–0.20 per
consultation on every option. At 500 consultations per month that is under 100 per month
— less than our CloudWatch bill. Both Daily and Agora include 10,000 free
participant-minutes monthly, which covers roughly **250 consultations per month at no
charge**. Anyone arguing vendors on price is optimising a rounding error.

### 9.2 Speech recognition, per consultation

| Option | Rate | Per consult | Status |
|---|---|---|---|
| Amazon Transcribe, standard | 0.024 / min, first 250k min/mo | 0.48 | Verified |
| Amazon Transcribe Medical | 0.075 / min | 1.50 | Verified |
| Third-party ASR | ~0.004–0.01 / min | 0.08–0.20 | Estimated |
| Note generation on existing Together preset | ~5k in / 1.5k out tokens | under 0.02 | Estimated |

ASR is **3–10× the cost of video transport**. It, not the video vendor, is the cost
driver. Note that Transcribe Medical is 3× standard and is tuned for US English clinical
speech; for Taglish it may score *worse*. Test before paying the premium.

Monthly ASR at standard rates: ~240 at 500 consultations, ~2,400 at 5,000.

### 9.3 Recording and storage

| Item | Rate | Status |
|---|---|---|
| Daily recording | 0.0135 / min → ~0.27 per consult | Verified |
| 1,000 hours of Opus audio | ~60 GB → pennies in S3 | Estimated |

Storage is never the objection. Do not let it become one in the meeting.

### 9.4 Distillation

| Item | Cost | Status |
|---|---|---|
| Gold evaluation set, ~20 audio-hours | 200–600 | Estimated |
| GPU compute per distillation run | Low hundreds | Estimated |
| Total across several runs | Under 2,000 | Estimated |

The corrected model in [section 8.6](#86-distillation-changes-the-data-economics) makes
this the cheapest phase of the AI roadmap, not the most expensive.

### 9.5 Self-hosting break-even

An always-on GPU instance in `ap-southeast-1` runs on the order of 900–1,100 per month
(**estimated** — verify current `g5`/`g6` pricing). Against 0.024/min managed ASR,
self-hosting only wins past roughly **40,000–45,000 audio-minutes per month**, about
2,000+ consultations. Below that we would be paying a four-figure monthly bill for idle
silicon.

### 9.6 The real cost

Engineer time, and there is one engineer. The deltas that matter:

| Choice | Time impact |
|---|---|
| Daily versus Chime SDK | Daily ships ~1–2 weeks sooner |
| Chime SDK versus anything | Saves ongoing credential and vendor management permanently (zero secrets, IAM only) |
| LiveKit now versus later | Saves the migration that rung 5 would otherwise force |
| Google Meet | Costs 2–3 weeks that get deleted, plus indefinite waiting on Workspace access |

## 10. Legal and compliance

### 10.1 RA 4200 is the binding constraint on recording

The Philippine Anti-Wiretapping Act makes it unlawful to record a private communication
without authorisation from **all parties**, criminalises possessing or replaying such a
recording, and bars it as evidence. Philippine law is all-party consent — the **opposite**
of the one-party-consent norm that most US telehealth vendor documentation assumes.

Doctors currently consent to recording at registration and both pilot doctors have
agreed. That is a good start, but the statute attaches to a *private communication*, not
to an account. A blanket clause establishes willingness; it does not obviously constitute
authorisation for a specific conversation on a specific day.

Architectural consequences, assuming the stricter reading because it is cheap:

- Per-consultation authorisation recorded server-side for **both** parties.
- A **persistent on-screen recording indicator.** Not UX polish — the statute penalises
  *secret* recording, so visible acknowledged recording is materially part of the legal
  posture.
- Mid-call revocation that actually stops recording and marks the segment for deletion.
- Recording must be **technically impossible** to start without both consents present.
  Fail-closed, the same posture as the break-glass audit.

**Requires attorney confirmation.** This document reads statute text and commentary; it
is not legal advice.

### 10.2 Retention and consent design

Counsel's position is that retention depends on the consent, privacy, and terms policy we
enforce, provided it is explicit and agreed. That is permissive, which makes the **notice
design itself the asset**. Two refinements engineering recommends regardless of how broad
the terms are:

**Separable, granular consent** — treatment, recording, and AI training as three distinct
grants, with care explicitly **not** contingent on the third. Bundling "you must permit
AI training to receive medical care" into terms of service holds up legally right until a
regulator or a journalist reads it. Granularity also protects the corpus: if the training
grant is ever challenged, only that grant is at risk.

**Provenance metadata on every recording** — consent version, scopes granted, timestamp,
actor. So that in month twelve we can construct a training set filtered to "recordings
where AI-training consent was granted under notice v3." Without it, one policy revision
makes the entire corpus legally ambiguous. This is a handful of attributes now and
genuinely impossible to retrofit later.

### 10.3 HIPAA is a red herring

Every vendor page sells HIPAA compliance and Business Associate Agreements. HIPAA is a US
statute. Our obligations run through the Data Privacy Act of 2012 and the NPC, plus
DOH/PRC telemedicine rules. A vendor BAA is useful evidence of maturity, not our legal
instrument.

What actually belongs in vendor diligence: which region the media edge and recording
storage sit in, whether recordings can be pinned to Singapore, corporate jurisdiction and
sub-processors, cross-border transfer terms, and a deletion guarantee that reaches
recordings.

### 10.4 Corpus and erasure

The DPA grants data subjects erasure rights. A training corpus built from erasable data
needs a stated plan: either de-identify and aggregate so it is no longer personal data,
or honour deletion and accept corpus churn. Decide before there are 1,000 hours and no
answer.

## 11. Timeline

Weeks are relative to the meeting date. Launch is assumed 3–4 weeks out.

| When | Work | Depends on | Ships to |
|---|---|---|---|
| **Now** | TTL audit on CDS drafts and assessment history; CDS corpus curation export | Nothing | Internal |
| Week 1 | **Done.** `video-provider` seam, Daily prebuilt, audio-default with camera toggle, feature-flagged, chat fallback; `DEMO_VIDEO_JOIN_URL` and `lib/video-session.ts` deleted. Implemented by the `consultation-media-layer` specification and recorded in [ADR-20260819-01](./DECISIONS.md). Repository-side only — `dev` Terraform is defined, not yet applied. | Nothing | `dev` |
| Week 2 | **Staging qualification** — the actual launch blocker | Nothing | `staging` |
| Week 3 | Launch hardening, doctor and patient walkthroughs; consent copy drafted in parallel, not shipped | Attorney input | `staging` |
| Week 4 | Buffer, launch | | `prod` |
| Week 5–6 | Granular consent with provenance; audio-only recording, per-participant tracks, shadow mode | C-Suite Q2, attorney | `prod` |
| Week 7–9 | Transcript → existing CDS → draft note, still shadow; evaluation harness and gold set | C-Suite Q4 | `prod`, hidden |
| Week 10+ | Reveal drafts behind the physician gate when evaluation justifies it | Evaluation numbers | `prod` |
| Month 4–6 | ASR distillation | ~500–1,000 audio-hours accumulated | Internal |

Phases through week 9 are roughly **8–12 weeks of solo-engineer work**. Week 10 is when
the CEO sees a draft clinical note produced from a real recorded consultation. Rung 5
(live in-consult transcription) and rung 6 (in-consult AI assist) are deliberately
unscheduled.

### Corpus accumulation

| Consultations / month | Audio-hours / month | Hours by month 6 |
|---|---|---|
| 250 | ~83 | ~500 |
| 500 | ~167 | ~1,000 |
| 1,000 | ~333 | ~2,000 |

## 12. Blockers by owner

### Engineering — and larger than the video decision

| Blocker | Evidence source | Note |
|---|---|---|
| Staging has never been qualified | `SESSION_HANDOFF.md` | The real launch blocker |
| Isolated restore has never been executed | Governance records | Recovery is unproven |
| Five CDS alarms stuck in `ALARM` | `product.md` open blockers | `treat_missing_data = "breaching"` against an idle `dev` |
| 37 messages in `bayanhealth-dev-cds-audit-dlq` | `product.md` open blockers | Unresolved |
| PayRex disabled and unqualified | ADR-20260618-01 | Is payments in launch scope? |
| CDS training-data TTL unaudited | This document, section 8.5 | Possible silent asset expiry |
| Four frontend surfaces read `videoJoinUrl` | Repository | **Migrated.** No surface reads `videoJoinUrl` after the `consultation-media-layer` specification (ADR-20260819-01). |

Environment state above is read from governance documents dated 2026-08-03 through
2026-08-07 and has **not** been re-verified against live environments.

### C-Suite

Product definition of "AI scribe." Consent policy scope and separability. Corpus
ownership on acquisition or wind-down. Annotation budget. Expectation-setting on the
unified model. Unit-economics target. Ownership of Workspace administrator access.

### External

| Party | Item |
|---|---|
| Daily | Audio-rate billing behaviour when video is off; per-participant unmixed track support; S3 region configuration; data-processing terms |
| Attorney | Whether registration-time consent satisfies RA 4200 per-communication authorisation; whether AI-training consent must be separable from treatment consent; corpus transfer language |
| Google Workspace | Administrator access — still needed for email and calendar regardless of the video decision |

## 13. Unknowns and evidence status

Stated explicitly because our governance convention requires it, and because several
figures below would be wrong to treat as settled.

### Verified by reading this repository

The demo stand-in and its disclosure rules; `jose` as an existing dependency; the twelve
AWS SDK clients and per-handler esbuild bundles; the `circuit-breaker.ts` and
`payrex-adapter.ts` provider pattern; the `secrets.ts` credential pattern; CDS drafts
persisting `content`/`source`/`modelUsed`; immutable `CDS#ASSESSMENT_VERSION#nnnnnn`
history; four frontend video surfaces; existing WebSocket chat and presence.

**Not actually verified, despite being listed as such above at the time of writing:**
the claim that `Permissions-Policy: camera=(self), microphone=(self)` needed no change
and that the absence of a CSP meant no conflict. Both were falsified by dev end-to-end
testing on 2026-08-20 (see the corrected table in [section 2](#2-what-exists-today)) —
`src/proxy.ts` does set a CSP, and `(self)` alone excludes the cross-origin Daily
iframe. Recorded here as a standing caution: "verified by reading the repository" is
only as good as actually re-deriving the specific claim against the specific new
surface, not pattern-matching a header's presence to "already correct."

### Verified from public vendor and legal sources

Meet space scopes and `OPEN`/`TRUSTED`/`RESTRICTED` semantics; Meet Media API being
receive-only WebRTC and administrator-toggleable; Chime application end of support on
20 February 2026 with the SDK unaffected; Chime media pipelines in `ap-southeast-1`;
Transcribe at 0.024/min and Medical at 0.075/min; Daily at 0.004 and 0.00099
participant-minute rates with 0.0135/min recording and 10k free; Agora at 0.99/3.99/8.99
per 1k participant-minutes with 10k free monthly and a ~500 monthly minimum on the STT
add-on; LiveKit tiers at 0/50/500; Zoom Video SDK at ~0.0035/min; Distil-Whisper
pseudo-labelling and uDistil-Whisper label-free filtering; RA 4200 all-party consent.

### Not verified — must not be presented as fact

| Unknown | Impact if wrong |
|---|---|
| TTL values on CDS draft and assessment-history items | Training corpus may be expiring on a schedule |
| Whether Daily bills audio rate dynamically when video is off | ~0.12 per consultation |
| Exact per-participant unmixed track behaviour on any vendor | Diarisation cost and corpus quality |
| Amazon Transcribe Tagalog coverage | ASR vendor choice |
| AWS HealthScribe region availability | Whether the managed option exists in-region at all |
| Whether `bayanhealth.co` has a paid Workspace plan | Email and calendar roadmap |
| GPU self-hosting cost and third-party ASR rates | Break-even threshold |
| Live staging, DLQ, and alarm state | Launch readiness assessment |
| Twilio Video lifecycle status | Excluded on this ambiguity alone |

## 14. Decisions required from the C-Suite

Ordered by how much each unblocks.

**Q1 — What does "AI scribe" mean for launch?** A post-consult draft note (rung 4) is
roughly three weeks of work post-launch on infrastructure we already own. Live in-consult
transcription (rung 5) is a different project. This single answer moves the roadmap more
than any other decision in this document.

**Q2 — Approve granular, separable consent?** Treatment, recording, and AI training as
three grants, with care explicitly not contingent on the third. Safer, and it protects
the corpus if the training grant is challenged. There may be a conversion cost, which is
a business call rather than an engineering one.

**Q3 — What happens to the corpus on acquisition or wind-down?** Transfer language must
be in the notice from day one. It cannot be added retroactively to 1,000 hours of audio.

**Q4 — Approve the evaluation budget?** A few hundred dollars for ~20 hours of gold-set
transcription now, a part-time annotator later. Trivial money, but without it we cannot
tell whether any model is improving, and every claim about the scribe becomes unfalsifiable.

**Q5 — Agree the "unified corpus, specialised models" framing?** Needed before the
unified-model version is committed to externally or in a board deck. The engineering
position is in [section 8.3](#83-why-not-a-single-unified-model) and it is not a
preference — the assessment-first gate cannot be enforced inside a unified model.

**Q6 — What is the target all-in cost per consultation?** This bounds AI spend. Video is
0.07–0.20 and ASR is 0.48–1.50, so the answer determines whether the scribe runs on every
consultation or only where it pays for itself.

**Q7 — Who owns obtaining Google Workspace administrator access?** Required for email and
calendar even with Meet removed from the video path.

### Two secondary questions

- Should AI-training consent be declinable per consultation, or granted once at
  registration? Per-consultation gives cleaner provenance; registration gives more data.
- Are we comfortable that doctors' recorded speech is also training data? They consented
  to recording for clinical purposes; training a model on their voices and phrasing is
  arguably a separate grant.

## 15. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Launch slips because staging qualification is unfinished | High | High | Timebox video to one week; qualification is the priority |
| Chosen vendor proves wrong | Medium | Low | The provider seam makes the swap ~2 weeks |
| Physician trust lost to one hallucinated medication | Low | **Critical** | Shadow mode; assessment-first gate; evaluation harness before reveal |
| Corpus legally unusable due to consent defects | Medium | **Critical** | Granular consent, per-recording provenance, attorney review before recording |
| CDS training data silently expires on TTL | Unknown | High | Audit this week |
| Transcript trips the PII gate and silently demotes notes | High | Medium | Transcript-specific redaction as scoped work |
| Mixed-down audio makes diarisation unreliable | Medium | High | Require per-participant tracks as a contract condition |
| Doctors decline recording in practice despite consenting | Low | High | Both pilot doctors have agreed; re-confirm at scale |
| Vendor jurisdiction becomes a compliance objection | Low | Medium | Diligence answers in writing before recording real patients |

## 16. Governance actions

Status against the original list, as of 2026-08-19:

1. **Supersede ADR-20260720-02 with a video-provider-adapter ADR** — **done**.
   [ADR-20260819-01](./DECISIONS.md) supersedes it as the video path, mirroring how
   ADR-20260618-01 handled payments.
2. **Reduce `GOOGLE_MEET_INTEGRATION.md` to a tombstone**, not a deletion — **done**,
   unchanged from the original plan. It remains referenced by path from
   ADR-20260720-02, ADR-20260807-06, and this document; the contract's `videoJoinUrl`
   description that used to reference it no longer exists, since that property was
   removed by the `consultation-media-layer` specification.
3. **New ADR on consultation recording and consent, after attorney confirmation** —
   **not started**. Recording remains explicitly out of scope of the phase-one media
   layer (Requirement 22); the Data Privacy Act confirmations in section 10 of this
   document remain outstanding.
4. **New ADR on the two-stage scribe model strategy** — **not started**. Unaffected by
   the phase-one video work; the scribe is unscheduled.
5. **Contract-first: the three `video-session` OpenAPI operations land in the same
   change set that dispatches them** — **done**. `createBookingVideoSession`,
   `getBookingVideoSession`, and `endBookingVideoSession` are defined in
   `contracts/openapi.yaml` in the same change set as their route dispatch and their
   Terraform route registration.
6. **Update `DATA_MODEL.md` with consent, recording, and corpus-provenance entities
   before any new key prefixes ship** — **partially done**. The definition-only
   Media_Artifact, Consent_Record, and Transcript_Artifact shapes, their key builders,
   their retention classes, and the Requirement 25 object-store decisions are recorded
   in `DATA_MODEL.md`. Recording and corpus-provenance *behavior* remains deferred to
   the future recording specification per [ADR-20260819-01](./DECISIONS.md).
7. **Update `GOVERNANCE_INDEX.md`, `SESSION_HANDOFF.md`, and the README video row** —
   tracked as follow-up outside the `consultation-media-layer` specification.

## Appendix A — Sources

External facts cited above, for verification. Content from these sources was rephrased
for compliance with licensing restrictions.

- [Google Meet meeting spaces guide](https://developers.google.com/workspace/meet/api/guides/meeting-spaces)
- [Google Meet spaces REST reference](https://developers.google.com/meet/api/reference/rest/v2/spaces)
- [Meet Media API concepts](https://developers.google.com/workspace/meet/media-api/guides/concepts)
- [Meet Media API access control for administrators](https://support.google.com/a/answer/16333500)
- [Google Workspace Events API — Meet events](https://developers.google.com/workspace/events/guides/events-meet)
- [Amazon Chime end of support notice](https://docs.aws.amazon.com/chime/latest/ag/what-is-chime.html)
- [Amazon Chime SDK media pipelines regions](https://docs.aws.amazon.com/chime-sdk/latest/dg/migrate-pipelines.html)
- [Amazon Transcribe pricing](https://aws.amazon.com/transcribe/pricing/)
- [LiveKit pricing](https://livekit.io/pricing)
- [Agora speech-to-text pricing](https://docs.agora.io/en/realtime-media/speech-to-text/reference/pricing)
- [Agora billing policies](https://docs.agora.io/en/introduction/billing/billing-policies)
- [Distil-Whisper: robust knowledge distillation via large-scale pseudo-labelling](https://arxiv.org/abs/2311.00430)
- [uDistil-Whisper: label-free data filtering for knowledge distillation](https://arxiv.org/html/2407.01257v5)
- [Republic Act No. 4200 — Anti-Wiretapping Act](https://legacy.senate.gov.ph/lisdata/4407040049!.pdf)
