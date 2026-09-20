# Design Document

## Overview

Seven targeted frontend changes that eliminate demo-readiness gaps. Five are
blockers visible to stakeholders; two are clean-up items that reduce build risk
and technical debt. No backend, API contract, or infrastructure changes are
included. All changes must leave `typecheck`, `lint`, and `build` passing.

## Architecture

The changes are purely additive or substitutive within the existing Next.js 14
App Router frontend. No new shared libraries, stores, or API contracts are
introduced. All data access reuses the existing `api.ts` client and
`useAuthStore` Zustand store.

```
src/
├── app/
│   ├── booking/
│   │   └── doctor/
│   │       ├── [doctorId]/page.tsx   ← NEW  (Req 1)
│   │       └── id/page.tsx           ← DELETE (Req 1)
│   └── admin/
│       └── layout.tsx                ← MODIFY — add SignOutButton (Req 4)
├── features/
│   ├── booking/
│   │   └── lib/api/doctors.ts        ← MODIFY — remove getMockDoctorPage() (Req 1)
│   ├── patient/
│   │   └── components/Header.tsx     ← MODIFY — real data + SignOutButton (Req 2, 3, 4)
│   ├── doctor/
│   │   └── components/header.tsx     ← MODIFY — remove dev link + SignOutButton (Req 4, 5)
│   └── admin/
│       └── data/mockData.ts          ← DELETE (Req 7)
└── .github/workflows/ci.yml          ← MODIFY — add npm test step (Req 6)
```

---

## Requirement 1 — Doctor Detail Dynamic Route

### Components

**`src/app/booking/doctor/[doctorId]/page.tsx`** (new file, replaces the
static `id/page.tsx`)

- Client component (`"use client"`)
- Receives `{ params }: { params: Promise<{ doctorId: string }> }` via
  Next.js 14 App Router dynamic segment
- Reads `idToken` from `useAuthStore`
- Wraps both data fetches in a single `AsyncView` using the fetcher form

**`src/features/booking/lib/api/doctors.ts`** (modified)

- `getDoctor()` is replaced with `fetchDoctorDetail(doctorId: string, token:
  string)` — a real API function following the same pattern as
  `fetchDoctorSearch`
- The `getMockDoctorPage()` import and call are removed entirely

### Data Flow

```
DoctorDetailPage (mounts)
  └── AsyncView (fetcher form)
        └── fetchDoctorDetail(doctorId, token)
              ├── api.get(`/v1/admin/users/${doctorId}`, token)   ← profile
              └── api.get(`/v1/doctors/${doctorId}/schedules`, token)  ← slots
              └── Promise.all([profileReq, schedulesReq])
```

Both requests run in parallel via `Promise.all`. If either rejects, the error
propagates to `AsyncView` which renders its standard error + retry state.

### Data Models

```typescript
// Returned by GET /v1/admin/users/{userId}
interface DoctorProfileResponse {
  userId: string;
  email: string;
  enabled: boolean;
  status: string;
  groups: string[];
  createdAt?: string;
}

// Slot shape already defined in doctors.ts as BackendSlot
// { slotId, doctorId, date, startTime, durationMinutes, status, ... }

interface DoctorDetailData {
  profile: DoctorProfileResponse;
  slots: BackendSlot[];
}
```

### Slot Selection and Booking Button State

Local `useState<string | null>(null)` holds the selected `slotId`.

```typescript
const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
```

- Booking button `disabled` attribute = `selectedSlotId === null`
- Selecting a slot calls `setSelectedSlotId(slot.slotId)`
- Booking button navigates to `/booking/createBooking/${doctorId}?slotId=${selectedSlotId}` when enabled

### Empty State

When `slots.filter(s => s.status === "available").length === 0`, the data
branch renders:

```tsx
<p>No available slots — check back later</p>
```

The booking button is omitted entirely when there are no slots.

### Deletion

`src/app/booking/doctor/id/page.tsx` is deleted. No other file imports it
(it is a Next.js page, consumed by the router, not by imports).

---

## Requirement 2 — Patient Header Real Data

### Component: `PatientHeader`

**Identity fields** — read synchronously from `useAuthStore`, no fetch:

```typescript
const email   = useAuthStore((s) => s.session?.email ?? "");
const userId  = useAuthStore((s) => s.session?.userId ?? "");
```

- Display name: `deriveDoctorName(email)` (reuse existing utility from
  `doctors.ts`) renders e.g. `"Sarah Rodriguez"` from `sarah.rodriguez@…`
- ID display: last 6 characters of `userId`, uppercased:
  ```typescript
  const shortId = userId.slice(-6).toUpperCase();
  // e.g. "A3F9BC"
  ```

**Last Consultation** — fetched with a lightweight `useState`/`useEffect`
(not `AsyncView`, because this is a small embedded field inside an already-
rendered header):

```typescript
type LastConsultState =
  | { status: "loading" }
  | { status: "done"; label: string }
  | { status: "empty" };

const [lastConsult, setLastConsult] = useState<LastConsultState>({ status: "loading" });

useEffect(() => {
  if (!idToken) { setLastConsult({ status: "empty" }); return; }
  api.get<BookingListPage>("/v1/bookings?limit=5&sort=desc", idToken)
    .then(res => {
      const recent = res.data.items.find(
        b => b.status === "completed" || b.status === "in_progress"
      );
      setLastConsult(recent
        ? { status: "done", label: formatRelativeTime(recent.createdAt) }
        : { status: "empty" }
      );
    })
    .catch(() => setLastConsult({ status: "empty" }));
}, [idToken]);
```

- `status: "loading"` → render a `<Skeleton>` in the "Last Consultation" area
- `status: "done"` → render the formatted date string with underline
- `status: "empty"` → render `—`

### Helper: `formatRelativeTime`

A local pure function that converts an ISO timestamp to a human-readable
relative string (e.g. `"2 days, 14h ago"`). No external dependency needed;
implemented with `Date.now()` arithmetic.

---

## Requirement 3 — PatientHeaderBooking Placeholder Copy

One-line change in `PatientHeaderBooking`:

```tsx
// Before:
"Some Feature, Some Feature, Some Feature, Some Feature, Some Feature,"

// After:
"Book a consultation with a specialist in minutes."
```

---

## Requirement 4 — Sign-Out in Authenticated Shells

`SignOutButton` is already at
`src/components/blocks/navigation/SignOutButton.tsx`. It accepts `variant`,
`size`, `iconOnly`, and `label` props; delegates all behaviour to
`useSignOut`. No new logic is introduced.

### PatientHeader

Add to the existing `flex shrink-0 items-center gap-3` icon cluster, after
the Bell button:

```tsx
import { SignOutButton } from "@/components/blocks/navigation/SignOutButton";

// In the right-side cluster:
<SignOutButton variant="ghost" size="icon" iconOnly />
```

### DoctorHeader

Add to the `ml-auto flex gap-1` cluster, after `<DoctorNotification />`:

```tsx
import { SignOutButton } from "@/components/blocks/navigation/SignOutButton";

<Separator orientation="vertical" className="bg-border" />
<SignOutButton variant="ghost" size="icon" iconOnly />
```

### AdminLayout

Add to the right side of the sticky header `<header>` element:

```tsx
import { SignOutButton } from "@/components/blocks/navigation/SignOutButton";

// Inside the header, after the title block:
<div className="ml-auto">
  <SignOutButton variant="ghost" size="sm" />
</div>
```

---

## Requirement 5 — Doctor Header Dev-Copy Link Removal

The post-consultation page exists only at
`/doctor/post-consultation/id` (static `id` segment, not a dynamic
`[consultationId]` route). No production-ready dynamic post-consultation
route exists in the App Router at the time of this change, so Requirement
5.3 applies.

The `<Link href="/doctor/post-consultation/id">POST-CONSULTATION</Link>`
element and its surrounding styling are deleted from `DoctorHeader`. No
replacement element is rendered in its place.

---

## Requirement 6 — CI Test Gate

In `.github/workflows/ci.yml`, inside the `frontend` job, insert a new step
between the existing `Lint` step and the existing `Build` step:

```yaml
- name: Test
  run: npm test
```

The `package.json` in `frontend/bayan-health-mvp` already configures
`"test": "vitest --run"` (single-execution mode), so this step terminates
and exits with the test suite's exit code. A non-zero exit code fails the job
before the `Build` step runs.

---

## Requirement 7 — Delete Dead Admin Mock Data

`src/features/admin/data/mockData.ts` is deleted. A grep for any import of
`features/admin/data/mockData` across the codebase returns zero results,
confirming no file will develop a missing-module error after deletion. The
build step is unaffected.

---

## Error Handling

| Scenario | Handling |
|---|---|
| `fetchDoctorDetail` profile or schedules fetch fails | `AsyncView` renders error state with retry control (Req 1.5) |
| Patient bookings fetch fails | `lastConsult` set to `{ status: "empty" }`; header renders `—` (Req 2.5) |
| `idToken` is null when PatientHeader mounts | Last Consultation fetch is skipped; `—` is rendered immediately |
| Sign-out fails | `useSignOut` retains the session and surfaces error state — no change needed in host components |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all
valid executions of a system — a formal statement about what the system should
do. Properties serve as the bridge between human-readable specifications and
machine-verifiable correctness guarantees.*

### Property 1: Slot selection gates the booking button

*For any* rendered `DoctorDetailPage` with at least one available slot, the
booking button SHALL be disabled when no slot is selected and SHALL be enabled
after any slot is selected. Selecting a slot then clearing the selection SHALL
return the button to the disabled state.

**Validates: Requirements 1.7, 1.8**

---

### Property 2: Session identity fields are rendered without placeholders

*For any* `AuthSession` with a non-empty `email` and `userId`, the
`PatientHeader` SHALL render a greeting derived from the session email (not
the static string `"(User Name)"`) and a formatted ID derived from the
session `userId` (not the static string `"12457"`).

**Validates: Requirements 2.1, 2.2**

---

### Property 3: Most-recent qualifying booking is surfaced

*For any* non-empty list of bookings returned by `GET /v1/bookings`, the
"Last Consultation" display in `PatientHeader` SHALL show the booking with
the most recent `createdAt` timestamp among those whose `status` is
`completed` or `in_progress`. If no booking in the list has either status,
the display SHALL render `—`.

**Validates: Requirements 2.3, 2.5**

---
