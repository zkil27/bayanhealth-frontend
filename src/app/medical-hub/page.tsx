import {
  FooterSection,
  LandingHeader,
  MedicalHubSection,
  MEDICAL_PROTOCOLS,
} from "@/components/blocks/landing";

/**
 * Medical Resource Hub (`/medical-hub`).
 *
 * Wears the landing chrome rather than the application shell: this is a public
 * marketing surface reached from the header of the landing page, and a visitor
 * who has not signed in should not cross into app navigation to read a clinical
 * guideline. It stays a server component — the content is static, so there is
 * nothing here that needs to reach the client as JavaScript.
 */
export default function MedicalHubPage() {
  return (
    <div className="flex flex-1 flex-col bg-(--surface-page)">
      <LandingHeader />
      <main className="pt-16">
        <MedicalHubSection protocols={MEDICAL_PROTOCOLS} />
      </main>
      <FooterSection />
    </div>
  );
}
