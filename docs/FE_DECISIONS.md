# BayanHealth Migration Decision Log

Purpose: Record architecture/product/security decisions that are binding for the team.  
Rule: If a change is not logged here, it is not an approved change.

---

## Decision Template

- Date:
- Decision ID: `ADR-YYYYMMDD-XX`
- Title:
- Status: `Proposed | Accepted | Superseded | Rejected`
- Owner:
- Context:
- Decision:
- Alternatives considered:
- Consequences:
  - Positive:
  - Trade-offs:
  - Follow-up actions:
- Related files/tickets/PRs:

---

## Accepted Decisions

### ADR-20260504-01 : Frontend folder structure

- Status: Accepted
- Owner: Frontend Engineer
- Decision: Follows a very loose Feature-sliced Design (FSD) for frontend folder structure
- Consequences:
  - Positive: Separation of features are well-defined and files related to them are within their own folders. 
- Related files/tickets/PRs:
	- `frontend/bayan-health-mvp/`

### ADR-20260504-02 : Shadcn as main component library

- Status: Accepted
- Owner: Frontend Engineer
- Decision: Uses Shadcn as the frontend main component library 
- Context: Shadcn is compatible with Tailwind and is a headless UI component library
- Consequences:
  - Positive: Able to create own components to customize for more metrics, telemetry, etc.

### ADR-20260505-01 : Zustand as state management library

- Status: Accepted
- Owner: Frontend Engineer
- Decision: Uses Zustand as state management library
- Consequences:
  - Positive: Fast and easy to learn state management library
  - Trade-offs: Needed to know Next.js specific requirements for implementing Zustand correctly

### ADR-20260521-01 : ElevenLabs for agent and audio components

- Status: Accepted
- Owner: Frontend Engineer
- Decision: Add ElevenLabs components for agent and audio related UI
- Context: ElevenLabs components are built on top of Shadcn Library
- Consequences:
  - Positive: Headless UI for agent and audio related

### ADR-20260521-02 : TipTap for text editor

- Status: Accepted
- Owner: Frontend Engineer
- Decision: Add TipTap for their open-source text editor UI
- Context: TipTap text editor is built on top of Prosemirror
- Consequences:
  - Positive: Enable `doctor` users to be provided with editing interface for features with documents with the familiar feel of Markdown and WYSIWYG editors
  - Trade-offs: While Tiptap text editor is open-source, there are components that they built themselves and required payments to use.

### ADR-20260608-01 : React hook form, Zod, and TanStack Query for forms and data fetching

- Status: Accepted
- Owner: Frontend Engineer
- Decision: Add React hook form, Zod, and TanStack Query for forms and data fetching
- Consequences:
  - Positive: 
    - React hook form and zod enables fast performance, type safety, better state synchronization, and inline field data validation.
    - Tanstack Query is better for devUX for client-side data fetching, updating stale data, and real-time feedback.
  - Trade-offs: 
	  - React hook form and TanStack Query requires being in client components
	  - These libraries have some amount of upfront code to work

---

## Superseded Decisions

- None yet.

---

## Open Proposed Decisions

- None yet.