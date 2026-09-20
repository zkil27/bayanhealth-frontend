# Implementation Plan: Landing Page Redesign

## Overview

Redesign the BayanHealth landing page (`/`) from the current minimal two-section layout (Hero + Feature Cards) into a full six-section marketing page: Header, Hero, Features, How It Works, Trust & Security, and Footer. All components live under `src/components/blocks/landing/`, use semantic color tokens exclusively, and render without backend dependencies for unauthenticated visitors.

## Tasks

- [x] 1. Set up landing component directory and static content
  - [x] 1.1 Create the `src/components/blocks/landing/` directory and `content.ts` constants file
    - Define `FeatureItem`, `StepItem`, and `TrustItem` TypeScript interfaces
    - Export `FEATURES` (4 items with Lucide icons), `STEPS` (4 items), and `TRUST_INDICATORS` (3 items) arrays with copy from the design document
    - Export `HERO_CONTENT` object with headline, subheadline strings
    - Export `FOOTER_CONTENT` object with tagline string (≤120 chars)
    - _Requirements: 3.2, 3.3, 4.2, 4.3, 5.2, 5.3, 6.4, 9.1, 9.2_

  - [x] 1.2 Create the `src/components/blocks/landing/index.ts` barrel export file
    - Re-export all section components for clean imports from page.tsx
    - _Requirements: N/A (project structure)_

- [x] 2. Implement LandingHeader component
  - [x] 2.1 Create `src/components/blocks/landing/LandingHeader.tsx`
    - Accept `isAuthenticated: boolean` prop
    - Fixed position with `z-50`, `backdrop-blur-sm`, bottom border using `border-border` token
    - Mobile: render `AppLogo` icon-only variant; hide nav links
    - Desktop (≥1024px / `lg:`): render `AppLogo` withText variant, show "Features" and "How It Works" anchor links (`href="#features"`, `href="#how-it-works"`) that smooth-scroll
    - Right side: conditionally render "Sign In" link (visible when `isAuthenticated=false`), always render `ModeToggle`
    - Use semantic HTML `<header>` and `<nav>` elements
    - All colors via CSS custom property tokens only (no hex literals)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.1, 10.1_

  - [x]* 2.2 Write unit tests for LandingHeader
    - Verify icon-only logo renders on mobile viewport
    - Verify nav links ("Features", "How It Works") render at lg breakpoint
    - Verify "Sign In" link visible when `isAuthenticated=false`, hidden when `true`
    - Verify `ModeToggle` always renders
    - Verify semantic `<header>` and `<nav>` elements present
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 10.1_

- [x] 3. Implement HeroSection component
  - [x] 3.1 Create `src/components/blocks/landing/HeroSection.tsx`
    - Accept props: `variant` (`"authenticated" | "unauthenticated"`), `displayName?`, `roleLabel?`, `dashboardHref?`
    - Centered flexbox column layout with vertical spacing ≥`2rem` between logo/headline/subheadline/CTAs
    - Background gradient using `primary/10` and `secondary/10` (≤20% opacity via Tailwind opacity modifiers)
    - Render `AppLogo` withText at 180px (mobile) / 220px (desktop) width
    - `h1` headline at `text-4xl` (mobile) / `text-5xl` (desktop), `font-bold`
    - Subheadline in `text-muted-foreground` with `max-w-[36rem]`
    - Unauthenticated variant: "Create an account" primary button (links to `/signUp`) + outlined "Sign in" button (links to `/signIn`)
    - Authenticated variant: display name, role badge, single dashboard CTA button linking to `dashboardHref`
    - Use `<section>` semantic element
    - All colors via CSS custom property tokens only
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 10.1, 10.2_

  - [x]* 3.2 Write unit tests for HeroSection
    - Verify unauthenticated variant renders "Create an account" and "Sign in" CTAs, no dashboard link
    - Verify authenticated variant renders display name, role label, dashboard CTA, no sign-up/sign-in buttons
    - Verify `h1` heading exists with correct text
    - Verify logo renders with appropriate width
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 10.4_

- [x] 4. Implement FeaturesSection component
  - [x] 4.1 Create `src/components/blocks/landing/FeaturesSection.tsx`
    - Accept `features: FeatureItem[]` prop
    - Render `id="features"` on the section element for anchor navigation
    - Section heading "What we offer" with `text-2xl font-bold`
    - Responsive grid: 1 col (mobile) → 2 col (`sm:`) → 4 col (`lg:`)
    - Each card uses shadcn `Card`/`CardContent` with `h-full` for equal height
    - Icon container: rounded (`rounded-lg`), `bg-primary/10`, minimum 24×24px icon
    - Card title bold, description in `text-muted-foreground`
    - Max width `max-w-[72rem]`, centered, `px-4` mobile / `px-8` tablet+
    - Consistent gap spacing (minimum `gap-4`)
    - All colors via CSS custom property tokens only
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 10.1_

  - [x]* 4.2 Write unit tests for FeaturesSection
    - Verify exactly 4 feature cards render
    - Verify section has `id="features"` attribute
    - Verify section heading renders with correct text
    - Verify each card has an icon, title, and description
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Implement HowItWorksSection component
  - [x] 5.1 Create `src/components/blocks/landing/HowItWorksSection.tsx`
    - Accept `steps: StepItem[]` prop
    - Render `id="how-it-works"` on the section element for anchor navigation
    - Section heading "How it works" with `text-2xl font-bold`
    - Step indicator: numbered circle with `bg-primary text-primary-foreground`
    - Step title (max 30 chars) and description (max 120 chars)
    - Visual connector (dashed border/line) between steps to convey progression
    - Responsive layout: vertical stack (mobile) → 2-col grid (`sm:`) → horizontal row (`lg:`)
    - Max width `max-w-[72rem]`, centered
    - All colors via CSS custom property tokens only
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 8.1, 10.1_

  - [x]* 5.2 Write unit tests for HowItWorksSection
    - Verify section has `id="how-it-works"` attribute
    - Verify all steps render with number, title, and description
    - Verify section heading renders correctly
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Checkpoint - Verify core sections build and render
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement TrustSection component
  - [x] 7.1 Create `src/components/blocks/landing/TrustSection.tsx`
    - Accept `indicators: TrustItem[]` prop
    - Section heading communicating security/privacy with `text-2xl font-bold`
    - Background uses `bg-secondary` or dark blue accent via CSS custom property token to visually differentiate
    - Each trust indicator: icon + descriptive label (≤80 chars)
    - Responsive layout: vertical stack (mobile) → horizontal row/grid (`lg:`) with consistent gap (`gap-4` minimum)
    - Max width `max-w-[72rem]`, centered
    - All colors via CSS custom property tokens only
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.1, 10.1_

  - [x]* 7.2 Write unit tests for TrustSection
    - Verify all trust indicators render with icon and label
    - Verify section heading renders correctly
    - Verify background uses semantic token class (no hex literals)
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Implement FooterSection component
  - [x] 8.1 Create `src/components/blocks/landing/FooterSection.tsx`
    - No props (all content from static constants)
    - Semantic `<footer>` element
    - Background: `bg-muted` token
    - Logo: icon variant at minimum 32px height
    - Social links (Messenger, Viber, WhatsApp) with `target="_blank"`, `rel="noopener noreferrer"`, and `aria-label` per link
    - Dynamic copyright year via `new Date().getFullYear()` with "BayanHealth" name
    - Tagline ≤120 characters in `text-muted-foreground`
    - Mobile: vertically stacked, center-aligned
    - Desktop: 3-column layout (branding/tagline | social links | copyright)
    - All colors via CSS custom property tokens only
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 10.1, 10.5_

  - [x]* 8.2 Write unit tests for FooterSection
    - Verify social links have `target="_blank"` and `rel="noopener noreferrer"`
    - Verify social links have `aria-label` attributes
    - Verify copyright includes current year and "BayanHealth"
    - Verify semantic `<footer>` element present
    - Verify logo renders at minimum 32px height
    - _Requirements: 6.1, 6.2, 6.3, 10.1, 10.5_

- [x] 9. Wire components into page.tsx and finalize page layout
  - [x] 9.1 Refactor `src/app/page.tsx` to use new landing section components
    - Replace current inline Hero and Feature Cards sections with new components
    - Import all section components from `@/components/blocks/landing`
    - Keep the `"use client"` directive and existing `useAuthStore` hydration logic
    - Derive `variant`, `displayName`, `roleLabel`, `dashboardHref` from auth store (per design)
    - Pass `isAuthenticated` to `LandingHeader`
    - Pass auth-derived props to `HeroSection`
    - Pass `FEATURES` to `FeaturesSection`, `STEPS` to `HowItWorksSection`, `TRUST_INDICATORS` to `TrustSection`
    - Render sections inside `<main>` in order: Hero → Features → How It Works → Trust
    - Render `FooterSection` outside `<main>` as a sibling
    - Apply vertical section spacing of at least `4rem` between sections (`py-16` or equivalent)
    - Apply responsive horizontal padding: `px-4` mobile, `px-8` tablet+
    - Ensure `scroll-behavior: smooth` is set on the document (in global CSS or `<html>`)
    - Ensure `lang` attribute on `<html>` element (in layout.tsx if not already present)
    - _Requirements: 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 10.1, 10.8_

  - [x] 9.2 Verify heading hierarchy and accessibility structure
    - Ensure single `h1` in HeroSection
    - Ensure sequential `h2` headings for each section (Features, How It Works, Trust)
    - No skipped heading levels
    - Verify all interactive elements (buttons, links) have minimum 44×44px touch targets on mobile
    - Verify visible focus indicators on all interactive elements
    - Verify all keyboard navigation works (Tab, Shift+Tab, Enter)
    - _Requirements: 7.6, 7.7, 10.3, 10.4, 10.6, 10.7_

  - [x] 9.3 Verify responsive typography scales
    - Ensure `Inter` font family applied with `system-ui, sans-serif` fallback
    - Mobile: h1 `text-3xl`, h2 `text-2xl`, h3 `text-xl`; Desktop: h1 `text-4xl`, h2 `text-3xl`, h3 `text-2xl`
    - Body text minimum `1rem` (16px)
    - _Requirements: 7.1, 7.5, 7.6, 7.7_

- [x] 10. Checkpoint - Full page integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Accessibility and dark mode compliance tests
  - [x]* 11.1 Write accessibility integration test using axe-core
    - Create `src/components/blocks/landing/__tests__/accessibility.test.tsx`
    - Render full landing page in both light and dark modes
    - Run axe-core audit and assert zero violations
    - Verify heading hierarchy (single h1, sequential h2/h3)
    - _Requirements: 10.1, 10.2, 10.4, 10.6, 8.2_

  - [x]* 11.2 Write hardcoded color scan test for landing components
    - Create `src/components/blocks/landing/__tests__/no-hardcoded-colors.test.ts`
    - Scan all `.tsx` files in `src/components/blocks/landing/` for hex (`#rrggbb`), `rgb()`, `hsl()` color literals
    - Assert zero occurrences — all colors must use CSS custom property tokens
    - _Requirements: 8.1_

  - [x]* 11.3 Write dark mode rendering test
    - Verify all sections render correctly with `.dark` class applied
    - Verify theme transition occurs without full page reload
    - Verify no flash of wrong theme on initial load (prefers-color-scheme respected)
    - _Requirements: 8.3, 8.4, 8.5_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests — this is a UI layout feature (design confirms PBT not applicable)
- Unit tests use Vitest + React Testing Library (already configured)
- Accessibility tests use axe-core (install `jest-axe` or `@axe-core/react` as needed)
- The existing `AppLogo`, `ModeToggle`, `Card`/`CardContent`, and `Button` primitives are reused — no new UI primitives needed
- All content is static and bundled at build time — zero backend API calls for unauthenticated visitors
- The existing `AppHeader` in `src/components/blocks/header/header.tsx` is superseded by `LandingHeader` for the landing page only; other pages continue using `AppHeader`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2", "5.2", "7.1", "8.1"] },
    { "id": 3, "tasks": ["7.2", "8.2", "9.1"] },
    { "id": 4, "tasks": ["9.2", "9.3"] },
    { "id": 5, "tasks": ["11.1", "11.2", "11.3"] }
  ]
}
```
