import Link from "next/link";
import { Stethoscope } from "lucide-react";

import { AppLogoInHeader } from "@/components/primitives/Logo/AppLogo";

import { CONSULT_HREF, NAV_LINKS } from "./content";
import { LandingButton } from "./LandingButton";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

export function LandingHeader() {
  // Solid card surface, not the cream page background: the design's nav sits on
  // `bg/surface` above a cream page, and that contrast is what separates the bar
  // from the hero behind it. Opaque rather than translucent for the same reason
  // — a blurred, semi-transparent bar picks up the cream scrolling under it and
  // the separation disappears.
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-(--border-default) bg-(--surface-card)">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className={`inline-flex min-h-11 items-center justify-center rounded-md transition-opacity hover:opacity-80 ${focusRing}`}
        >
          <AppLogoInHeader />
        </Link>

        <div className="hidden sm:flex sm:items-center sm:gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              // The underline grows from the left on hover/focus — a transform,
              // so it animates cheaply and reverses on the way out.
              className={`relative inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-(--text-muted) transition-colors after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-200 after:ease-out hover:text-(--text-heading) hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none ${focusRing}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LandingButton href={CONSULT_HREF} size="sm">
            <Stethoscope className="size-4" aria-hidden />
            Consult a Doctor
          </LandingButton>
        </div>
      </nav>
    </header>
  );
}
