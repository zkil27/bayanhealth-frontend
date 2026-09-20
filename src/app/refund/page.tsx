import type { Metadata } from "next";

import {
  FooterSection,
  LandingHeader,
  LegalArticle,
  REFUND_POLICY,
} from "@/components/blocks/landing";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | BayanHealth",
  description:
    "When a BayanHealth consultation can be cancelled, when you are entitled to a refund, and how refunds are requested and processed.",
};

/**
 * Refund & Cancellation Policy (`/refund`).
 *
 * Same public landing chrome as the Privacy Policy. Shorter than the Privacy
 * Policy and read start to finish, so it renders as a single centred column
 * with no table of contents.
 */
export default function RefundPolicyPage() {
  return (
    <div className="flex flex-1 flex-col bg-(--surface-page)">
      <LandingHeader />
      <main className="pt-16">
        <LegalArticle document={REFUND_POLICY} />
      </main>
      <FooterSection />
    </div>
  );
}
