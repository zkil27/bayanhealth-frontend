import { QueryClientProviders } from "@/components/blocks/Providers";

/**
 * The post-consult workspace draws its own header — patient context, the
 * Review → Assess → Deliver stepper, and the gate's status — because all three
 * depend on the authoritative assessment state that only the workspace holds.
 *
 * This layout previously rendered a generic three-column bar ("Go Back",
 * "Deliverables & Documentation", "POST-CONSULTATION ACTIONS") above it, which
 * duplicated the back link, named the page twice, and could not reflect any of
 * that state. It is now just the page's surface.
 *
 * `QueryClientProviders` lives here rather than assuming the `(homepage)`
 * layout's copy is in scope: this route is a *sibling* of `(homepage)`, not
 * nested under it, so it does not inherit that provider. The workspace reads
 * the doctor's own profile (for the stored signature specimen) via
 * `useMyDoctorProfile`, which calls `useQuery` and throws "No QueryClient set"
 * without an ancestor provider of its own.
 */
export default function PostConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProviders>
      <div className="min-h-dvh bg-(--surface-page) text-(--text-body)">{children}</div>
    </QueryClientProviders>
  );
}
