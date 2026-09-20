# Implementation Plan: Dark Mode Support

## Overview

This plan finishes the half-built theming system in `frontend/bayan-health-mvp` (Next.js App Router, Tailwind v4, `next-themes`). Work proceeds bottom-up: first establish the deterministic verification harness (contrast helper + token/scan tests) so every later migration has an automated gate, then correct the token source of truth in `globals.css`, fix and mount the Theme Control, verify provider/no-flash wiring, and finally migrate components area-by-area off hardcoded colors onto semantic tokens. Each migration wave is validated against the contrast audit and hardcoded-color scan before moving on, and the whole effort ends by confirming the build, lint, and existing baseline test suite stay green.

All work is presentation-only — no backend, API, routing, or route-guard changes (Requirement 7). Implementation language is TypeScript/TSX, consistent with the existing frontend.

## Tasks

- [x] 1. Establish contrast verification helper
  - [x] 1.1 Implement WCAG contrast helper in `src/lib/contrast.ts`
    - Implement `oklch(...)` and hex parsing to sRGB, WCAG relative luminance, and contrast-ratio calculation
    - Export a helper to extract perceived lightness for the `secondary` lightness comparison
    - _Requirements: 1.1, 3.1, 3.2_

  - [x] 1.2 Write unit tests for the contrast helper
    - Test symmetry (`contrast(a,b) === contrast(b,a)`), identity (`contrast(c,c) === 1`), range `[1,21]`, and reference pairs (black/white = 21:1)
    - _Requirements: 1.1, 3.2_

- [x] 2. Build the deterministic theming test harness
  - [x] 2.1 Write exhaustive token contrast audit test
    - Parse semantic token values from `src/app/globals.css` for both `:root` and `.dark`
    - Enumerate every background/foreground pair (`background`, `card`, `popover`, `muted`, `secondary`, `primary`, `accent`) with `it.each` and assert ≥ 4.5:1 in both themes
    - Assert dark `secondary` perceived lightness < `secondary-foreground` perceived lightness
    - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 2.2 Write hardcoded-color static scan test
    - Scan the Req 2.2 offender surfaces, every Role Area under `src/app/**` and `src/features/**`, and `src/components/ui/**` for theme-dependent hardcoded utilities (`text-gray-*`, `bg-white`, `bg-gray-*`, `text-black`, `text-[#...]`, `bg-[#...]`)
    - Pass only when remaining matches are entries in a Brand Color Registry allowlist (canonical teal / logotype); fail with file and line otherwise
    - _Requirements: 2.1, 2.5_

- [x] 3. Checkpoint - verification harness in place
  - Run the contrast audit and color scan; they are expected to report the current failures (broken `secondary`, hardcoded colors). Confirm the harness runs and reports actionable file/line output. Ensure all other tests pass, ask the user if questions arise.

- [x] 4. Correct the semantic token palette in `globals.css`
  - [x] 4.1 Fix the dark and light `secondary` token pair
    - Set `.dark` `--secondary` to a dark surface (≈ L 0.27, chroma-matched to `--muted`/`--card`) so its lightness is below `--secondary-foreground` and the pair meets ≥ 4.5:1
    - Correct the light `:root` `secondary`/`secondary-foreground` pair so it also meets ≥ 4.5:1
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.2 Verify and adjust all remaining token pairs to meet contrast
    - Adjust any `background`/`card`/`popover`/`muted`/`primary`/`accent` foreground-background pair below 4.5:1 in either theme, keeping the brand teal `--primary` value fixed
    - Preserve the existing Tailwind v4 `@theme inline` / `@custom-variant dark` structure; change values only, add/remove no tokens
    - _Requirements: 3.2, 3.4, 7.6_

  - [x] 4.3 Run the contrast audit against corrected tokens
    - Confirm task 2.1's audit now passes for every pair in both themes
    - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.4_

- [x] 5. Fix and wire the Theme Control
  - [x] 5.1 Re-skin `ModeToggle` with semantic tokens
    - Replace hardcoded `bg-[#0f0f0f] dark:bg-[#f0f0ec] text-[#f5f5f0] dark:text-[#111]` and `border-black/10 dark:border-white/10` with token utilities (`bg-secondary text-secondary-foreground border-border`, outline variant)
    - Preserve behavior: three options mapping 1:1 to `light`/`dark`/`system` via `useTheme().setTheme`, and the `mounted` guard
    - _Requirements: 4.2, 4.6_

  - [x] 5.2 Migrate the Application Shell header and mount the Theme Control
    - In `src/components/blocks/header/header.tsx` (`AppHeader`), replace `border-white/10` / `dark:bg-gray-900/10` with token utilities (`border-border bg-background/80`)
    - Mount a single `<ModeToggle />` instance in `AppHeader` so it is reachable on all authenticated routes
    - _Requirements: 4.1_

  - [x] 5.3 Write Theme Control behavior tests
    - Render `ModeToggle` inside `ThemeProvider`; assert visible activatable trigger and exactly three options (Light/Dark/System)
    - Assert selecting an option calls `setTheme` and updates `resolvedTheme` / `<html>` class without reload; with mocked `matchMedia`, assert `system` resolves to `prefers-color-scheme` and updates on media-query change
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.5_

- [x] 6. Verify provider wiring and persistence
  - [x] 6.1 Verify and preserve `next-themes` provider configuration
    - Confirm `src/app/layout.tsx` keeps `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, and `<html suppressHydrationWarning>`
    - Search the tree for and remove any residual `forcedTheme` / "force light" workaround
    - _Requirements: 5.4, 7.7_

  - [ ]* 6.2 Write persistence and fallback tests
    - Assert selecting a preference writes `localStorage['theme']` and a remount reads it back and applies the class
    - Assert that with `localStorage` access stubbed to throw, rendering still succeeds and resolves from the mocked System Theme
    - Assert provider config props are present in `layout.tsx` as the no-flash guarantee
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_

- [x] 7. Checkpoint - tokens, control, and wiring verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Migrate Requirement 2.2 heaviest-offender surfaces
  - [x] 8.1 Migrate the intake forms to semantic tokens
    - Convert `CheckupSection`, `PersonDataSection`, `Teleconsult`, `AdditionalInfoSection`, and `ServiceRequestSection` theme-dependent colors to tokens per the design mapping table
    - _Requirements: 2.1, 2.2, 2.5, 6.1_

  - [x] 8.2 Migrate booking and doctor-list surfaces
    - Convert `BookingDoctorDetails` and `DoctorList` to semantic tokens (background, foreground, muted text, borders, focus ring, brand-teal accents)
    - _Requirements: 2.1, 2.2, 2.5, 6.1_

  - [x] 8.3 Migrate patient Header, NavBar, and advertisement carousel
    - Convert the patient `Header`, `NavBar` (including the `AreaNav` `text-secondary` usage), and `AdvertisementCarousel` to semantic tokens
    - _Requirements: 2.1, 2.2, 2.5, 6.1_

  - [x] 8.4 Migrate the doctor dashboard
    - Convert the doctor dashboard theme-dependent colors to semantic tokens
    - _Requirements: 2.1, 2.2, 2.5, 6.1_

  - [x] 8.5 Run the color scan against migrated offender surfaces
    - Confirm task 2.2's scan reports no remaining hardcoded colors on these surfaces (only allowlisted brand colors)
    - _Requirements: 2.5_

- [x] 9. Checkpoint - heaviest offenders migrated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Migrate Shared Primitives in `src/components/ui/`
  - [x] 10.1 Audit and migrate Shared Primitive exceptions to tokens
    - Fix non-token colors in primitives surfaced by the scan (e.g. `slider.tsx` `bg-white`, `sidebar.tsx` `bg-white`, `drawer.tsx` `bg-gray-900/40`); cover cards, badges, inputs, tables, dialogs, drawers, empty states, loading/skeleton/spinner states, and error/alert states
    - Replace the stray `text-black` in `ToastForTesting.tsx` with a token; confirm `sonner.tsx` maps to `--popover`/`--popover-foreground`/`--border` and forwards `theme`
    - Ensure interactive states (hover, focus, active, disabled, selected) use token-based color/boundary indication
    - _Requirements: 2.1, 2.5, 6.2, 6.3, 6.4_

  - [ ]* 10.2 Write Shared Primitive theming tests
    - Assert representative primitives render token-derived colors and that a `sonner` toast renders token-based background/foreground in both themes
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 11. Migrate remaining Role Areas
  - [x] 11.1 Migrate admin, consultation, and auth Role Areas
    - Convert theme-dependent colors under the `admin`, `consultation`, and `auth` areas (`src/app/**`, `src/features/**`) to semantic tokens
    - _Requirements: 2.1, 2.5, 6.1_

  - [x] 11.2 Migrate landing and any remaining patient/doctor/booking/intake surfaces
    - Convert remaining theme-dependent colors across the `landing` area and any leftover patient/doctor/booking/intake surfaces to semantic tokens
    - _Requirements: 2.1, 2.5, 6.1_

  - [x] 11.3 Run the full color scan across all Role Areas and primitives
    - Confirm task 2.2's scan passes repo-wide for in-scope files (only allowlisted brand colors remain)
    - _Requirements: 2.5_

- [x] 12. Integration and final verification
  - [x] 12.1 Extend the mounted-shell render smoke test
    - Mirror `route-render-smoke.test.tsx` to assert the Application Shell renders the Theme Control trigger on an authenticated route and role-area routes still render as populated, non-blank layouts after migration
    - _Requirements: 4.1, 6.1_

  - [x] 12.2 Run lint, build, and the full baseline test suite
    - Run `npm run lint`, `npm run build`, and `npm run test`; correct any failure introduced by this feature so the build produces the same deployable artifacts and every previously-passing test still passes
    - Confirm no "force light" workaround remains and both themes are selectable via the Theme Control
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.7_

- [x] 13. Final checkpoint - all green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (unit/integration tests) and can be skipped for a faster MVP, but they back the verification strategy in the design.
- This feature has no Correctness Properties section in the design (UI rendering, CSS configuration, and theme-library integration), so there are no property-based test tasks. Correctness is gated by the deterministic contrast audit (task 2.1) and the hardcoded-color scan (task 2.2).
- Each task references specific requirement sub-clauses for traceability.
- Checkpoints ensure incremental validation: the verification harness lands first so every migration wave is gated automatically.
- All changes are presentation-only; no backend, API, routing, or route-guard code is touched (Requirement 7).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2", "5.1", "6.1"] },
    { "id": 2, "tasks": ["4.1", "4.2", "5.2", "6.2"] },
    { "id": 3, "tasks": ["4.3", "5.3", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 4, "tasks": ["8.5", "10.1", "11.1", "11.2"] },
    { "id": 5, "tasks": ["10.2", "11.3", "12.1"] },
    { "id": 6, "tasks": ["12.2"] }
  ]
}
```
