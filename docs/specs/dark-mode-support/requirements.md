# Requirements Document

## Introduction

The BayanHealth frontend (Next.js App Router at `frontend/bayan-health-mvp`) currently ships a half-finished theming setup. The app is wired with `next-themes` (`defaultTheme="system"`, `enableSystem`, `attribute="class"`), so on a machine set to dark mode the app renders its dark theme. However, dark mode is broken in practice:

- The `ModeToggle` control exists but is not mounted anywhere, so users cannot change the theme inside the app.
- Semantic theme tokens are defined in `globals.css` for both light (`:root`) and dark (`.dark`), but most components bypass them and hardcode light-only utilities (`text-gray-900`, `bg-white`, `text-[#...]`, etc.). Of 246 `.tsx` files, 77 use hardcoded light-only colors and only 31 use any `dark:` variant. This produces dark-on-dark text and bright white panels clashing with the dark shell.
- The dark palette contains an inverted token: in `.dark`, `--secondary` is a light gray, so `bg-secondary` / `text-secondary` surfaces look inverted.

This feature delivers proper, durable dual-theme support: every surface renders legibly in both light and dark, components consume semantic tokens instead of hardcoded colors, the dark palette is corrected, and an in-app theme control lets users choose Light, Dark, or System with persistence and no flash of incorrect theme. This replaces the interim "force light" workaround with real dual-theme theming. Scope is presentation only — no backend, API, routing/guard, or business-logic changes — and the existing test/build toolchain must remain green.

## Glossary

- **Frontend Application**: The Next.js App Router project located at `frontend/bayan-health-mvp`, including all routes, components, and shared UI primitives.
- **Theme**: A named visual appearance mode the Frontend Application can render in. Valid values are `light` and `dark` as resolved appearances, and `system` as a selectable preference that resolves to one of them.
- **System Theme**: The operating-system or browser color-scheme preference (`prefers-color-scheme`) that the Frontend Application resolves to when the active Theme Preference is `system`.
- **Theme Preference**: The user-selected setting persisted by `next-themes`. One of `light`, `dark`, or `system`.
- **Resolved Theme**: The concrete appearance (`light` or `dark`) actually applied to the DOM after resolving the Theme Preference (including resolution of `system` against the System Theme).
- **Semantic Token**: A CSS custom property pair exposed as a Tailwind color in `globals.css` (e.g., `background`/`foreground`, `card`/`card-foreground`, `muted`/`muted-foreground`, `secondary`/`secondary-foreground`, `border`, `primary`/`primary-foreground`) whose value changes between `:root` and `.dark`.
- **Hardcoded Color**: Any color utility or value that does not resolve through a Semantic Token, including Tailwind palette utilities (e.g., `text-gray-900`, `bg-white`, `bg-gray-300`), literal hex/oklch arbitrary values (e.g., `text-[#111]`, `bg-[#f0f0ec]`), and `text-black`.
- **Theme Control**: The in-app UI element (the `ModeToggle` component or an equivalent) that lets a user select a Theme Preference of Light, Dark, or System.
- **Application Shell**: A shared layout surface (e.g., a header, navigation bar, or root layout) rendered across the Frontend Application from which the Theme Control is reachable.
- **Contrast Standard**: WCAG 2.1 AA contrast ratios — at least 4.5:1 for normal-size text, at least 3:1 for large-scale text (≥ 18.66px bold or ≥ 24px) and for graphical objects and active user-interface components.
- **Role Area**: A functional section of the Frontend Application scoped to a user context or flow: patient, doctor, admin, booking, consultation, intake, auth, and landing.
- **Shared Primitive**: A reusable UI component used across Role Areas, including cards, badges, inputs, tables, dialogs, drawers, empty states, loading states, error states, and `sonner` toasts.
- **Flash of Incorrect Theme**: A visible render of the Frontend Application in a Theme that does not match the persisted Theme Preference or System Theme during initial page load before hydration.
- **Brand Color**: A fixed, theme-independent color used for brand identity (e.g., the BayanHealth primary teal) that is intentionally retained rather than mapped to a light/dark Semantic Token.

## Requirements

### Requirement 1: Legible rendering in both themes

**User Story:** As a user of any BayanHealth surface, I want every screen to be readable in both light and dark themes, so that I can use the application regardless of my theme choice or system setting.

#### Acceptance Criteria

1. WHERE a route or surface of the Frontend Application is rendered, THE Frontend Application SHALL display normal-size text against its immediate background at a contrast ratio of at least 4.5:1, and large-scale text (rendered at 24px or larger, or 18.66px or larger when bold) at a contrast ratio of at least 3:1.
2. WHERE rendered content is a disabled or inactive user-interface control, pure decoration, or a logotype or brand name, THE Frontend Application SHALL be exempt from the contrast ratios defined in criteria 1 and 6.
3. WHILE the Resolved Theme is `dark`, THE Frontend Application SHALL render each text element against its immediate background at a contrast ratio of at least 4.5:1 for normal-size text and at least 3:1 for large-scale text (24px or larger, or 18.66px or larger when bold).
4. WHILE the Resolved Theme is `light`, THE Frontend Application SHALL render each text element against its immediate background at a contrast ratio of at least 4.5:1 for normal-size text and at least 3:1 for large-scale text (24px or larger, or 18.66px or larger when bold).
5. WHILE the Resolved Theme is `dark`, THE Frontend Application SHALL render every panel, card, and container with a background color derived from a Semantic Token, such that each container's background contrasts with the surrounding `dark` surface and with its own contained text at the ratios defined in criterion 3.
6. WHERE a graphical control, active user-interface component, or keyboard focus indicator is rendered, THE Frontend Application SHALL present its boundary, focus, or state indication against adjacent colors at a contrast ratio of at least 3:1.
7. WHEN the Resolved Theme changes from one value to another, THE Frontend Application SHALL render all visible text and controls at the contrast ratios defined in criteria 1, 3, 4, and 6 without requiring a page reload.

### Requirement 2: Components consume semantic tokens

**User Story:** As a frontend developer, I want components to use semantic theme tokens instead of hardcoded colors, so that surfaces adapt correctly to both themes and remain maintainable.

#### Acceptance Criteria

1. WHERE a component applies a foreground or background color that is not a documented Brand Color, THE Frontend Application SHALL express that color through a Semantic Token rather than a Hardcoded Color.
2. THE Frontend Application SHALL render the previously identified heaviest-offender surfaces — the intake forms (CheckupSection, PersonDataSection, Teleconsult, AdditionalInfoSection, ServiceRequestSection), BookingDoctorDetails, DoctorList, the patient Header and NavBar, the advertisement carousel, and the doctor dashboard — using Semantic Tokens for theme-dependent colors.
3. WHERE a fixed color is retained intentionally as a Brand Color, THE Frontend Application SHALL keep that color legible against its background in both the `light` and `dark` Resolved Themes at the Contrast Standard.
4. WHERE a Brand Color is retained, THE design documentation SHALL record the exact color value and the reason it is exempt from Semantic Token mapping, such that each retained Brand Color is identifiable on inspection.
5. THE Frontend Application SHALL contain no Hardcoded Color used for a theme-dependent foreground or background across the criterion-2 heaviest-offender surfaces, every Role Area, and every Shared Primitive, except where the color is a Brand Color documented under criterion 4.

### Requirement 3: Corrected dark palette

**User Story:** As a user in dark mode, I want theme colors to look correct and consistent, so that badges, headings, and surfaces are not visually inverted.

#### Acceptance Criteria

1. THE Frontend Application SHALL define the `.dark` value of the `secondary` Semantic Token as a color whose perceived lightness is lower than that of its paired `secondary-foreground` token, and SHALL pair it with `secondary-foreground` at a contrast ratio meeting the Contrast Standard (a contrast ratio of at least 4.5:1 for normal text per WCAG 2.1 AA).
2. WHERE a Semantic Token is defined as a background-and-foreground pair (for example `card`/`card-foreground`, `muted`/`muted-foreground`, `secondary`/`secondary-foreground`, `popover`/`popover-foreground`, `primary`/`primary-foreground`), THE Frontend Application SHALL maintain a contrast ratio of at least 4.5:1 between the pair's background and foreground value in both the `light` and `dark` Resolved Themes.
3. WHEN a `secondary`-based surface is rendered while the Resolved Theme is `dark`, THE Frontend Application SHALL present the surface with a background whose perceived lightness is lower than its foreground text, with the two differing at a contrast ratio of at least 4.5:1.
4. IF any background-and-foreground Semantic Token pair resolves to a contrast ratio below 4.5:1 in either the `light` or `dark` Resolved Theme, THEN THE Frontend Application SHALL be treated as failing this requirement for that token pair and Resolved Theme.

### Requirement 4: In-app theme control

**User Story:** As a user, I want a theme control inside the app, so that I can choose Light, Dark, or System without changing my operating-system settings.

#### Acceptance Criteria

1. WHILE an authenticated route is rendered, THE Frontend Application SHALL render a visible, activatable Theme Control trigger within the Application Shell.
2. WHEN the Theme Control is activated, THE Frontend Application SHALL present exactly three selectable options mapping one-to-one to the `light` (Light), `dark` (Dark), and `system` (System) Theme Preferences.
3. WHEN a user selects a Theme Preference through the Theme Control, THE Frontend Application SHALL apply the corresponding Resolved Theme to the rendered appearance within 1 second and without requiring a page reload.
4. WHEN a user selects the `system` Theme Preference, THE Frontend Application SHALL apply a Resolved Theme of `dark` while the System Theme reports a dark `prefers-color-scheme` and a Resolved Theme of `light` otherwise.
5. WHILE the active Theme Preference is `system`, WHEN the System Theme changes, THE Frontend Application SHALL update the Resolved Theme to match the new System Theme within 1 second and without requiring user re-selection or a page reload.
6. THE Theme Control SHALL present its trigger and menu legibly in both the `light` and `dark` Resolved Themes at the Contrast Standard.

### Requirement 5: Theme persistence and no flash

**User Story:** As a returning user, I want my theme choice to stick across navigation and reloads without a flicker, so that the app feels stable and intentional.

#### Acceptance Criteria

1. WHEN a user selects a Theme Preference (one of `light`, `dark`, or `system`), THE Frontend Application SHALL persist that preference to browser local storage via `next-themes` before the next user-initiated navigation occurs.
2. WHEN a user navigates between routes after selecting a Theme Preference, THE Frontend Application SHALL read the persisted Theme Preference from browser local storage and apply the corresponding Resolved Theme (`light` or `dark`) on each route without requiring re-selection.
3. WHEN a user reloads a page after selecting a Theme Preference, THE Frontend Application SHALL read the persisted Theme Preference from browser local storage and apply the corresponding Resolved Theme (`light` or `dark`).
4. WHEN a page of the Frontend Application loads, THE Frontend Application SHALL apply the Resolved Theme derived from the persisted Theme Preference (or from the System Theme when the persisted preference is `system`) via the `next-themes` inline script before first paint, such that the rendered theme on first paint matches the final Resolved Theme and no intermediate theme is displayed (no Flash of Incorrect Theme).
5. WHILE the persisted Theme Preference is `system`, THE Frontend Application SHALL update the Resolved Theme to match the operating system color-scheme setting whenever that setting changes, without requiring a page reload.
6. IF no Theme Preference exists in browser local storage when a page loads, THEN THE Frontend Application SHALL resolve the theme from the System Theme and apply the corresponding Resolved Theme (`light` or `dark`) before first paint.
7. IF browser local storage is unavailable or cannot be read or written, THEN THE Frontend Application SHALL apply the Resolved Theme derived from the System Theme for the current session and SHALL continue to render without an unhandled error.

### Requirement 6: Consistent application across role areas and primitives

**User Story:** As a user moving through different parts of the app, I want the chosen theme applied everywhere, so that no Role Area or shared component breaks the visual consistency.

#### Acceptance Criteria

1. WHILE a Theme Preference is active, THE Frontend Application SHALL render each of the patient, doctor, admin, booking, consultation, intake, auth, and landing Role Areas using the Resolved Theme such that all text meets the Contrast Standard and no surface displays a background that was not derived from a Semantic Token.
2. WHILE a Theme Preference is active, THE Frontend Application SHALL render all Shared Primitives — cards, badges, inputs, tables, dialogs, drawers, empty states, loading states, error states, and `sonner` toasts — with their theme-dependent foreground and background colors derived from Semantic Tokens at the Contrast Standard in the active Resolved Theme.
3. WHEN a `sonner` toast is displayed, THE Frontend Application SHALL render the toast text against its background at a contrast ratio meeting the Contrast Standard for the applicable text size in the active Resolved Theme.
4. WHERE a Shared Primitive renders an interactive state (hover, focus, active, disabled, selected), THE Frontend Application SHALL present that state with its color or boundary indication against adjacent colors at the Contrast Standard in both the `light` and `dark` Resolved Themes.
5. WHEN a user changes the active Theme Preference through the Theme Control while a Role Area is displayed, THE Frontend Application SHALL re-render the currently visible Role Area and its Shared Primitives in the newly Resolved Theme without requiring a page reload.

### Requirement 7: Non-regression and scope boundary

**User Story:** As a maintainer, I want this change to be presentation-only and to keep the build green, so that dual-theme support introduces no functional regressions.

#### Acceptance Criteria

1. THE Frontend Application SHALL limit changes under this feature to presentation and theming concerns and SHALL NOT modify backend code, API contracts, routing configuration, or route-guard behavior.
2. WHEN a non-theming feature (navigation, form submission, authentication, or data fetching) is exercised after the changes, THE Frontend Application SHALL produce the same observable outputs and side effects it produced before the changes.
3. WHEN the existing frontend test suite is run after the changes, THE test suite SHALL report every test that passed in the pre-change baseline as passing, with zero new test failures attributable to this feature.
4. WHEN the frontend build is run after the changes, THE build SHALL complete with zero errors and produce the same set of deployable build artifacts it produced before the changes.
5. IF the test suite or build reports a failure introduced by this feature, THEN THE Frontend Application changes SHALL be corrected so that the failure no longer occurs before the feature is considered complete.
6. THE Frontend Application SHALL retain the existing Tailwind v4 Semantic Token configuration approach in `globals.css` (light values under `:root`, dark values under `.dark`) and SHALL NOT introduce new backend or infrastructure changes.
7. WHEN the Frontend Application is run after the changes, THE Frontend Application SHALL expose no active "force light" workaround and SHALL make both the `light` and `dark` Resolved Themes selectable to users through the Theme Control.
