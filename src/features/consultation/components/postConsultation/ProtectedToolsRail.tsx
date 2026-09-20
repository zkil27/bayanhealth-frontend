"use client";

import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileBadge,
  FlaskConical,
  Hash,
  Lock,
  Pill,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { CdsProtectedOutputType } from "@/types/cds-contract";

import type { ToolRailState, ToolRow } from "./workspacePhase";

const TOOL_ICONS: Record<CdsProtectedOutputType, React.ComponentType<{ className?: string }>> = {
  plan: ClipboardList,
  prescription: Pill,
  final_icd: Hash,
  medical_certificate: FileBadge,
  lab_request: FlaskConical,
  imaging_request: Scan,
  patient_education: BookOpen,
};

/**
 * The protected-tools rail — the right column of W1–W4, and the single place the
 * gate's disposition is stated.
 *
 * This replaces a grid of seven identical `Generate X` buttons that rendered at
 * all times and were simply disabled when the gate was closed, with nothing on
 * the button saying why. Every row now carries its own status, and the rail
 * header states the gate's overall position, so "why can't I prescribe" is
 * answerable from the rail instead of by elimination.
 *
 * The deliberate omission: no tool row is ever a link to a screen that does not
 * exist. Rows are actions on this page (draft, or jump to the drafted document),
 * never navigation to an unbuilt route.
 */
export function ProtectedToolsRail({
  railState,
  badgeLabel,
  rows,
  busy,
  generating,
  onDraft,
  onFocusArtifact,
  footer,
  blockedMessage,
  relockedMessage,
  lockedNote,
  gateAction,
  gateHint,
}: {
  railState: ToolRailState;
  badgeLabel: string;
  rows: readonly ToolRow[];
  busy: boolean;
  /** Output types currently being drafted, so a pressed row reports back. */
  generating?: ReadonlySet<CdsProtectedOutputType>;
  onDraft: (outputType: CdsProtectedOutputType) => void;
  /** Bring an already-drafted document into view in the deliverables deck. */
  onFocusArtifact: (outputType: CdsProtectedOutputType) => void;
  footer?: React.ReactNode;
  blockedMessage?: React.ReactNode;
  relockedMessage?: React.ReactNode;
  /** One line under the rows in the `locked` state, e.g. the deterministic-gate reminder before confirmation. */
  lockedNote?: React.ReactNode;
  /** The control that changes the gate's disposition, rendered above the rows it affects. */
  gateAction?: React.ReactNode;
  /** One line under {@link gateAction} stating what the gate currently permits. */
  gateHint?: React.ReactNode;
}) {
  return (
    <aside
      data-slot="protected-tools-rail"
      data-rail-state={railState}
      aria-labelledby="protected-tools-heading"
      className="flex w-full flex-col overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3.5",
          railState === "unlocked" && "bg-(--status-available-bg)",
          railState === "blocked" && "bg-(--danger-bg)",
          railState === "relocked" && "bg-(--status-soon-bg)",
          railState === "locked" && "bg-(--surface-warm-soft)",
        )}
      >
        {railState === "unlocked" ? (
          <Unlock className="size-4.5 shrink-0 text-(--status-available-fg)" />
        ) : railState === "blocked" ? (
          <ShieldAlert className="size-4.5 shrink-0 text-(--danger-fg)" />
        ) : (
          <Lock
            className={cn(
              "size-4.5 shrink-0",
              railState === "relocked" ? "text-(--status-soon-fg)" : "text-(--text-muted)",
            )}
          />
        )}
        <h2
          id="protected-tools-heading"
          className={cn(
            "text-[15px] font-bold",
            railState === "unlocked" && "text-(--status-available-fg)",
            railState === "blocked" && "text-(--danger-fg)",
            railState === "relocked" && "text-(--status-soon-fg)",
            railState === "locked" && "text-(--text-heading)",
          )}
        >
          Protected tools
        </h2>
        <span
          data-slot="protected-tools-badge"
          className={cn(
            "ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold",
            railState === "unlocked" && "bg-(--surface-card) text-(--status-available-fg)",
            railState === "blocked" && "bg-(--surface-card) text-(--danger-fg)",
            railState === "relocked" && "bg-(--surface-card) text-(--status-soon-fg)",
            railState === "locked" && "bg-(--surface-card) text-(--text-muted)",
          )}
        >
          {badgeLabel}
        </span>
      </div>

      {/*
        The gate action lives here, directly above the rows it unlocks. It was
        previously a full-width "Drafting authorisation" card in the centre
        column, three sections away from the locked rows that sent the physician
        looking for it.
      */}
      {gateAction ? (
        <div
          data-slot="rail-gate-action"
          className="flex flex-col gap-1.5 border-b border-(--border-subtle) px-3 py-3"
        >
          {gateAction}
          {gateHint ? <p className="text-xs text-(--text-muted)">{gateHint}</p> : null}
        </div>
      ) : null}

      {railState === "blocked" ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-(--danger-bg)">
            <ShieldAlert className="size-6 text-(--danger-fg)" />
          </span>
          <p className="text-[15px] font-bold text-(--text-heading)">Tools stay locked</p>
          <p className="text-sm text-(--text-muted)">{blockedMessage}</p>
        </div>
      ) : railState === "relocked" ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-(--status-soon-bg)">
            <Lock className="size-6 text-(--status-soon-fg)" />
          </span>
          <p className="text-[15px] font-bold text-(--text-heading)">Tools re-locked</p>
          <p className="text-sm text-(--text-muted)">{relockedMessage}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 p-3">
          {rows.map((row) => (
            <ToolRowItem
              key={row.outputType}
              row={row}
              busy={busy}
              generating={generating?.has(row.outputType) ?? false}
              onDraft={onDraft}
              onFocusArtifact={onFocusArtifact}
            />
          ))}
          {railState === "locked" && lockedNote ? (
            <li
              data-slot="deterministic-gate-note"
              className="mt-1 flex items-start gap-2 rounded-[12px] bg-(--surface-sunken) px-3 py-2.5 text-sm text-(--text-muted)"
            >
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-(--text-subtle)" />
              {lockedNote}
            </li>
          ) : null}
        </ul>
      )}

      {footer ? <div className="border-t border-(--border-subtle) p-3">{footer}</div> : null}
    </aside>
  );
}

function ToolRowItem({
  row,
  busy,
  generating,
  onDraft,
  onFocusArtifact,
}: {
  row: ToolRow;
  busy: boolean;
  generating: boolean;
  onDraft: (outputType: CdsProtectedOutputType) => void;
  onFocusArtifact: (outputType: CdsProtectedOutputType) => void;
}) {
  const Icon = TOOL_ICONS[row.outputType];
  const hasArtifact =
    row.status === "drafted" || row.status === "signed" || row.status === "released";
  // A row whose draft is in flight is neither "available" (pressing again would
  // start a second one) nor locked. It reports its own progress instead, which
  // is what makes pressing a tool feel like it did something.
  const interactive = !generating && (row.status === "available" || hasArtifact);

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          row.status === "released" || row.status === "signed"
            ? "bg-(--status-available-bg) text-(--status-available-fg)"
            : row.status === "stale" || row.status === "coming_soon"
              ? "bg-(--status-soon-bg) text-(--status-soon-fg)"
              : interactive
                ? "bg-(--surface-accent-soft) text-(--status-available-fg)"
                : "bg-(--gray-bg) text-(--text-subtle)",
        )}
      >
        {generating ? <Spinner className="size-4.5" /> : <Icon className="size-4.5" />}
      </span>
      <span className="flex min-w-0 flex-col text-left">
        <span
          className={cn(
            "truncate text-[15px] font-bold",
            interactive ? "text-(--text-heading)" : "text-(--text-subtle)",
          )}
        >
          {row.label}
        </span>
        <span
          className={cn(
            "truncate text-sm",
            generating
              ? "text-(--ai-fg)"
              : row.status === "stale" || row.status === "coming_soon"
                ? "text-(--status-soon-fg)"
                : "text-(--text-muted)",
          )}
        >
          {generating ? "Drafting…" : row.detail}
        </span>
      </span>
      <span aria-hidden className="ml-auto shrink-0">
        {generating ? null : row.status === "released" ? (
          <CheckCircle2 className="size-4 text-(--status-available-fg)" />
        ) : interactive || row.status === "coming_soon" ? null : (
          <Lock className="size-4 text-(--text-subtle)" />
        )}
      </span>
    </>
  );

  /*
    Every row is a button, including the ones the gate is holding closed — a
    locked tool is disabled, not absent, so the physician can see that
    prescribing exists and is currently unavailable rather than wondering
    whether this consultation supports it at all. The accessible name states
    the action the row performs, which for a lockable tool is drafting it.
  */
  return (
    <li data-slot="protected-tool" data-output-type={row.outputType} data-status={row.status}>
      <button
        type="button"
        disabled={!interactive || busy}
        aria-busy={generating}
        aria-label={
          generating
            ? `Drafting ${row.label}`
            : hasArtifact
              ? `Review ${row.label}`
              : `Draft ${row.label}`
        }
        onClick={() =>
          hasArtifact ? onFocusArtifact(row.outputType) : onDraft(row.outputType)
        }
        className={cn(
          "flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition-colors",
          generating
            ? "cursor-progress border-(--ai-border) bg-(--ai-bg)"
            : interactive
              ? "border-(--border-subtle) bg-(--surface-card) hover:bg-(--surface-warm-soft)"
              : "cursor-not-allowed border-(--border-subtle) bg-(--surface-warm-soft)/50",
        )}
      >
        {body}
      </button>
    </li>
  );
}
