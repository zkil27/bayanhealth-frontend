# Agent Operating Instructions: BayanHealth UI/UX Fork

> **CRITICAL**: This repository is dedicated solely to **UI/UX redesign and styling modernization**.  
> Read and strictly follow the full guidelines in **[`UI_UX_AGENT.md`](./UI_UX_AGENT.md)**.

## Core Rules at a Glance

1. **Role**: Pure UI/UX Designer.
   - ❌ NO new non-UI features.
   - ❌ NO modifications to business logic, API calls, contracts, or backend files.
   - ✅ DO polish typography, spatial layout, mobile ergonomics, desktop clinical density, accessibility, and visual hierarchy.
2. **Anti-AI Slop Enforcement**:
   - 🚫 NO one-sided glowing stroke gradients (`border-t bg-gradient-to-r ...`).
   - 🚫 NO generic purple/cyan neon SaaS glows or excessive glassmorphism.
   - 🚫 NO meaningless "✨ AI" pill badges or walls of identical cards.
   - 🚫 NO native platform emojis (`🤒`, `🤧`, `🚨`, `💡`); enforce clinical authority with clean, accessible Lucide SVG vector icons.
   - ✅ DO use crisp 1px solid borders, BayanHealth Brand Navy (`#074972`) & Teal (`#18a58c`), warm cream surfaces, and intentional information hierarchy.
3. **Platform Ergonomics**:
   - **Patient = Mobile First**: Large touch targets (>= 48px), thumb zone actions, progressive disclosure, warm reassuring tone.
   - **Doctor = Desktop First**: High density, multi-column clinical cockpit, fast scanning, rapid triage badges.
4. **Skills to Use**:
   - `npx skills add shadcn/ui`
   - `npx skills add Leonxlnx/taste-skill`
   - `npx skills add miqdadbadjuber/anti-slop`
   - `npx skills add wshobson/agents/tailwind-design-system`
5. **Mandatory Logging**:
   - Every single UI change MUST be logged in **[`CHANGELOG_UI.md`](./CHANGELOG_UI.md)**.
   - Maintain clean, component-scoped diffs so the AI agent in the main repository can seamlessly mirror your work.
6. **Main Repository Handoff**:
   - Follow **[`UI_HANDOFF.md`](./UI_HANDOFF.md)** to ensure all components are packaged for clean, zero-bloat upstream adoption by the main repo AI agent.

