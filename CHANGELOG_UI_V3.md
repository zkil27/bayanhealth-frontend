# BayanHealth UI/UX Changelog (V3)

All design, layout, styling, and UX modifications made in this fork must be logged here.  
This document serves as the active single source of truth for the **upstream AI agent** that will synchronize and apply these UI improvements to the main repository, superseding [`CHANGELOG_UI_V2.md`](./CHANGELOG_UI_V2.md) and [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

> **Historical References**:
> - For UI changes logged between 2026-09-26 and 2026-10-01, refer to [`CHANGELOG_UI_V2.md`](./CHANGELOG_UI_V2.md).
> - For historical entries prior to 2026-09-26, refer to [`CHANGELOG_UI.md`](./CHANGELOG_UI.md).

---

## Log Entries

### [2026-10-08] Doctor-Side Modal, Drawer, & Overlay Consistency Harmonization

- **Target Route / Surface**: 
  - Doctor Dashboard (`/doctor/dashboard`)
  - Doctor Schedule (`/doctor/schedule`)
  - Doctor History (`/doctor/history`)
  - Active Consultation Room (`/doctor/consultation/[id]`)
  - Post-Consultation Workspace (`/doctor/consultation/[id]/post`)
  - Global Desktop Navigation (`FloatingSidebar`)
- **Files Modified**:
  - `src/features/doctor/components/homepage/DoctorDashboardIntakeButton.tsx`
  - `src/features/doctor/components/homepage/DoctorDashboardDrawer.tsx`
  - `src/features/doctor/components/homepage/AcceptConsultModal.tsx`
  - `src/features/doctor/components/homepage/TriageDetailsModal.tsx`
  - `src/features/doctor/components/homepage/BlockTimeDialog.tsx`
  - `src/features/doctor/components/homepage/ReadyToStartCard.tsx`
  - `src/features/doctor/components/homepage/DoctorPatientQueue.tsx`
  - `src/features/doctor/components/homepage/ScheduledRequestsCard.tsx`
  - `src/features/doctor/components/schedule/DoctorScheduleView.tsx`
  - `src/features/doctor/components/history/DoctorHistory.tsx`
  - `src/features/consultation/components/session/ConsultationRoom.tsx`
  - `src/features/media/components/ConsultationVideo.tsx`
  - `src/features/consultation/components/postConsultation/PatientMoreDetails.tsx`
  - `src/features/consultation/components/postConsultation/Signatures.tsx`
  - `src/features/consultation/components/postConsultation/MedicalCodeSuggestionCommandList.tsx`
  - `src/features/consultation/components/documents/DocumentSheetModal.tsx`
  - `src/components/layout/FloatingSidebar.tsx`
- **Design Intent**:
  - **Primitive & Interaction Harmonization**: Eliminated crude unstyled native browser dialogs (`window.confirm`) in `DoctorPatientQueue`'s `NoShowControl`, standardizing on `@base-ui` `AlertDialog` with accessible cancellation and primary action buttons.
  - **Anti-AI Slop Enforcement**:
    - Purged neon gradients (`from-sky-100 to-card`) and hardcoded non-brand sky tints from `DoctorDashboardIntakeButton`.
    - Removed arbitrary `bg-orange-500` avatar placeholders in `DoctorHistory`, adopting the clinical `--teal-700` token.
    - Eliminated hardcoded `bg-rose-600` in End Consultation and Leave Call confirmations (`ConsultationRoom`, `ConsultationVideo`, `FloatingSidebar`), adopting semantic `--danger-fg` and `--danger-bg` tokens.
    - Replaced raw, low-contrast `bg-secondary p-4` headers in `MedicalCodeSuggestionCommandList` with structured clinical practice guideline cards featuring Lucide `BookOpen` icons, Bayan Navy `--navy-700`, and Bayan Teal `--teal-700` tokens.
  - **Accessible Triggers & Headers**:
    - Replaced raw non-semantic `<div>` elements inside `DialogTrigger` and `DrawerTrigger` with accessible `render={<button type="button" ...>}` to prevent hydration warnings and keyboard traps.
    - Standardized Drawer headers (`DoctorDashboardDrawer`, `DoctorScheduleView`, `DoctorHistory`, `PatientMoreDetails`, `Signatures`, `ReadyToStartCard`, `DoctorPatientQueue`) to include accessible `DrawerClose` close buttons with `X` vector icons and ARIA titles.
  - **Button Token Modernization**:
    - Migrated legacy `AppButton` (`variant="business"`) to canonical shadcn `Button` (`variant="primary"`) with the tactile pressed-key bottom edge across all doctor confirmation modals.
    - Added clean secondary `Cancel` actions where dialogs were previously missing escape paths (`BlockTimeDialog`, `ScheduledRequestsCard`).
- **Device Optimization**:
  - **Doctor Desktop Density**: High information density preserved across all clinical overlays with crisp 1px borders (`border-(--border-subtle)`), clean typography hierarchy, compact `h-8`/`size="sm"` control sizing, and consistent backdrop contrast (`bg-black/50`).
  - **Mobile Drawer Fallbacks**: Responsive drawers (`ResponsiveSheet`, `DoctorDashboardDrawer`, `PatientMoreDetails`) maintain proper safe-area padding (`pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`) and touch-friendly header dismiss targets.
- **Tokens & Primitives Used**:
  - `var(--navy-700)`, `var(--teal-700)`, `var(--surface-card)`, `var(--surface-warm)`, `var(--surface-warm-soft)`, `var(--surface-subtle)`, `var(--border-subtle)`, `var(--border-default)`, `var(--danger-fg)`, `var(--danger-bg)`, `var(--action-primary)`.
  - `@base-ui/react` primitives: `Dialog`, `Drawer`, `AlertDialog`, `CommandDialog`.
  - `Button` variants: `primary`, `outline`, `ghost`, `default`.
- **Upstream Porting Notes**:
  - All original props, `data-slot`, `data-testid`, and state handlers (`onConfirm`, `onDecline`, `onSave`, `onBlockTime`, `router.push`) were preserved verbatim.
  - No new external runtime dependencies added.
  - Primitives and components are 100% compliant with existing `@base-ui/react` and `components.json` design system configuration.
