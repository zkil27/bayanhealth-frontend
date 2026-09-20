import {
  FooterSection,
  LandingHeader,
  OrganisationSection,
  WaitlistSection,
  ORGANISATION_PAGE_CONTENT,
} from "@/components/blocks/landing";

/**
 * The partnerships funnel (`/para-sa-organisasyon`).
 *
 * Every organisation call to action on the site lands here — the audience card's
 * "Talk to our team", the Med Hub's "Partner With Us / Request a Demo", and the
 * footer. The capture is the same waitlist form with its role fixed to
 * `ORGANIZATION`, so an LGU arriving through this page joins the one list rather
 * than a second one that has to be reconciled later.
 */
export default function OrganisationPage() {
  return (
    <div className="flex flex-1 flex-col bg-(--surface-page)">
      <LandingHeader />
      <main className="pt-16">
        <OrganisationSection />
        <WaitlistSection
          id="talk-to-our-team"
          lockedSegment="ORGANIZATION"
          heading={ORGANISATION_PAGE_CONTENT.formHeading}
          body={ORGANISATION_PAGE_CONTENT.formBody}
        />
      </main>
      <FooterSection />
    </div>
  );
}
