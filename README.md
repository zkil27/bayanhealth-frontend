# BayanHealth Frontend (UI Demo & Overhaul Workspace)

A lightweight, standalone Next.js frontend extracted from the BayanHealth platform. Designed specifically for **fast UI/UX overhauls**, prototyping, and **zero-config Vercel deployment**.

---

## ⚡ Key Highlights for Fast UI Work

- **Standalone Next.js App**: No monorepo nesting, backend lambdas, Terraform scripts, or complex contract generators.
- **Zero Blocker Scans**: All restrictive policy checkers and test suites have been removed so you can rapidly redesign pages, mock data, and test layout variants without failing build gates.
- **AI-Friendly Codebase**: Clean, focused directory tree that allows AI coding assistants to quickly locate components without token bloat.
- **Vercel Demo Ready**: Deploy directly by linking this GitHub repository to Vercel — Next.js is at the root and builds cleanly out of the box.

---

## 📁 Project Architecture

```
bayanhealth-frontend/
├── src/
│   ├── app/                 # Next.js App Router (all routes & pages)
│   │   ├── (auth)/          # Sign In, Sign Up, Confirmation
│   │   ├── admin/           # Admin portal (users, KYC, bookings, notifications)
│   │   ├── consultation/    # Consultation video room & call experience
│   │   ├── doctor/          # Doctor dashboard, chats, history, schedule
│   │   ├── intake/          # Patient intake flows
│   │   ├── medical-hub/     # Clinical guidelines & condition guides
│   │   ├── patient/         # Patient dashboard, bookings, health timeline, chat
│   │   ├── page.tsx         # Public marketing landing page
│   │   └── globals.css      # Tailwind v4 configuration & base styles
│   │
│   ├── components/          # Reusable UI component library
│   │   ├── ui/              # shadcn/radix primitives (Button, Card, Dialog, Sheet, etc.)
│   │   └── blocks/          # Composed blocks (Hero, Landing sections, Profile, etc.)
│   │
│   ├── features/            # Feature-specific components and UI states
│   │   ├── admin/           # Admin tables and review panels
│   │   ├── authentication/  # Auth forms and stores
│   │   ├── booking/         # Booking wizard, calendar, doctor cards, triage
│   │   ├── consultation/    # Video room and post-consultation documentation
│   │   ├── doctor/          # Doctor clinical cards and schedules
│   │   └── patient/         # Patient home, quick symptoms, care roadmaps
│   │
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions, formatting, and API helpers
│   ├── stores/              # Zustand state stores (auth, booking state)
│   ├── styles/              # Design tokens (`bayanhealth-tokens.css`)
│   └── types/               # TypeScript models and interfaces
│
├── public/                  # Static assets, SVG icons, and branding photography
└── package.json             # Streamlined dependencies
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 3. Check Types
```bash
npm run typecheck
```

### 4. Production Build
```bash
npm run build
```

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com/), click **Add New Project** and import the repository.
3. Vercel will automatically detect **Next.js** as the framework with root settings.
4. Add the environment variables from `.env.example` in the Vercel project settings (or use your custom backend endpoints).
5. Click **Deploy**.

---

## 🎨 UI Customization & Design System

- **Design Tokens**: Defined in `src/styles/bayanhealth-tokens.css` (primary teals, warm cream canvas, brand navy, status accents).
- **Tailwind Setup**: Uses Tailwind v4 configured in `src/app/globals.css`.
- **Component Primitives**: Uses Radix/shadcn components inside `src/components/ui`. Add new primitives easily using `npx shadcn@latest add <component>`.
- **UI Documentation Index**: Full catalog of all specifications, scenarios, and architecture guides is available in **[`docs/UI_INDEX.md`](./docs/UI_INDEX.md)**.

---

## 📚 Essential UI Design Documentation

All necessary design guidelines, component specifications, and behavioral user journeys have been imported into this repository:

| Document / Section | Location | Purpose |
| :--- | :--- | :--- |
| **UI/UX Agent Spec & Anti-Slop** | [`UI_UX_AGENT.md`](./UI_UX_AGENT.md) | Anti-AI slop manifesto, color palette, mobile/desktop ergonomics, accessibility |
| **UI Handoff Manual** | [`UI_HANDOFF.md`](./UI_HANDOFF.md) | The Golden Rule of Porting (Visual Shell vs Data Plumbing) and AI prompts |
| **Agent Operating Rules** | [`AGENTS.md`](./AGENTS.md) | High-level operational rules for AI coding assistants working on the UI |
| **UI Changelog** | [`CHANGELOG_UI.md`](./CHANGELOG_UI.md) | Running record of UI/UX improvements, layouts, and responsive fixes |
| **Backend & Dev Outputs** | [`DEV_OUTPUTS.md`](./DEV_OUTPUTS.md) | Backend endpoints, Cognito IDs, DynamoDB tables, and `.env` setup |
| **Feature Specifications** | [`docs/specs/`](./docs/specs/) | PRDs for landing page, dark mode, dashboard improvements, CDS gating, etc. |
| **Behavioral Scenarios** | [`docs/scenarios/`](./docs/scenarios/) | Given-When-Then user flows for Auth, Booking, Consultation, and Onboarding |
| **User Journey Diagrams** | [`docs/diagrams/`](./docs/diagrams/) | BDD Mermaid diagrams illustrating booking and consultation flows |
| **Architecture Guides** | [`docs/architecture/`](./docs/architecture/) | Video rooms, Daily.co/Meet, AI Scribe, demo script, and API standards |
| **Product Steering** | [`docs/steering/`](./docs/steering/) | High-level capabilities, tech stack, and structure conventions |
| **Master UI Index** | [`docs/UI_INDEX.md`](./docs/UI_INDEX.md) | Central navigation hub for all frontend documentation |

