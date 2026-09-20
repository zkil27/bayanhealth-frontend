# Design Document: Dashboard Audit Improvements

## Overview

This design addresses a comprehensive frontend audit of the Doctor Dashboard (`/doctor`) and Patient Dashboard (`/patient`) in the BayanHealth MVP application. The work covers ten requirements: semantic token migration, card styling standardization, dead code removal, responsive layout fixes, accessibility improvements, typography hierarchy, loading states, and a naming mismatch fix.

All changes are confined to the frontend (`frontend/bayan-health-mvp/`) and do not alter backend APIs, data models, or infrastructure. The existing component architecture, navigation patterns, and shadcn/ui primitives are preserved.

### Key Design Decisions

1. **Token-first color approach**: All color changes use the existing CSS custom property system in `globals.css` (`:root` and `.dark` blocks). No new tokens are introduced unless strictly necessary (the `bg-chart-*` set already covers the "pending intakes" column).
2. **Static scan tests as guardrails**: The existing `theme-hardcoded-color-scan.test.ts` and `theme-contrast-audit.test.ts` patterns are extended to cover new surfaces, providing regression protection.
3. **Shared utility extraction**: The `deriveDoctorName` rename follows a re-export pattern to maintain backward compatibility while providing a role-neutral name for patient contexts.
4. **CSS-only responsive fixes**: Layout improvements use Tailwind responsive variants and CSS `calc()` / `env()` functions — no JavaScript-based resize observers needed.

---

## Architecture

The changes operate within the existing frontend architecture:

```mermaid
graph TD
    subgraph "Patient Dashboard /patient"
        PL[patient/layout.tsx] --> PH[PatientHeader]
        PL --> PP[patient/page.tsx]
        PL --> NB[NavBar]
        PP --> IG[IconGrid / ServicesGrid]
        PP --> PHV[PatientHomeView]
    end

    subgraph "Doctor Dashboard /doctor"
        DL[doctor/(homepage)/layout.tsx] --> DS[DoctorSidebar]
        DL --> DH[DoctorHeader]
        DL --> DC[DoctorDashboardClient]
        DC --> DM[DoctorDashboardMetrics]
        DC --> DB[DoctorDashboardBoard x3]
        DS --> STS[SidebarTeleconsultStatus]
    end

    subgraph "Shared"
        GC[globals.css — Semantic Tokens]
        UT[lib/utils.ts — deriveDisplayName]
        CT[lib/contrast.ts — contrast utilities]
    end

    PH -.-> GC
    NB -.-> GC
    DS -.-> GC
    DB -.-> GC
    DM -.-> GC
    STS -.-> GC
    PH -.-> UT
    DS -.-> UT
```

**No new components are introduced.** All work modifies existing files in-place or extracts a shared utility to `src/lib/utils.ts`.

---

## Components and Interfaces

### Affected Components (Doctor Dashboard)

| Component | File | Changes |
|-----------|------|---------|
| `DoctorDashboardBoard` | `features/doctor/components/homepage/DoctorDashboardBoard.tsx` | Replace `fill="#09a68d"` → `className="fill-primary"` on BadgeCheck; replace `bg-purple-600` → `bg-chart-4`; change header text to `text-lg font-semibold`; add semantic heading element; responsive column stacking |
| `DoctorDashboardSkeleton` | `features/doctor/components/homepage/DoctorDashboardSkeleton.tsx` | Replace `bg-purple-600` → `bg-chart-4` to match Board; apply standardized card shadow |
| `DoctorDashboardMetrics` | `features/doctor/components/homepage/DoctorDashboardMetrics.tsx` | Replace `shadow-xl` → `shadow-md` on cards and skeleton |
| `DoctorSidebar` | `features/doctor/components/sidebar/DoctorSidebar.tsx` | Replace `border-gray-900/20` → `border-sidebar-border` |
| `SidebarTeleconsultStatus` | `features/doctor/components/sidebar/SidebarTeleconsultStatus.tsx` | Replace `shadow-xl` → `shadow-md`; remove all dead code blocks |
| `DoctorHeader` | `features/doctor/components/header.tsx` | Hide separators on mobile; ensure 44px touch targets; responsive gap |

### Affected Components (Patient Dashboard)

| Component | File | Changes |
|-----------|------|---------|
| `PatientHeader` | `features/patient/components/Header.tsx` | Replace all hardcoded colors (`text-white/*`, `bg-black/*`, `bg-red-500`) with semantic tokens; add `aria-label` to bell button; use `deriveDisplayName` |
| `PatientHeaderBooking` | `features/patient/components/Header.tsx` | Replace `bg-red-500`/`text-red-100` → `bg-destructive`/`text-destructive-foreground` |
| `NavBar` | `features/patient/components/NavBar.tsx` | Replace hardcoded `rgba` shadow → `hsl(var(--primary)/0.5)` shadow; add safe-area bottom padding |
| `IconGrid` (ServicesGrid) | `features/patient/components/homepage/ServicesGrid.tsx` | Replace `shadow-2xl` → `shadow-lg`; hide disabled items on desktop; change heading to `text-lg font-semibold`; replace `<h1>` with `<h2>` |
| `PatientHomeView` | `features/patient/components/homepage/PatientHomeView.tsx` | Change heading to `text-lg font-semibold`; replace `<h1>` with `<h2>` |
| Patient Layout | `app/patient/layout.tsx` | Replace `lg:px-64` → `max-w-lg mx-auto` |

### Shared Utility Change

| Module | Change |
|--------|--------|
| `src/lib/utils.ts` | Add exported `deriveDisplayName(email: string): string` function (delegates to same logic) |
| `features/booking/lib/api/doctors.ts` | Keep `deriveDoctorName` exported (unchanged); optionally re-export from shared module |

### Interface Contracts (Unchanged)

No component props, API interfaces, or data types are modified. All changes are internal styling, markup attributes, and utility naming.

---

## Data Models

### Semantic Token Mapping (Replacement Table)

| Component | Old Value | New Token | Rationale |
|-----------|-----------|-----------|-----------|
| BadgeCheck icon | `fill="#09a68d"` | `className="fill-primary"` | `--primary` is `#09a68d` in light, adapts in dark |
| DoctorSidebar border | `border-gray-900/20` | `border-sidebar-border` | Dedicated sidebar border token exists |
| Pending intakes header | `bg-purple-600` | `bg-chart-4` | `--chart-4` (oklch 0.83 / 0.62 dark) provides distinct accent; defined in both themes |
| SidebarTeleconsultStatus shadow | `shadow-xl` | `shadow-md` | Standardized card styling |
| DoctorDashboardMetrics shadow | `shadow-xl` | `shadow-md` | Standardized card styling |
| IconGrid cards shadow | `shadow-2xl` | `shadow-lg` | Maximum allowed for service cards |
| PatientHeader text | `text-white/80`, `text-white/60` | `text-primary-foreground`, `text-primary-foreground/60` | Adapts to dark mode |
| PatientHeader bg | `bg-black/20`, `bg-black/30` | `bg-primary-foreground/10`, `bg-primary-foreground/20` | Adapts to dark mode |
| Notification badge | `bg-red-500` | `bg-destructive` | Semantic destructive token |
| Urgent button | `bg-red-500 text-red-100` | `bg-destructive text-destructive-foreground` | Semantic tokens |
| NavBar Book shadow | `rgba(24,165,140,0.50)` | `shadow-[0_3px_6px_hsl(var(--primary)/0.5)]` | References --primary token |

### Typography Scale

| Level | Classes | Usage |
|-------|---------|-------|
| Page title | `text-2xl font-bold` | Top-level page heading (h1) |
| Section heading | `text-lg font-semibold` | Card group titles, column headers (h2) |
| Card title | `text-base font-semibold` | Individual card headings (h3) |
| Body/meta | `text-sm` | Descriptive text, metadata |

### Card Styling Standard

```
border-l-3 border-{contextual} shadow-md p-4
```
- Metrics cards: `border-primary`
- Status cards: `border-secondary`
- Maximum shadow: `shadow-md` for doctor dashboard cards, `shadow-lg` for patient service cards

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Display name derivation equivalence

*For any* valid email string, calling `deriveDisplayName(email)` SHALL produce the same result as calling `deriveDoctorName(email)`, ensuring the refactored utility is a drop-in replacement that preserves behavior across all inputs.

**Validates: Requirements 10.1, 10.3**

---

## Error Handling

This feature is purely a frontend styling/structure audit. Error handling considerations are minimal:

1. **Build failures from dead code removal**: If removing dead code leaves unused imports, the TypeScript compiler (`noUnusedLocals`) and ESLint will catch these. The implementation must remove orphaned imports in the same commit.

2. **Contrast failures**: If a replaced token produces insufficient contrast, the `theme-contrast-audit.test.ts` will fail with an actionable message naming the token pair, measured ratio, required minimum, and affected theme. The fix is to adjust the token value in `globals.css`.

3. **Safe-area fallback**: The `env(safe-area-inset-bottom)` CSS function gracefully falls back to `0px` on devices without a home indicator, so the NavBar will render correctly on all devices.

4. **Responsive calc() fallback**: The dynamic `calc(100vh - ...)` height for ScrollArea uses CSS native functions. On browsers that don't support `dvh` units, `vh` is used as fallback. The fixed `h-[45vh]` remains for viewports >= 700px as a stable baseline.

5. **Import path changes**: The `deriveDisplayName` shared utility is a simple re-export. If any call site fails to update, TypeScript will produce a compile error (function not found at old import path). The `deriveDoctorName` export remains unchanged for doctor-context consumers.

---

## Testing Strategy

### Approach

This feature is primarily UI/CSS refactoring with one pure-function utility extraction. The testing strategy uses:

1. **Static source scanning tests** (existing pattern) — verify hardcoded colors are removed
2. **Deterministic contrast audit tests** (existing pattern) — verify WCAG compliance of token pairs
3. **Property-based test** — verify `deriveDisplayName` equivalence with `deriveDoctorName`
4. **Build verification** — TypeScript type-check + ESLint pass with zero errors
5. **Render smoke tests** — verify components render without crashing after changes

### Property-Based Testing

**Library**: `fast-check` (already installed as devDependency)  
**Framework**: Vitest  
**Minimum iterations**: 100

The single property test validates Requirement 10.1:

```typescript
// Feature: dashboard-audit-improvements, Property 1: Display name derivation equivalence
import fc from "fast-check";
import { deriveDisplayName } from "@/lib/utils";
import { deriveDoctorName } from "@/features/booking/lib/api/doctors";

it("deriveDisplayName produces same result as deriveDoctorName for any email", () => {
  fc.assert(
    fc.property(fc.emailAddress(), (email) => {
      expect(deriveDisplayName(email)).toBe(deriveDoctorName(email));
    }),
    { numRuns: 100 }
  );
});
```

### Static Scan Tests (Example-Based)

Extend the existing `theme-hardcoded-color-scan.test.ts` to cover:
- `PatientHeader` and `NavBar` (Requirement 2.6)
- `DoctorDashboardBoard` and `DoctorSidebar` (Requirement 1)
- Shadow weight assertions across all dashboard cards (Requirement 3.4)

### Contrast Audit Tests (Example-Based)

The existing `theme-contrast-audit.test.ts` already covers core token pairs. Add:
- `primary` / `primary-foreground` gradient check (Requirement 2.5)
- `chart-4` / white text check for the pending intakes header (Requirement 1.4)
- Disabled card opacity contrast check at 75% (Requirement 7.2)

### Build & Lint Verification

After all changes:
```bash
npm run build    # Next.js production build (includes TypeScript type-check)
npm run lint     # ESLint with no-unused-vars
npm run test     # Vitest suite including property + scan + contrast tests
```

### Render Smoke Tests

The existing `route-render-smoke.test.tsx` covers `/doctor` and `/patient` route rendering. No new smoke tests needed — existing ones validate the components still mount after styling changes.

### What Is NOT Property-Tested

The majority of this feature involves:
- Static source scanning (fixed file content, not variable input)
- CSS class presence/absence (deterministic per file)
- Responsive layout (visual, viewport-specific)
- Accessibility attributes (specific DOM checks)

These are best served by example-based tests, render checks, and build verification — not property-based testing. PBT applies only to the `deriveDisplayName` equivalence property where input variation (email strings) reveals potential edge cases in the parsing logic.
