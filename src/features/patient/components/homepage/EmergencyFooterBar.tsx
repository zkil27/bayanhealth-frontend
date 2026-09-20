import { AlertTriangle, PhoneCall } from "lucide-react";

/**
 * The non-emergency guardrail remains at the end of dashboard content rather
 * than competing with the fixed patient navigation for permanent screen space.
 */
export function EmergencyFooterBar() {
  return (
    <footer
      data-slot="emergency-footer"
      className="mt-2.5 rounded-2xl border border-(--danger-border)/40 bg-(--danger-bg)/70 text-(--danger-fg)"
    >
      <details className="group sm:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2 text-xs font-bold marker:hidden">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Not for emergencies
          </span>
          <span aria-hidden="true" className="text-[10px] group-open:hidden">
            View guidance
          </span>
          <span aria-hidden="true" className="hidden text-[10px] group-open:inline">
            Close
          </span>
        </summary>
        <div className="border-t border-(--danger-border)/30 px-3.5 py-3 text-xs leading-relaxed">
          <p>
            BayanHealth cannot treat life-threatening conditions. If you have
            chest pain or severe bleeding, call emergency services immediately.
          </p>
          <a
            href="tel:911"
            className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-(--danger-border)/40 bg-(--surface-card) px-4 font-bold shadow-sm"
          >
            <PhoneCall className="size-4 shrink-0" aria-hidden />
            Call 911
          </a>
        </div>
      </details>

      <div className="hidden items-center justify-between gap-3 px-3.5 py-2 sm:flex">
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-bold shrink-0">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Not for emergencies:
          </span>
          <span>
            BayanHealth cannot treat life-threatening conditions. If experiencing
            chest pain or severe bleeding, call emergency services immediately.
          </span>
        </div>
        <a
          href="tel:911"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-(--danger-border)/40 bg-(--surface-card) px-4 text-xs font-bold shadow-sm transition-colors hover:bg-(--danger-bg)"
        >
          <PhoneCall className="size-3.5 shrink-0" aria-hidden />
          Call 911
        </a>
      </div>
    </footer>
  );
}
