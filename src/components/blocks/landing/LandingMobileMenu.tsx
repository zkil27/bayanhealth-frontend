"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { MOBILE_MENU_ANCHORS, NAV_LINKS, WAITLIST_CTA } from "./content";
import { LandingButton } from "./LandingButton";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

/**
 * The phone header's menu (below `sm`).
 *
 * Before this, the header's links were simply hidden on phones, so the Med Hub
 * and Case Studies were unreachable from the top of the page. The sheet lists
 * them as 48px rows and puts the waitlist button at the bottom of the panel,
 * inside the thumb zone. Every link closes the sheet, so an in-page anchor
 * scrolls the page rather than leaving the panel open over it.
 */
export function LandingMobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const links = [...NAV_LINKS, ...MOBILE_MENU_ANCHORS];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className={`inline-flex size-12 items-center justify-center rounded-(--radius-md) text-(--text-heading) transition-colors hover:bg-(--action-secondary-hover-surface) sm:hidden ${focusRing}`}
      >
        <Menu className="size-6" aria-hidden />
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(22rem,88vw)] gap-0 border-(--border-default) bg-(--surface-card) pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-(--text-body)"
      >
        <div className="flex h-16 items-center justify-between border-b border-(--border-subtle) px-4">
          <SheetTitle className="font-display text-lg font-bold text-(--text-heading)">
            Menu
          </SheetTitle>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className={`inline-flex size-12 items-center justify-center rounded-(--radius-md) text-(--text-muted) transition-colors hover:bg-(--action-secondary-hover-surface) hover:text-(--text-heading) ${focusRing}`}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <SheetDescription className="sr-only">
          Site navigation and the waitlist sign-up.
        </SheetDescription>

        <nav aria-label="Mobile navigation" className="flex flex-col px-2 py-2">
          {links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              onClick={close}
              className={`flex min-h-12 items-center rounded-(--radius-md) px-3 text-base font-medium text-(--text-heading) transition-colors hover:bg-(--action-secondary-hover-surface) ${focusRing}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-(--border-subtle) px-4 pt-4">
          <LandingButton
            href={WAITLIST_CTA.href}
            onClick={close}
            className="w-full"
          >
            {WAITLIST_CTA.label}
            <ArrowRight className="size-4" aria-hidden />
          </LandingButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
