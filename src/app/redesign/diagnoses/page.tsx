import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ImpressionListPreview } from "@/features/consultation/components/postConsultation/preview/ImpressionListPreview";

export const metadata: Metadata = {
  title: "Multiple diagnoses preview — BayanHealth",
};

/**
 * Design preview for the IT / clinical-governance meeting (pilot feedback
 * 2026-11): several diagnoses per consultation, each with an ICD-10 code,
 * found by keyword search. Presentational only, on sample data. Not linked
 * from app navigation — reach it directly at `/redesign/diagnoses`.
 */
export default function DiagnosesPreviewPage() {
  // Design scaffolding only — never exposed in the production build.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen w-full bg-(--surface-sunken) px-4 py-10 text-(--text-body) sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-bold text-(--text-heading)">
            Multiple diagnoses with ICD-10 search
          </h1>
          <p className="mt-2 text-(--text-muted)">
            Proposed replacement for the single diagnosis and ICD-10 code boxes in the post-consult
            Assessment. Try typing &ldquo;LBM&rdquo;, &ldquo;high blood&rdquo; or &ldquo;J02&rdquo;. The ICD-10
            rows are a small illustrative sample, not the BayanHealth map.
          </p>
        </header>

        <ImpressionListPreview />

        <section
          aria-labelledby="needs-heading"
          className="rounded-2xl border border-(--attention-border)/40 bg-(--attention-bg) p-4 sm:p-5"
        >
          <h2 id="needs-heading" className="text-base font-bold text-(--text-heading)">
            What this needs before it can ship
          </h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--text-body)">
            <li>
              <strong>Contract (IT):</strong> the Assessment holds one diagnosis and one ICD-10 code today. It needs an
              ordered list of diagnoses, each with its code, with one marked primary.
            </li>
            <li>
              <strong>Search (IT):</strong> an ICD-10 dictionary endpoint that matches diagnosis names, codes and common
              terms such as &ldquo;LBM&rdquo; or &ldquo;high blood&rdquo;.
            </li>
            <li>
              <strong>Safety gate (IT + clinical governance):</strong> drafting eligibility is checked per diagnosis.
              Proposed rule: the primary diagnosis decides which documents can be drafted, and every diagnosis is
              listed on the documents.
            </li>
            <li>
              <strong>UI (fork):</strong> about one week once the contract and search endpoint exist.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
