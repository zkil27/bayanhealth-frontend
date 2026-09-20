import Link from "next/link";

import { AppLogo } from "@/components/primitives/Logo/AppLogo";

import {
  EMERGENCY_NOTICE,
  FOOTER_COLUMNS,
  FOOTER_CONTENT,
  FOOTER_LEGAL_LINKS,
} from "./content";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

export function FooterSection() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-(--surface-brand) text-(--text-on-brand)">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col items-start gap-4">
            {/*
              The logo-only mark plus coloured text, not `type="withText"`: that
              SVG draws "Bayan" in brand navy for use on a light header, which
              disappears against this navy footer.
            */}
            <div className="flex items-center gap-2">
              <AppLogo type="logoOnly" width={30} height={30} />
              <span className="font-display text-xl leading-none font-medium">
                <span className="text-(--teal-700)">Bayan</span>
                <span className="text-(--cream-100)">Health</span>
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-(--text-on-brand)/70">
              {FOOTER_CONTENT.tagline}
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-3">
              <h2 className="text-[15px] font-bold text-(--text-on-brand)">
                {column.heading}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`text-sm text-(--text-on-brand)/70 transition-colors hover:text-(--text-on-brand) ${focusRing}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-(--text-on-brand)/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/*
            The emergency line repeats here as well as under the hero. Someone
            who scrolled straight past the fold to look for a phone number must
            still meet it.
          */}
          <p data-slot="emergency-notice" className="text-sm text-(--text-on-brand)/60">
            {EMERGENCY_NOTICE}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <nav
              aria-label="Legal"
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              {FOOTER_LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm text-(--text-on-brand)/60 transition-colors hover:text-(--text-on-brand) ${focusRing}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="text-sm whitespace-nowrap text-(--text-on-brand)/60">
              © {currentYear} BayanHealth
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
