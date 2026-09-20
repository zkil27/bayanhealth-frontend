"use client";

import { useEffect, useState } from "react";

import {
  LandingHeader,
  HeroSection,
  FeaturesSection,
  CareTracksSection,
  TestimonialsSection,
  DoctorsSection,
  FaqSection,
  HowItWorksSection,
  WaitlistSection,
  FooterSection,
  AUDIENCES,
  CARE_TRACKS,
  TESTIMONIALS,
  DOCTORS,
  FAQ_ITEMS,
  STEPS,
} from "@/components/blocks/landing";
import { useAuthStore } from "@/stores/useAuthStore";

export default function Home() {
  // The authenticated view depends on the persisted client-side auth store.
  // Render the unauthenticated entry view on the server / first paint (it needs
  // no authentication, satisfying Requirement 9.1–9.3) and reconcile after mount
  // to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  const primaryRole = useAuthStore((s) => s.primaryRole)() ?? "patient";
  const showAuthed = mounted && isAuthenticated && !!session;

  // Auth-derived props for HeroSection
  const variant = showAuthed ? "authenticated" : "unauthenticated";
  const displayName = session?.email;
  const roleLabel = showAuthed ? primaryRole : undefined;
  const dashboardHref = showAuthed ? `/${primaryRole}` : undefined;

  return (
    // The landing page runs on the brand cream page surface (via `bg-satin`,
    // which also lays the woven herringbone texture over it) rather than the
    // app's neutral `--background`: the design's warm full-bleed treatment
    // depends on it — the white cards, the teal journey block, and the navy
    // footer all read against cream, not against white.
    <div className="bg-satin relative flex flex-1 flex-col overflow-hidden">
      <LandingHeader />

      <main className="pt-16">
        <HeroSection
          variant={variant}
          displayName={showAuthed ? displayName : undefined}
          roleLabel={roleLabel}
          dashboardHref={dashboardHref}
        />
        <FeaturesSection features={AUDIENCES} />
        <CareTracksSection tracks={CARE_TRACKS} />
        <TestimonialsSection testimonials={TESTIMONIALS} />
        <DoctorsSection doctors={DOCTORS} />
        <HowItWorksSection steps={STEPS} />
        <FaqSection items={FAQ_ITEMS} />
        <WaitlistSection />
      </main>

      <FooterSection />
    </div>
  );
}
