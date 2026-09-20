import { AssessmentFirstWorkspace } from "@/features/consultation/components/postConsultation/AssessmentFirstWorkspace";

/**
 * Assigned-physician post-consult workspace.
 *
 * Protected clinical actions are available only through the assessment-first
 * contract. Legacy SOAP A/P saving, local ICD suggestions, generic protected
 * document writes, draft approval, immediate release, and client continuation
 * are intentionally not imported into this production route.
 *
 * The patient record used to render here as a separate full-width tabs strip
 * (`PostConsultationTabs`) stacked above an unrelated assessment workspace. It
 * is now the workspace's own left rail, so the intake and the assessment being
 * written from it can be read at the same time.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ consultationId?: string; bookingId?: string }>;
}) {
  // `bookingId` accompanies `consultationId` because the patient's intake is
  // addressed by booking id. The consultation room supplies both when it hands
  // the doctor over after completing the consult.
  const { consultationId, bookingId } = await searchParams;

  if (!consultationId) {
    return (
      <main className="flex min-h-full w-full flex-col items-center p-4 md:p-6">
        <section className="w-full max-w-xl rounded-[18px] border border-dashed border-(--border-default) bg-(--surface-card) p-6">
          <h1 className="font-display text-lg font-bold text-(--text-heading)">
            Post-consultation workspace
          </h1>
          <p className="mt-1 text-[15px] text-(--text-muted)">
            Open this workspace from an ended assigned consultation to load its
            canonical Assessment state.
          </p>
        </section>
      </main>
    );
  }

  return (
    <AssessmentFirstWorkspace
      consultationId={consultationId}
      bookingId={bookingId}
    />
  );
}
