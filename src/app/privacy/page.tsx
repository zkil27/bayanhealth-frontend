import type { Metadata } from "next";

import {
  FooterSection,
  LandingHeader,
  LegalArticle,
  PRIVACY_POLICY,
} from "@/components/blocks/landing";

export const metadata: Metadata = {
  title: "Privacy Policy | BayanHealth",
  description:
    "How BayanHealth collects, uses, shares, and protects your personal and health information, and the rights you have under the Data Privacy Act.",
};

/**
 * Privacy Policy (`/privacy`).
 *
 * Wears the landing chrome, not the application shell: it is a public surface
 * linked from the marketing footer and read by visitors who have not signed in.
 * A server component — the content is static, so nothing here needs to reach the
 * client as JavaScript (the table of contents is anchor links and a `<details>`
 * element, both CSS-only). Renders with the table of contents enabled.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-1 flex-col bg-(--surface-page)">
      <LandingHeader />
      <main className="pt-16">
        <LegalArticle document={PRIVACY_POLICY} withTableOfContents />
      </main>
      <FooterSection />
    </div>
  );
}
