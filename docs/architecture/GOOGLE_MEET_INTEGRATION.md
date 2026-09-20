# Google Meet Consultation Integration — SUPERSEDED

> **This document is superseded and must not be used for implementation.**
> Google Meet is no longer the intended video-consultation provider.
> See **[TELECONSULT_VIDEO_AND_AI_SCRIBE.md](./TELECONSULT_VIDEO_AND_AI_SCRIBE.md)**
> for the current engineering position, vendor comparison, and roadmap.

**Superseded:** 2026-08-17
**Superseded by:** `TELECONSULT_VIDEO_AND_AI_SCRIBE.md`
**Original decision:** [ADR-20260720-02](./DECISIONS.md) — accepted architecture,
implementation gated, never implemented

## Why this file still exists

It is referenced by path from `contracts/openapi.yaml` (the `videoJoinUrl` description),
from `frontend/bayan-health-mvp/src/types/openapi.generated.ts` (generated from that
contract), from ADR-20260720-02 and ADR-20260807-06 in `DECISIONS.md`, from
`GOVERNANCE_INDEX.md`, and from `README.md`. Deleting it would mean editing the contract
source of truth and regenerating types for a documentation reason, while leaving five
dangling governance references.

Its prescriptive content has been removed so that nothing here can drift. The
supersession is recorded rather than erased, consistent with how `DECISIONS.md` handles
superseded ADRs.

## Why Google Meet was dropped

Summarised here only so a reader arriving from an old link understands the outcome. Full
reasoning, evidence, and alternatives are in the superseding document.

- Every remaining blocker was **external to engineering** — Google Workspace
  administrator access, plan validation, domain-wide delegation, data-processing terms,
  the organizer identity model, and a per-doctor seat decision.
- It was the **only candidate requiring new infrastructure to capture consultation
  audio** for the AI scribe: a receive-only WebRTC bot on long-lived compute, in a stack
  where all compute is Lambda.
- Its access control was **weaker than the alternatives**. Patients are not domain users,
  so without paid per-doctor seats no one can admit a knocking patient, forcing an open
  space where a forwarded link works indefinitely. Every alternative issues a short-lived
  token scoped to one consultation and one role.

## What was preserved from the original design

These rules were correct and are carried forward into the replacement, so the original
work was not wasted:

- BayanHealth remains the system of record and authorization boundary for booking
  assignment, consent, session eligibility, clinical completion, document release, chat
  fallback, and audit. The video provider is never a source of truth for treatment,
  diagnosis, payment, or document release.
- The backend alone talks to the provider. Browser code never receives provider secrets
  or direct provider-control capability.
- The join credential is disclosed only to the owning patient or assigned doctor, only
  while the booking is eligible, and never appears in list endpoints, logs, error
  messages, analytics, or notification templates.
- Ownership and assignment mismatches return `404` rather than leaking existence.
- A provider event never constitutes proof that a clinical consultation was completed.
- Chat remains an independent fallback and the retained clinical communication channel.

## Related

- Current position: [`TELECONSULT_VIDEO_AND_AI_SCRIBE.md`](./TELECONSULT_VIDEO_AND_AI_SCRIBE.md)
- Demo video stand-in still present in `dev`: [ADR-20260807-06](./DECISIONS.md)
- Decision log: [`DECISIONS.md`](./DECISIONS.md)
