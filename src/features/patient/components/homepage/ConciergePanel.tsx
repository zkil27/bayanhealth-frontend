import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";

import { cardHoverClass } from "@/features/patient/components/redesign/primitives";

/**
 * Tier 4's right column: where a patient goes with a non-clinical question —
 * a certificate that needs correcting, a prescription detail, a query about a
 * past visit.
 *
 * The honest destination is the consultation chat: messages are threaded per
 * consultation and that is where the care team answers. There is no separate
 * admin support channel, and no HMO / PhilHealth coverage record on the
 * platform, so this panel does not show a coverage badge or a generic
 * "support chat" that would route nowhere.
 *
 * The whole card is the link — one destination, one target — so it takes the
 * standard card-hover lift like the other clinical tiles.
 */
export function ConciergePanel() {
  return (
    <Link
      href="/patient/chat"
      data-slot="patient-home-concierge"
      aria-labelledby="concierge-heading"
      className={`group flex h-full flex-col gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-brand-soft) p-5 hover:border-(--action-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${cardHoverClass}`}
    >
      <span className="flex size-10 items-center justify-center rounded-(--radius-md) bg-(--surface-card) text-(--status-available-fg) [&_svg]:size-5">
        <MessageSquare aria-hidden />
      </span>
      <div>
        <h2
          id="concierge-heading"
          className="text-[15px] font-bold text-(--text-heading)"
        >
          Questions about your care?
        </h2>
        <p className="mt-1 text-[13.5px] leading-[1.45] text-(--text-muted)">
          For a medical certificate, a prescription detail, or anything about a
          past visit, message the care team on that consultation.
        </p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[14px] font-bold text-(--status-available-fg) group-hover:underline">
        Open your messages
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
