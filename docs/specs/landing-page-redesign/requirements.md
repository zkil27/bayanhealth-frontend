# Requirements Document

## Introduction

Redesign the BayanHealth MVP landing page to align with the brand's visual identity and design standards. The redesign improves responsiveness, typography, spacing, layout hierarchy, and overall user experience while maintaining full functionality for both authenticated and unauthenticated users. The page must render without any backend dependency for unauthenticated visitors (preserving existing Requirement 6.7).

## Glossary

- **Landing_Page**: The root page (`/`) of the BayanHealth frontend application, served at `frontend/bayan-health-mvp/src/app/page.tsx`
- **Header**: The sticky top navigation bar containing the logo and dark mode toggle
- **Hero_Section**: The primary above-the-fold content area containing the headline, subheadline, and call-to-action buttons
- **Feature_Cards_Section**: The grid of cards highlighting key product capabilities
- **How_It_Works_Section**: A step-by-step visual walkthrough explaining the patient journey
- **Trust_Section**: A section communicating security, privacy, and compliance assurances
- **Footer**: The bottom section of the page containing branding, social links, and legal/contact information
- **CTA**: Call-to-action — a button or link prompting the user to take a specific action (e.g., sign up, sign in)
- **Breakpoint_Mobile**: Viewport width below 640px (Tailwind `sm` breakpoint)
- **Breakpoint_Tablet**: Viewport width between 640px and 1024px (Tailwind `sm` to `lg`)
- **Breakpoint_Desktop**: Viewport width at or above 1024px (Tailwind `lg` and above)
- **Brand_Primary_Teal**: The BayanHealth primary brand color `#09a68d`
- **Brand_Dark_Blue**: The BayanHealth secondary brand color `#074972`
- **Unauthenticated_User**: A visitor who has not signed in or does not have a valid session
- **Authenticated_User**: A visitor with a valid session in the client-side auth store

## Requirements

### Requirement 1: Header Redesign

**User Story:** As a visitor, I want a clear and professional header, so that I can identify the brand and navigate key actions quickly.

#### Acceptance Criteria

1. WHILE the viewport width is at Breakpoint_Mobile, THE Header SHALL display the BayanHealth logo as icon only; WHILE the viewport width is at Breakpoint_Tablet or Breakpoint_Desktop, THE Header SHALL display the logo with text
2. THE Header SHALL include a dark mode toggle aligned to the right edge of the header container
3. THE Header SHALL remain fixed at the top of the viewport with a backdrop blur effect and a z-index sufficient to overlay all page content below it
4. WHILE the viewport width is at Breakpoint_Desktop, THE Header SHALL display navigation links for "Features" and "How It Works" that, when activated, smooth-scroll the viewport to the corresponding page section
5. WHILE the viewport width is below Breakpoint_Desktop, THE Header SHALL hide the "Features" and "How It Works" navigation links
6. IF an Unauthenticated_User views the Header, THEN THE Header SHALL display a "Sign In" link adjacent to the dark mode toggle
7. IF an Authenticated_User views the Header, THEN THE Header SHALL hide the "Sign In" link

### Requirement 2: Hero Section Redesign

**User Story:** As a visitor, I want an engaging hero section, so that I immediately understand the value proposition of BayanHealth.

#### Acceptance Criteria

1. THE Hero_Section SHALL display the BayanHealth logo with text at a minimum rendered width of 180px on Breakpoint_Mobile and 220px on Breakpoint_Desktop
2. THE Hero_Section SHALL display a headline using a font size of `text-4xl` on Breakpoint_Mobile and `text-5xl` on Breakpoint_Desktop with `font-bold` weight
3. THE Hero_Section SHALL display a subheadline in `text-muted-foreground` color with a maximum width of 36rem to constrain line length
4. THE Hero_Section SHALL use vertical spacing of at least `2rem` between the logo, headline, subheadline, and CTA group
5. WHEN an Unauthenticated_User views the page, THE Hero_Section SHALL display two CTAs: a primary "Create an account" button using Brand_Primary_Teal that navigates to the sign-up page, and a secondary outlined "Sign in" button that navigates to the sign-in page
6. WHEN an Authenticated_User views the page, THE Hero_Section SHALL display the user's display name, their role label (patient, doctor, or admin), and a single CTA button that navigates to the user's role-specific dashboard
7. THE Hero_Section SHALL include a background gradient or decorative element using Brand_Primary_Teal and Brand_Dark_Blue with opacity no greater than 20% so that foreground text contrast ratios remain at WCAG AA levels
8. THE Hero_Section SHALL center all content horizontally within the viewport and vertically align items using a flexbox column layout

### Requirement 3: Feature Cards Section Redesign

**User Story:** As a visitor, I want to see the key features of BayanHealth presented clearly, so that I can understand what the platform offers before signing up.

#### Acceptance Criteria

1. THE Feature_Cards_Section SHALL display a section heading ("What we offer" or equivalent) with proper typographic hierarchy (`text-2xl font-bold` minimum)
2. THE Feature_Cards_Section SHALL display exactly four feature cards representing core platform capabilities (e.g., teleconsultation, clinical decision support, secure records, easy booking) in a single-column layout on mobile (below 640px), two-column grid on tablet (640px–1023px), and four-column grid on desktop (1024px and above)
3. EACH feature card SHALL display an icon (minimum 24×24px) inside a rounded container (minimum border-radius `0.5rem`) with a Brand_Primary_Teal background tint at 10–15% opacity, a bold title (maximum 40 characters), and a descriptive paragraph (maximum 120 characters) in `text-muted-foreground` color
4. THE Feature_Cards_Section SHALL maintain consistent gap spacing between cards (minimum `1rem` gap) and all cards within a row SHALL render at equal height regardless of content length
5. THE Feature_Cards_Section SHALL have a maximum content width of `72rem` and be horizontally centered with horizontal padding of `1rem` on mobile and `2rem` on tablet and desktop

### Requirement 4: How It Works Section

**User Story:** As a visitor, I want to understand the consultation process at a glance, so that I feel confident about using the platform.

#### Acceptance Criteria

1. THE How_It_Works_Section SHALL display a section heading ("How it works" or equivalent) using a minimum font size of `text-2xl` with `font-bold` weight, consistent with other section headings on the Landing_Page
2. THE How_It_Works_Section SHALL present three to four sequential steps describing the patient journey (e.g., Create account, Book consultation, Connect with doctor, Get care summary)
3. EACH step SHALL display a step number or indicator, a title (maximum 30 characters), and a description (maximum 120 characters)
4. THE How_It_Works_Section SHALL visually connect steps using a connector line, arrow, or sequential numbering to convey progression
5. WHEN the viewport width is at Breakpoint_Mobile, THE How_It_Works_Section SHALL display steps in a vertical stack
6. WHEN the viewport width is at Breakpoint_Tablet, THE How_It_Works_Section SHALL display steps in a two-column grid
7. WHEN the viewport width is at Breakpoint_Desktop, THE How_It_Works_Section SHALL display steps in a horizontal row
8. THE How_It_Works_Section SHALL have a maximum content width of `72rem` and be horizontally centered within its parent container

### Requirement 5: Trust and Security Section

**User Story:** As a visitor, I want reassurance that my health data is safe, so that I trust the platform before sharing personal information.

#### Acceptance Criteria

1. THE Trust_Section SHALL display a section heading communicating security and privacy (e.g., "Your data is safe with us") using typographic hierarchy consistent with other section headings (`text-2xl font-bold` minimum)
2. THE Trust_Section SHALL display at least three and no more than six trust indicators (e.g., end-to-end encryption, role-based access control, data residency in secure region)
3. EACH trust indicator SHALL include an icon and a descriptive label of no more than 80 characters
4. THE Trust_Section SHALL use Brand_Dark_Blue as a background color or accent to visually differentiate the section from surrounding content
5. WHEN the viewport width is at Breakpoint_Mobile, THE Trust_Section SHALL display trust indicators in a single-column vertical stack
6. WHEN the viewport width is at Breakpoint_Desktop, THE Trust_Section SHALL display trust indicators in a horizontal row or multi-column grid with consistent gap spacing (minimum `1rem` gap)
7. THE Trust_Section SHALL have a maximum content width of `72rem` and be horizontally centered

### Requirement 6: Footer

**User Story:** As a visitor, I want a footer with contact and social links, so that I can reach BayanHealth through other channels.

#### Acceptance Criteria

1. THE Footer SHALL display the BayanHealth logo (icon variant) at a minimum rendered height of 32px
2. THE Footer SHALL display social media links using the existing social icon assets (Messenger, Viber, WhatsApp) as clickable icons that open in a new browser tab with `rel="noopener noreferrer"` applied to each link
3. THE Footer SHALL display a copyright notice with the dynamically rendered current year and "BayanHealth" name
4. THE Footer SHALL display a tagline or description of the platform limited to one sentence and no more than 120 characters
5. THE Footer SHALL use a background color derived from the existing dark or muted CSS custom property tokens (e.g., `--muted` or equivalent) that provides a minimum WCAG AA contrast difference from the adjacent page section background
6. WHILE the viewport width is at Breakpoint_Mobile, THE Footer SHALL stack content vertically with center alignment
7. WHILE the viewport width is at Breakpoint_Desktop, THE Footer SHALL arrange content in a horizontal layout of 3 columns: branding/tagline, social links, and copyright

### Requirement 7: Responsive Spacing and Typography

**User Story:** As a user on any device, I want consistent spacing and readable typography, so that the page feels polished and comfortable to read.

#### Acceptance Criteria

1. THE Landing_Page SHALL use the Inter font family as the primary typeface for all text content, with a fallback stack of system-ui, sans-serif
2. THE Landing_Page SHALL apply vertical section spacing of at least `4rem` between major page sections (Hero, Features, How It Works, Trust, Footer)
3. WHILE the viewport width is at Breakpoint_Mobile, THE Landing_Page SHALL apply horizontal padding of `1rem` to the page content area
4. WHILE the viewport width is at Breakpoint_Tablet or Breakpoint_Desktop, THE Landing_Page SHALL apply horizontal padding of `2rem` to the page content area
5. THE Landing_Page SHALL maintain body text at a minimum size of `1rem` (16px) for readability
6. WHILE the viewport width is at Breakpoint_Mobile, THE Landing_Page SHALL render h1 headings at `text-3xl` (1.875rem), h2 headings at `text-2xl` (1.5rem), and h3 headings at `text-xl` (1.25rem)
7. WHILE the viewport width is at Breakpoint_Desktop, THE Landing_Page SHALL render h1 headings at `text-4xl` (2.25rem), h2 headings at `text-3xl` (1.875rem), and h3 headings at `text-2xl` (1.5rem)

### Requirement 8: Dark Mode Support

**User Story:** As a user who prefers dark mode, I want the landing page to adapt to my theme preference, so that the page is comfortable to view.

#### Acceptance Criteria

1. THE Landing_Page SHALL render all sections exclusively using the semantic color tokens defined in the existing CSS custom properties (e.g., `--background`, `--foreground`, `--primary`, `--card`, `--muted`) and SHALL NOT use hardcoded color literals in component styles
2. THE Landing_Page SHALL maintain sufficient contrast ratios (WCAG AA minimum 4.5:1 for normal text, 3:1 for large text and UI components) in both light and dark modes across all semantic token pairs (background/foreground, card/card-foreground, primary/primary-foreground, muted/muted-foreground, secondary/secondary-foreground, accent/accent-foreground)
3. WHEN the user toggles dark mode via the Header toggle, THE Landing_Page SHALL transition all section colors to the alternate theme within 300 milliseconds without a full page reload and without a visible flash of the previous theme's colors
4. THE Landing_Page SHALL ensure Brand_Primary_Teal and Brand_Dark_Blue maintain a minimum contrast ratio of 3:1 against the dark mode background token and a minimum perceptible color difference of 0.05 OKLCH lightness units between them in dark mode
5. WHEN the Landing_Page loads and the user's operating system reports a dark color scheme preference (prefers-color-scheme: dark), THE Landing_Page SHALL render in dark mode on first paint without an intermediate flash of light mode

### Requirement 9: Backend Independence for Unauthenticated View

**User Story:** As an unauthenticated visitor, I want the landing page to load instantly without waiting for any API calls, so that I get a fast first impression.

#### Acceptance Criteria

1. THE Landing_Page SHALL render all static content sections (Hero, Features, How It Works, Trust, Footer) without initiating any HTTP requests to application API endpoints (e.g., API Gateway routes under /v1/)
2. WHEN a visitor loads the page without authentication, THE Landing_Page SHALL display all sections using only bundled copy text and locally served assets (fonts, icons, images) that are available from the hosting CDN without requiring a round-trip to backend application services
3. IF the client-side auth store returns a null session, an expired session (current time ≥ expiresAt), or throws an error during hydration, THEN THE Landing_Page SHALL render the unauthenticated view showing sign-in and sign-up entry points without displaying an error state
4. WHEN a visitor loads the landing page without authentication, THE Landing_Page SHALL reach first contentful paint within 2 seconds on a simulated fast 3G connection with no prior cache

### Requirement 10: Accessibility

**User Story:** As a user with assistive technology, I want the landing page to be navigable and understandable, so that I can access all content equally.

#### Acceptance Criteria

1. THE Landing_Page SHALL use semantic HTML elements (header, main, nav, section, footer) for all major page regions
2. THE Landing_Page SHALL provide alt text of no more than 125 characters for the BayanHealth logo images that conveys the image purpose
3. WHILE the viewport width is 768 pixels or narrower, THE Landing_Page SHALL ensure all interactive elements (buttons, links) have a minimum touch target size of 44x44 CSS pixels
4. THE Landing_Page SHALL ensure proper heading hierarchy (single h1, sequential h2/h3 per section with no skipped levels) throughout the page
5. THE Footer social links SHALL include accessible labels (aria-label or equivalent) that name the destination platform for each link
6. THE Landing_Page SHALL ensure all text and interactive elements meet a minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text (18px or above) against their background
7. THE Landing_Page SHALL ensure all interactive elements are reachable and operable via keyboard (Tab, Shift+Tab, Enter, Escape) and display a visible focus indicator when focused
8. THE Landing_Page SHALL declare the document language attribute (lang) on the html element
