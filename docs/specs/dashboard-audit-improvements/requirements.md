# Requirements Document

## Introduction

Frontend audit and improvement of the Doctor Dashboard (`/doctor`) and Patient Dashboard (`/patient`) pages in the BayanHealth MVP application. This spec addresses outdated components, hardcoded color values violating the semantic token system, UI inconsistencies between dashboards, responsiveness issues on various viewport sizes, accessibility gaps, and dark mode compatibility. All changes are frontend-only and must preserve existing functionality, component architecture, and navigation patterns.

## Glossary

- **Doctor_Dashboard**: The doctor-facing homepage at route `/doctor`, composed of `DoctorSidebar`, `DoctorHeader`, `SidebarTeleconsultStatus`, `DoctorDashboardMetrics`, and `DoctorDashboardBoard` (3-column kanban)
- **Patient_Dashboard**: The patient-facing homepage at route `/patient`, composed of `PatientHeader`, `IconGrid` (services), `PatientHomeView` (consultations list), and `NavBar` (bottom/side navigation)
- **Semantic_Token**: A CSS custom property defined in `globals.css` (e.g., `--primary`, `--secondary`, `--muted`, `--background`) that automatically adapts between light and dark themes
- **Hardcoded_Color**: A color value written directly in component markup (e.g., `bg-purple-600`, `fill="#09a68d"`, `text-white/80`, `rgba(...)`) that does not adapt to theme changes
- **Board_Column**: One of the three kanban columns in `DoctorDashboardBoard` (booking requests, pending intakes, ready intakes)
- **Touch_Target**: The interactive hit area of a clickable or tappable element, measured in CSS pixels
- **Safe_Area**: The device-inset region on mobile devices (notch, home indicator) that content should not overlap
- **Dead_Code**: Commented-out or unreachable code blocks that serve no runtime purpose
- **Card_Styling**: The border, shadow, and spacing treatment applied to Card components across dashboards
- **Audit_System**: The combined set of components under review in both Doctor_Dashboard and Patient_Dashboard

## Requirements

### Requirement 1: Replace Hardcoded Colors with Semantic Tokens on Doctor Dashboard

**User Story:** As a developer, I want all Doctor_Dashboard components to use semantic color tokens, so that the dashboard renders correctly in both light and dark modes without manual color overrides.

#### Acceptance Criteria

1. WHEN the Doctor_Dashboard renders the `BadgeCheck` icon in `DoctorDashboardBoard`, THE Audit_System SHALL verify that the icon uses the `primary` semantic token via the Tailwind utility class `fill-primary` on the SVG element instead of the inline prop `fill="#09a68d"`
2. WHEN the Doctor_Dashboard renders the `DoctorSidebar` border, THE Audit_System SHALL verify that the sidebar uses the `sidebar-border` semantic token (via the class `border-sidebar-border`) instead of the hardcoded `border-gray-900/20` class
3. WHEN the Doctor_Dashboard renders the "pending intakes" Board_Column header in `DoctorDashboardBoard`, THE Audit_System SHALL verify that the header uses an existing semantic token from the set (`bg-accent`, `bg-chart-1`, `bg-chart-2`, `bg-chart-3`, `bg-chart-4`, or `bg-chart-5`) instead of the hardcoded `bg-purple-600` class, and that the chosen token is defined in both the `:root` and `.dark` theme blocks in the global stylesheet; IF a token from the allowed set is only defined in one theme context, THEN THE Audit_System SHALL reject that token and require choosing a different one from the allowed set that has both theme definitions
4. THE Audit_System SHALL verify that each replaced semantic token produces a minimum WCAG 2.1 contrast ratio of 4.5:1 for text content and 3:1 for non-text UI components against their computed background color, measured using the CSS `oklch` resolved values in both the `:root` (light) and `.dark` theme contexts
5. IF a semantic token replacement results in a computed contrast ratio below the thresholds defined in criterion 4, THEN THE Audit_System SHALL flag the token pair as non-compliant and report the measured ratio, the required minimum, and the affected theme context (light or dark)

### Requirement 2: Replace Hardcoded Colors with Semantic Tokens on Patient Dashboard

**User Story:** As a developer, I want all Patient_Dashboard components to use semantic color tokens, so that the patient experience adapts seamlessly to dark mode.

#### Acceptance Criteria

1. WHEN the Patient_Dashboard renders the `PatientHeader`, THE Audit_System SHALL verify that no hardcoded color utilities (`text-white`, `text-white/*`, `bg-black`, `bg-black/*`) remain, and that all text colors use `text-primary-foreground` (with opacity modifiers where reduced emphasis is needed) and all translucent background overlays use `bg-primary-foreground/10` or `bg-primary-foreground/20`
2. WHEN the Patient_Dashboard renders the notification badge dot in `PatientHeader`, THE Audit_System SHALL verify the badge uses the `bg-destructive` semantic token instead of `bg-red-500`
3. WHEN the Patient_Dashboard renders the `PatientHeaderBooking` urgent button, THE Audit_System SHALL verify the button uses `bg-destructive` for background and `text-destructive-foreground` for text instead of `bg-red-500` and `text-red-100`
4. WHEN the Patient_Dashboard renders the NavBar "Book" button shadow, THE Audit_System SHALL verify the shadow uses a CSS custom property referencing the `--primary` token (e.g., `shadow-[0_3px_6px_hsl(var(--primary)/0.5)]`) instead of the hardcoded `rgba(24,165,140,0.50)` value
5. THE Audit_System SHALL verify that the `PatientHeader` gradient (`from-primary to-secondary`) maintains a minimum WCAG AA contrast ratio of 4.5:1 for normal text and 3:1 for large text against `primary-foreground` in both light and dark modes
6. WHEN the hardcoded-color static scan test runs against the `PatientHeader` and `NavBar` source files, THE Audit_System SHALL report zero hardcoded color offenses; IF the static scan fails to execute, THEN the audit SHALL be allowed to pass; IF the scan finds one or more offenses, THEN THE Audit_System SHALL report the violations without failing the build

### Requirement 3: Standardize Card Styling Across Dashboards

**User Story:** As a user, I want dashboard cards to have consistent visual treatment, so that the interface feels cohesive and polished.

#### Acceptance Criteria

1. THE Audit_System SHALL define a single card styling pattern for dashboard metric and status cards that specifies: a left-border accent of `border-l-3` using the contextual theme color (e.g., `border-primary` for metrics, `border-secondary` for status), a shadow no heavier than `shadow-md`, and consistent internal padding of `p-4` on CardHeader and CardContent sections
2. WHEN the Doctor_Dashboard renders `SidebarTeleconsultStatus`, THE Audit_System SHALL apply the standardized card styling by replacing the current `shadow-xl` with `shadow-md` while retaining the `border-l-3 border-secondary` left-accent pattern
3. WHEN the Doctor_Dashboard renders `DoctorDashboardMetrics` cards, THE Audit_System SHALL apply the standardized card styling by replacing the current `shadow-xl` with `shadow-md` while retaining the `border-l-3 border-primary` left-accent pattern
4. THE Audit_System SHALL use shadow values no heavier than `shadow-md` for all dashboard cards; all chosen shadow values SHALL be allowed to be lighter than `shadow-md` as long as they render a visible but non-clipped shadow in both light mode and dark mode
5. WHEN the Patient_Dashboard renders `IconGrid` service cards, THE Audit_System SHALL replace the current `shadow-2xl` with a shadow no heavier than `shadow-lg`
6. WHEN the Doctor_Dashboard renders skeleton/loading-state cards (e.g., `StatisticsCardSkeleton`), THE Audit_System SHALL apply the same border and shadow values as the standardized card styling pattern defined in criterion 1

### Requirement 4: Remove Dead Code from Doctor Dashboard Components

**User Story:** As a developer, I want dead code removed from dashboard components, so that the codebase remains maintainable and readable.

#### Acceptance Criteria

1. WHEN the Doctor_Dashboard source is audited, THE Audit_System SHALL remove all commented-out code blocks in `SidebarTeleconsultStatus` that exceed 5 consecutive lines (the entire collapsed-sidebar popover block and the alternative card layout block)
2. WHEN the Doctor_Dashboard source is audited, THE Audit_System SHALL remove all commented-out code fragments in `SidebarTeleconsultStatus` of 5 or fewer consecutive lines (including inline single-line comments containing disabled code such as unused state references and className expressions)
3. WHEN the Doctor_Dashboard source is audited, THE Audit_System SHALL remove the commented-out `channelLogo` badge in `DoctorDashboardBoard`
4. WHEN dead code is removed from a component file, THE Audit_System SHALL remove any import statements that become unused as a result of the dead code removal
5. WHEN dead code removal is complete, THE Audit_System SHALL verify that the project build (type-check and lint) passes with zero errors and that all existing automated tests pass without modification; this verification step SHALL be allowed to pass independently of whether the dead code removal itself has fully completed; IF automated tests fail after dead code removal, THEN the removal SHALL be considered complete, allowing manual test fixes afterward

### Requirement 5: Fix Responsive Layout Issues on Doctor Dashboard

**User Story:** As a doctor using different screen sizes, I want the dashboard to adapt properly to my viewport, so that content is always readable and accessible.

#### Acceptance Criteria

1. WHEN the viewport height is less than 700px, THE Doctor_Dashboard Board_Column `ScrollArea` SHALL calculate its maximum height by subtracting the combined height of the header (56px) and metrics section from the viewport height, replacing the fixed `h-[45vh]` value, so that the scroll container fills available vertical space without causing page-level overflow; the calculation SHALL allow the resulting height to reach zero on very small screens without enforcing a minimum scroll area height
2. WHILE the viewport height is 700px or greater, THE Doctor_Dashboard Board_Column `ScrollArea` SHALL retain the `h-[45vh]` height value
3. WHEN the viewport width is below 768px, THE Doctor_Dashboard Board columns SHALL stack vertically in a single-column layout instead of the side-by-side row layout, with each column occupying the full container width
4. WHEN the viewport width is below 640px, THE `DoctorHeader` SHALL hide the vertical `Separator` elements between action buttons and maintain a minimum gap of 4px between button groups
5. THE Doctor_Dashboard layout SHALL ensure every Board_Column `ScrollArea` provides a vertical scrollbar when its content exceeds the visible height, with no content clipped or hidden without a scroll affordance, on viewports from 320px to 2560px wide and from 320px to 2560px tall
6. IF the viewport width is below 640px, THEN THE `DoctorHeader` action buttons SHALL each have a minimum touch target size of 44×44 CSS pixels

### Requirement 6: Fix Responsive Layout Issues on Patient Dashboard

**User Story:** As a patient using a mobile device or large monitor, I want the dashboard to look correct on my screen, so that I can navigate without issues.

#### Acceptance Criteria

1. WHEN the viewport width exceeds 1280px, THE Patient_Dashboard layout SHALL use a `max-w-lg` or equivalent constraint instead of `lg:px-64`, so that content does not stretch excessively on ultra-wide displays
2. WHEN the Patient_Dashboard renders on an iOS device with a home indicator, THE NavBar SHALL apply bottom safe-area padding using `env(safe-area-inset-bottom)` or equivalent (e.g., `pb-safe`) instead of the fixed `pb-2`
3. WHEN the viewport width exceeds 1024px (desktop breakpoint), THE Patient_Dashboard SHALL hide disabled "coming soon" service cards in the `IconGrid` to avoid wasting visual space on non-functional items; the cards SHALL be hidden only when the viewport width is strictly greater than 1024px (at exactly 1024px the cards remain visible)
4. WHEN the viewport width exceeds 1024px, THE Patient_Dashboard SHALL provide a visible navigation breadcrumb or back-link in the content area for every sub-page (including but not limited to appointment details, medical records, and all other navigable sub-pages)

### Requirement 7: Improve Accessibility Compliance

**User Story:** As a user with assistive technology or motor impairments, I want dashboard interactive elements to be accessible, so that I can use the application effectively.

#### Acceptance Criteria

1. THE Audit_System SHALL ensure all interactive elements (buttons, links, toggles) on both dashboards have a minimum touch target size of 44×44 CSS pixels on viewports below 768px
2. WHEN the Patient_Dashboard renders disabled service cards in `IconGrid` at 75% opacity, THE Audit_System SHALL ensure the disabled state has a minimum contrast ratio of 3:1 for the icon and label text against the card background, and SHALL include an `aria-disabled="true"` attribute (already present) plus a visible text indicator (e.g., "Coming soon" label)
3. WHEN the Patient_Dashboard renders the `PatientHeader` notification bell, THE Audit_System SHALL add an `aria-label` attribute (e.g., "Notifications, 1 unread") to the button element
4. THE Audit_System SHALL ensure both dashboards maintain a correct heading hierarchy with no skipped heading levels (h1 → h2 → h3) throughout the page content
5. WHEN the Doctor_Dashboard renders Board_Column headers, THE Audit_System SHALL use a semantic heading element (h2 or h3) or equivalent ARIA role instead of a plain styled `div`

### Requirement 8: Establish Consistent Typography Hierarchy

**User Story:** As a user, I want clear and consistent text sizing across dashboards, so that I can quickly scan and understand the information presented.

#### Acceptance Criteria

1. THE Audit_System SHALL define a typography scale for dashboard content: page titles at `text-2xl font-bold`, section headings at `text-lg font-semibold`, card titles at `text-base font-semibold`, and body/meta text at `text-sm`
2. WHEN the Patient_Dashboard renders the "Your consultations" heading, THE Audit_System SHALL apply the section heading style (`text-lg font-semibold`) instead of the current `text-2xl font-bold` to maintain proper hierarchy below the page title
3. WHEN the Doctor_Dashboard renders the Board_Column header text, THE Audit_System SHALL apply the section heading style consistently with `text-lg font-semibold` instead of the current `text-xl font-bold`
4. WHEN the Patient_Dashboard renders the "Services" heading in `IconGrid`, THE Audit_System SHALL apply the section heading style (`text-lg font-semibold`) instead of the current `text-2xl font-bold`

### Requirement 9: Add Loading States and Skeleton Screens

**User Story:** As a user, I want visual feedback while dashboard data loads, so that I know the application is working and not frozen.

#### Acceptance Criteria

1. WHILE the `PatientHeader` "Last Consultation" data is loading, THE Patient_Dashboard SHALL display a skeleton placeholder (already implemented via `Skeleton` component — verified present)
2. WHILE the `DoctorDashboardBoard` kanban data is loading, THE Doctor_Dashboard SHALL display skeleton card placeholders within each Board_Column instead of showing empty columns
3. THE Audit_System SHALL ensure all loading skeletons match the dimensions of the content they replace to prevent layout shift (Cumulative Layout Shift contribution less than 0.05 per skeleton)

### Requirement 10: Fix Naming Mismatch in Patient Display Name

**User Story:** As a developer, I want utility functions to have clear and accurate names, so that the codebase is understandable without additional context.

#### Acceptance Criteria

1. WHEN the Patient_Dashboard derives a display name from the user email, THE Audit_System SHALL use a utility function with a role-neutral name (e.g., `deriveDisplayName`) instead of reusing `deriveDoctorName` in a patient context
2. THE Audit_System SHALL update all patient-context call sites to use the new role-neutral function name
3. THE Audit_System SHALL preserve the existing `deriveDoctorName` function for doctor-context usages to avoid breaking changes in doctor components
4. IF the implementation extracts a shared function, THEN THE Audit_System SHALL export the shared function from a common utilities module accessible to both patient and doctor features; IF the extraction succeeds but the export step fails, THEN the extracted shared function SHALL remain in place without rollback, even if it is temporarily inaccessible from some modules

