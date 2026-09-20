# Implementation Plan: Dashboard Audit Improvements

## Overview

Comprehensive frontend audit addressing hardcoded colors, card styling, dead code, responsive layout, accessibility, typography, loading states, and a naming mismatch across the Doctor and Patient dashboards. All changes are confined to `frontend/bayan-health-mvp/src/` and use the existing shadcn/ui + Tailwind + CSS custom property system.

## Tasks

- [x] 1. Semantic token migration — Doctor Dashboard
  - [x] 1.1 Replace hardcoded colors in DoctorDashboardBoard
    - In `src/features/doctor/components/homepage/DoctorDashboardBoard.tsx`:
      - Replace `fill="#09a68d"` on the BadgeCheck icon with `className="fill-primary"`
      - Replace `bg-purple-600` on the "pending intakes" column header with `bg-chart-4`
      - Remove the commented-out `channelLogo` badge block
    - _Requirements: 1.1, 1.3, 4.3_

  - [x] 1.2 Replace hardcoded colors in DoctorSidebar
    - In `src/features/doctor/components/sidebar/DoctorSidebar.tsx`:
      - Replace `border-gray-900/20` with `border-sidebar-border`
    - _Requirements: 1.2_

  - [x] 1.3 Replace hardcoded color in DoctorDashboardSkeleton
    - In `src/features/doctor/components/homepage/DoctorDashboardSkeleton.tsx`:
      - Replace `bg-purple-600` with `bg-chart-4` to match the Board column header
    - _Requirements: 1.3_

  - [x]* 1.4 Extend theme-hardcoded-color-scan test for Doctor Dashboard files
    - In `src/app/theme-hardcoded-color-scan.test.ts`:
      - Add `DoctorDashboardBoard.tsx` and `DoctorSidebar.tsx` to the scanned file list
      - Verify zero hardcoded color offenses in those files
    - _Requirements: 1.1, 1.2, 1.3_

  - [x]* 1.5 Add contrast audit assertions for Doctor Dashboard tokens
    - In `src/app/theme-contrast-audit.test.ts`:
      - Add a check for `chart-4` foreground text against its background in both light and dark
      - Verify minimum 4.5:1 for text and 3:1 for non-text UI components
    - _Requirements: 1.4, 1.5_

- [x] 2. Semantic token migration — Patient Dashboard
  - [x] 2.1 Replace hardcoded colors in PatientHeader
    - In `src/features/patient/components/Header.tsx`:
      - Replace all `text-white`, `text-white/*` with `text-primary-foreground` (with opacity modifiers)
      - Replace `bg-black/20`, `bg-black/30` overlays with `bg-primary-foreground/10`, `bg-primary-foreground/20`
      - Replace `bg-red-500` on notification badge with `bg-destructive`
      - Replace `bg-red-500`/`text-red-100` on urgent button with `bg-destructive`/`text-destructive-foreground`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Replace hardcoded shadow in NavBar
    - In `src/features/patient/components/NavBar.tsx`:
      - Replace the `rgba(24,165,140,0.50)` shadow value with `shadow-[0_3px_6px_hsl(var(--primary)/0.5)]`
    - _Requirements: 2.4_

  - [x]* 2.3 Extend theme-hardcoded-color-scan test for Patient Dashboard files
    - In `src/app/theme-hardcoded-color-scan.test.ts`:
      - Add `PatientHeader` (`Header.tsx`) and `NavBar.tsx` to the scanned file list
      - Verify zero hardcoded color offenses
    - _Requirements: 2.6_

  - [x]* 2.4 Add contrast audit assertions for Patient Dashboard tokens
    - In `src/app/theme-contrast-audit.test.ts`:
      - Add check for `primary`/`primary-foreground` gradient contrast (4.5:1 normal text, 3:1 large text)
      - Verify in both light and dark modes
    - _Requirements: 2.5_

- [x] 3. Standardize card styling across dashboards
  - [x] 3.1 Standardize Doctor Dashboard card shadows
    - In `src/features/doctor/components/sidebar/SidebarTeleconsultStatus.tsx`:
      - Replace `shadow-xl` with `shadow-md`; retain `border-l-3 border-secondary`
    - In `src/features/doctor/components/homepage/DoctorDashboardMetrics.tsx`:
      - Replace `shadow-xl` with `shadow-md` on metric cards and skeleton cards; retain `border-l-3 border-primary`
    - In `src/features/doctor/components/homepage/DoctorDashboardSkeleton.tsx`:
      - Apply `shadow-md` and matching border/padding to skeleton cards
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [x] 3.2 Standardize Patient Dashboard card shadows
    - In `src/features/patient/components/homepage/ServicesGrid.tsx`:
      - Replace `shadow-2xl` with `shadow-lg` on IconGrid service cards
    - _Requirements: 3.5_

- [x] 4. Remove dead code from Doctor Dashboard components
  - [x] 4.1 Remove dead code from SidebarTeleconsultStatus
    - In `src/features/doctor/components/sidebar/SidebarTeleconsultStatus.tsx`:
      - Remove all commented-out code blocks (collapsed-sidebar popover, alternative card layout)
      - Remove inline single-line disabled code comments (unused state refs, className expressions)
      - Remove any import statements that become unused after dead code removal
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 4.2 Verify build after dead code removal
    - Run `npm run build` (Next.js production build with TypeScript type-check) in `frontend/bayan-health-mvp/`
    - Run `npm run lint` to confirm zero lint errors
    - Ensure all existing tests pass with `npx vitest --run`
    - _Requirements: 4.5_

- [x] 5. Checkpoint — Semantic tokens, card styling, and dead code
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Fix responsive layout — Doctor Dashboard
  - [x] 6.1 Implement dynamic ScrollArea height for short viewports
    - In `src/features/doctor/components/homepage/DoctorDashboardBoard.tsx`:
      - Replace fixed `h-[45vh]` with a responsive approach:
        - Below 700px viewport height: use `calc(100dvh - <header+metrics height>)` via a CSS custom property or Tailwind arbitrary value
        - At or above 700px: retain `h-[45vh]`
      - Ensure vertical scrollbar is always available when content overflows
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 6.2 Add responsive column stacking for Board
    - In `src/features/doctor/components/homepage/DoctorDashboardBoard.tsx` (or parent layout):
      - Add `flex-col md:flex-row` (or equivalent grid) so columns stack vertically below 768px
      - Each column occupies full container width when stacked
    - _Requirements: 5.3_

  - [x] 6.3 Fix DoctorHeader responsive behavior
    - In `src/features/doctor/components/header.tsx`:
      - Hide `Separator` elements below 640px using `hidden sm:block`
      - Add `min-w-[44px] min-h-[44px]` to action buttons for touch targets below 640px
      - Maintain minimum gap of 4px between button groups on small viewports
    - _Requirements: 5.4, 5.6_

- [x] 7. Fix responsive layout — Patient Dashboard
  - [x] 7.1 Replace excessive padding with max-width constraint
    - In `src/app/patient/layout.tsx`:
      - Replace `lg:px-64` with `max-w-lg mx-auto` (or equivalent constraint) for the content container
    - _Requirements: 6.1_

  - [x] 7.2 Add safe-area bottom padding to NavBar
    - In `src/features/patient/components/NavBar.tsx`:
      - Replace fixed `pb-2` with `pb-[max(0.5rem,env(safe-area-inset-bottom))]` or Tailwind `pb-safe` utility
    - _Requirements: 6.2_

  - [x] 7.3 Hide disabled service cards on desktop and add breadcrumb
    - In `src/features/patient/components/homepage/ServicesGrid.tsx`:
      - Add `lg:hidden` to disabled "coming soon" service cards so they hide above 1024px
    - In `src/app/patient/layout.tsx` or page sub-layouts:
      - Add a visible navigation breadcrumb or back-link for sub-pages on viewports > 1024px
    - _Requirements: 6.3, 6.4_

- [x] 8. Improve accessibility compliance
  - [x] 8.1 Ensure touch targets and disabled state accessibility
    - In both dashboards — all interactive elements below 768px:
      - Apply `min-w-[44px] min-h-[44px]` to buttons, links, and toggles that don't already meet the target
    - In `src/features/patient/components/homepage/ServicesGrid.tsx`:
      - Verify disabled cards have 3:1 contrast for icon and label at 75% opacity; adjust opacity if needed
      - Ensure visible "Coming soon" text indicator is present alongside `aria-disabled="true"`
    - _Requirements: 7.1, 7.2_

  - [x] 8.2 Add aria-label to notification bell and fix heading hierarchy
    - In `src/features/patient/components/Header.tsx`:
      - Add `aria-label="Notifications, 1 unread"` (or dynamic count) to the bell button
    - In `src/features/patient/components/homepage/ServicesGrid.tsx` and `PatientHomeView.tsx`:
      - Replace any `<h1>` with `<h2>` for section headings (page title is the only h1)
    - In `src/features/doctor/components/homepage/DoctorDashboardBoard.tsx`:
      - Replace plain styled `div` column headers with `<h3>` or add `role="heading" aria-level="3"`
    - Verify no skipped heading levels across both dashboards
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 9. Establish consistent typography hierarchy
  - [x] 9.1 Apply typography scale to Patient Dashboard
    - In `src/features/patient/components/homepage/PatientHomeView.tsx`:
      - Change "Your consultations" heading from `text-2xl font-bold` to `text-lg font-semibold`
    - In `src/features/patient/components/homepage/ServicesGrid.tsx`:
      - Change "Services" heading from `text-2xl font-bold` to `text-lg font-semibold`
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 9.2 Apply typography scale to Doctor Dashboard
    - In `src/features/doctor/components/homepage/DoctorDashboardBoard.tsx`:
      - Change Board_Column header text from `text-xl font-bold` to `text-lg font-semibold`
    - _Requirements: 8.1, 8.3_

- [x] 10. Add loading skeleton for DoctorDashboardBoard
  - [x] 10.1 Add skeleton card placeholders to Board columns
    - In `src/features/doctor/components/homepage/DoctorDashboardBoard.tsx` or `DoctorDashboardSkeleton.tsx`:
      - While kanban data is loading, display skeleton card placeholders within each column
      - Match skeleton dimensions to actual card content to prevent layout shift (CLS < 0.05)
    - Verify `PatientHeader` skeleton is already present (confirmed in requirements)
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Checkpoint — Responsive, accessibility, typography, loading states
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Fix naming mismatch and extract shared utility
  - [x] 12.1 Create deriveDisplayName shared utility
    - In `src/lib/utils.ts`:
      - Add exported `deriveDisplayName(email: string): string` that delegates to the same logic as `deriveDoctorName`
    - In `src/features/booking/lib/api/doctors.ts`:
      - Keep `deriveDoctorName` exported unchanged for doctor-context consumers
    - _Requirements: 10.1, 10.3, 10.4_

  - [x] 12.2 Update patient-context call sites
    - In `src/features/patient/components/Header.tsx` (and any other patient-context files):
      - Replace `deriveDoctorName` import/usage with `deriveDisplayName` from `@/lib/utils`
    - _Requirements: 10.2_

  - [x]* 12.3 Write property test for deriveDisplayName equivalence
    - **Property 1: Display name derivation equivalence**
    - **Validates: Requirements 10.1, 10.3**
    - Create `src/lib/deriveDisplayName.property.test.ts`:
      - Use `fast-check` with `fc.emailAddress()` arbitrary
      - Assert `deriveDisplayName(email) === deriveDoctorName(email)` for 100 runs
    - _Requirements: 10.1, 10.3_

- [x] 13. Final build verification and wiring
  - [x] 13.1 Run full build, lint, and test suite
    - In `frontend/bayan-health-mvp/`:
      - Run `npm run build` — zero TypeScript errors
      - Run `npm run lint` — zero ESLint errors
      - Run `npx vitest --run` — all tests pass including new property and scan tests
    - _Requirements: 4.5, 1.4, 1.5, 2.5, 2.6_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (only Property 1: display name equivalence)
- Static scan and contrast audit tests validate token migration regression-free
- All changes are frontend-only — no backend, API, or infrastructure modifications

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "4.1"] },
    { "id": 1, "tasks": ["1.3", "2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["1.4", "1.5", "2.3", "2.4", "4.2"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "7.1", "7.2"] },
    { "id": 4, "tasks": ["7.3", "8.1", "8.2"] },
    { "id": 5, "tasks": ["9.1", "9.2", "10.1"] },
    { "id": 6, "tasks": ["12.1"] },
    { "id": 7, "tasks": ["12.2", "12.3"] },
    { "id": 8, "tasks": ["13.1"] }
  ]
}
```
