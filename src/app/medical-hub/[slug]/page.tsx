import { notFound } from "next/navigation";

import {
  FooterSection,
  LandingHeader,
  ProtocolArticle,
  getProtocolBySlug,
} from "@/components/blocks/landing";

/**
 * A single clinical protocol (`/medical-hub/{slug}`).
 *
 * The slugs are the ones the published hub already uses, so links that exist in
 * the wild keep resolving. An unknown slug is a 404 rather than a redirect back
 * to the index: a mistyped protocol name is not a request for a different
 * protocol, and silently landing someone on the wrong guideline is the failure
 * mode worth avoiding here.
 */
export default async function ProtocolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const protocol = getProtocolBySlug(slug);

  if (!protocol) notFound();

  return (
    <div className="flex flex-1 flex-col bg-(--surface-page)">
      <LandingHeader />
      <main className="pt-16">
        <ProtocolArticle protocol={protocol} />
      </main>
      <FooterSection />
    </div>
  );
}
