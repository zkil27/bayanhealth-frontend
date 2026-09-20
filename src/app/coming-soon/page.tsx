import {
  ComingSoonSection,
  FooterSection,
  LandingHeader,
} from "@/components/blocks/landing";

/**
 * Holding page for announced-but-unbuilt surfaces (`/coming-soon`).
 *
 * Case Studies points here today. The title is passed in so the next surface
 * that needs holding — Gallery, most likely — can share the route without the
 * page telling either visitor the wrong thing about where they landed.
 */
export default function ComingSoonPage() {
  return (
    <div className="flex flex-1 flex-col bg-(--surface-page)">
      <LandingHeader />
      <main className="flex flex-1 flex-col pt-16">
        <ComingSoonSection title="Case Studies" />
      </main>
      <FooterSection />
    </div>
  );
}
