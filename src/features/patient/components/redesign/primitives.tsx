import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookUser,
  House,
  MessageSquareText,
  User,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared visual primitives for the Tagalog patient redesign (Figma "hardog"
 * screens S1–S5, M1–M4, P1–P2, Y1).
 *
 * Presentation only — these carry no data fetching or navigation. They are
 * styled entirely against the authoritative BayanHealth brand tokens in
 * `styles/bayanhealth-tokens.css` (same approach as
 * `features/booking/components/BrandUI.tsx`), so a later wire-up into the live
 * routes only has to swap in real data and handlers.
 */

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

/* ------------------------------------------------------------------ Screen -- */

/**
 * The 360px device frame every redesign screen renders inside. `relative` so a
 * {@link BottomNav} can sit absolutely at the bottom edge.
 */
export function Screen({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex w-[360px] shrink-0 flex-col overflow-hidden rounded-(--radius-card) border border-(--border-default) bg-(--surface-page) text-(--text-body)",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Button -- */

type ButtonVariant = "primary" | "outline" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const buttonBySize: Record<ButtonSize, string> = {
  sm: "h-11 px-5 text-[15px]",
  md: "h-12 px-5 text-[16px]",
  lg: "h-[52px] px-6 text-[16px]",
};

const buttonByVariant: Record<ButtonVariant, string> = {
  primary:
    "bg-(--action-primary) text-(--action-primary-text) shadow-(--shadow-btn-inset) hover:bg-(--action-primary-hover)",
  outline:
    "border border-(--action-primary) text-(--status-available-fg) hover:bg-(--surface-accent-soft)",
  danger:
    "bg-(--danger-border) text-(--text-on-brand) shadow-(--shadow-btn-inset) hover:brightness-95",
  ghost: "text-(--text-muted) hover:text-(--text-heading)",
};

/** Shared class string for {@link BrandButton} and {@link BrandLinkButton}. */
export function brandButtonClass({
  variant = "primary",
  size = "md",
  full,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
} = {}) {
  return cn(
    "relative inline-flex items-center justify-center gap-2 rounded-(--radius-pill) font-bold disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0",
    // One interaction for every brand button — colour shift *and* the same
    // small lift the cards use, so "Consult Now" and "Book for Later" (and
    // every other CTA) answer the pointer identically instead of one changing
    // shade while the next only changed background. `active:` returns it to
    // rest so a press reads as a press.
    "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-(--shadow-md) active:translate-y-0 active:shadow-(--shadow-sm) disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    buttonBySize[size],
    buttonByVariant[variant],
    full && "w-full",
    focusRing,
    className,
  );
}

export function BrandButton({
  variant = "primary",
  size = "md",
  full,
  iconLeft,
  iconRight,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}) {
  return (
    <button
      className={brandButtonClass({ variant, size, full, className })}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}

/** A Next `Link` styled as a {@link BrandButton} — for wired CTAs. */
export function BrandLinkButton({
  href,
  variant = "primary",
  size = "md",
  full,
  iconLeft,
  iconRight,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={brandButtonClass({ variant, size, full, className })}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  );
}

/* --------------------------------------------------------------- IconBadge -- */

type BadgeTone =
  | "teal"
  | "tealSolid"
  | "navy"
  | "navySolid"
  | "red"
  | "redSolid"
  | "neutral"
  | "cream";

const iconBadgeByTone: Record<BadgeTone, string> = {
  teal: "bg-(--surface-accent-soft) text-(--status-available-fg)",
  tealSolid: "bg-(--action-primary) text-(--action-primary-text)",
  navy: "bg-(--surface-brand-soft) text-(--text-heading)",
  navySolid: "bg-(--surface-brand) text-(--text-on-brand)",
  red: "bg-(--danger-bg) text-(--danger-fg)",
  redSolid: "bg-(--danger-border) text-(--text-on-brand)",
  neutral: "bg-(--gray-bg) text-(--gray-fg)",
  cream: "bg-(--surface-card) border border-(--border-subtle) text-(--status-available-fg)",
};

export function IconBadge({
  tone = "teal",
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) [&_svg]:size-[22px]",
        iconBadgeByTone[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Chip -- */

type ChipTone = "safe" | "pending" | "danger" | "neutral" | "info";

const chipByTone: Record<ChipTone, string> = {
  safe: "bg-(--surface-accent-soft) text-(--status-available-fg)",
  pending: "bg-(--status-soon-bg) text-(--status-soon-fg)",
  danger: "bg-(--danger-bg) text-(--danger-fg)",
  neutral: "bg-(--gray-bg) text-(--gray-fg)",
  info: "bg-(--surface-brand-soft) text-(--text-heading)",
};

export function Chip({
  tone = "neutral",
  icon,
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: ChipTone; icon?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-(--radius-pill) px-2.5 py-1 text-[14px] font-bold [&_svg]:size-3",
        chipByTone[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- Card --- */

/**
 * The standard hover for an interactive card — a small lift and a deeper
 * shadow, matching the landing surfaces (`FeaturesSection`, `MedicalHubSection`).
 * Applied to cards that are themselves a link or button; static containers do
 * not take it. Honours reduced-motion.
 */
export const cardHoverClass =
  "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-(--shadow-md) motion-reduce:transition-none motion-reduce:hover:translate-y-0";

type CardVariant = "outlined" | "floating";

const cardByVariant: Record<CardVariant, string> = {
  // The historical card: a hairline stroke and a tight warm shadow. Still the
  // default — nothing changes unless a caller opts in.
  outlined:
    "border border-(--border-subtle) bg-(--surface-card) shadow-(--shadow-card)",
  // The soft-clinical surface: depth comes from a wide, diffuse shadow instead
  // of a border, so a card reads as lifted off the page rather than boxed in.
  // Keeps a near-invisible stroke so it still has an edge on a busy ground.
  floating:
    "border border-(--border-subtle)/60 bg-(--surface-card) shadow-(--shadow-float)",
};

export function Card({
  variant = "outlined",
  className,
  children,
  ...props
}: ComponentProps<"div"> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        "rounded-(--radius-card)",
        cardByVariant[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Uppercase muted section label used above the timeline / document groups. */
export function SectionLabel({
  className,
  children,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[14px] font-bold tracking-[0.06em] text-(--text-subtle) uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/* ----------------------------------------------------------------- Avatar --- */

export function Avatar({
  size = 44,
  tone = "brand",
  className,
  children,
}: {
  size?: number;
  /**
   * `brand` — solid navy, for the page greeting where it is the anchor.
   * `soft` — navy tint on a light fill, for list rows (recent visits) where a
   * solid badge per row would pull the eye down the column.
   */
  tone?: "brand" | "soft";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-(--radius-pill) font-bold",
        tone === "soft"
          ? "bg-(--surface-brand-soft) text-(--text-heading)"
          : "bg-(--surface-brand) text-(--text-on-brand)",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- Toggle --- */

/** Read-only visual switch (the redesign screens are presentational). */
export function Toggle({ on = false }: { on?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors",
        on ? "bg-(--action-primary)" : "bg-(--border-default)",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-(--radius-pill) bg-(--surface-raised) shadow-(--shadow-xs) transition-all",
          on ? "left-[18px]" : "left-0.5",
        )}
      />
    </span>
  );
}

/* -------------------------------------------------------------- SheetShell -- */

/**
 * Bottom-sheet container for the M1–M4 modals: rounded top corners, grabber,
 * `tone="danger"` adds the red top rule from M3.
 */
export function SheetShell({
  tone = "default",
  className,
  children,
}: {
  tone?: "default" | "danger";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-[360px] shrink-0 flex-col rounded-t-(--radius-lg) bg-(--surface-card) px-5 pt-2.5 pb-6 shadow-(--shadow-lg)",
        tone === "danger" && "border-t-4 border-(--danger-border)",
        className,
      )}
    >
      <span className="mx-auto h-[5px] w-11 rounded-full bg-(--border-default)" />
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- BottomNav -- */

const NAV_ITEMS = [
  { id: "home", label: "Home", Icon: House },
  // `BookUser`, not `HeartPulse`: the Figma tab bar draws Health as the
  // card-with-a-person glyph, and the live `NavBar` uses the same one, so the
  // preview and the shipped nav do not disagree about what Health looks like.
  { id: "health", label: "Health", Icon: BookUser },
  { id: "book", label: "Book", Icon: Video },
  { id: "chat", label: "Chat", Icon: MessageSquareText },
  { id: "profile", label: "Profile", Icon: User },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"];

/** The floating teal tab bar; the active item expands into a white label pill. */
export function BottomNav({ active }: { active: NavId }) {
  return (
    <nav className="absolute inset-x-4 bottom-4 flex h-16 items-center justify-between rounded-(--radius-card) bg-(--action-primary) px-3">
      {NAV_ITEMS.map(({ id, label, Icon }) =>
        id === active ? (
          <span
            key={id}
            aria-current="page"
            className="flex h-11 items-center gap-1.5 rounded-(--radius-pill) bg-(--surface-raised) px-4 text-[15px] font-bold text-(--text-heading)"
          >
            <Icon className="size-[21px]" />
            {label}
          </span>
        ) : (
          <span
            key={id}
            className="flex size-11 items-center justify-center rounded-(--radius-pill) text-(--text-on-brand)/90"
          >
            <Icon className="size-[22px]" />
          </span>
        ),
      )}
    </nav>
  );
}

/* ---------------------------------------------------------- SegmentedTabs --- */

export interface SegmentedTab<Id extends string = string> {
  id: Id;
  label: string;
}

/**
 * The recessed pill tab strip — a warm track with a raised white pill on the
 * active tab. Promoted from the private `HealthTabs` in `PatientHealthView`,
 * which was the only interactive, accessible copy of a pattern that had been
 * re-typed in three places.
 *
 * Scrolls horizontally on a narrow viewport (`-mx-4 … overflow-x-auto`) and
 * fills the row from `sm` up. Proper `role="tablist"` / `role="tab"` /
 * `aria-selected`. Pass `size="sm"` for the tighter home-panel variant.
 */
export function SegmentedTabs<Id extends string>({
  tabs,
  active,
  onChange,
  size = "md",
  ariaLabel,
  className,
}: {
  tabs: ReadonlyArray<SegmentedTab<Id>>;
  active: Id;
  onChange: (id: Id) => void;
  size?: "sm" | "md";
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full min-w-0 gap-1 overflow-x-auto rounded-(--radius-pill) bg-(--surface-warm) sm:gap-1.5",
        size === "sm" ? "p-1" : "p-1 sm:p-1.5",
        className,
      )}
      style={{ scrollbarWidth: "none" }}
    >
      {tabs.map(({ id, label }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-1 min-w-0 items-center justify-center rounded-(--radius-pill) transition-colors",
              focusRing,
              size === "sm"
                ? "px-2 py-1.5 text-[12.5px] sm:px-3 sm:text-[13.5px]"
                : "px-2.5 py-1.5 text-[13px] sm:px-3.5 sm:py-2 sm:text-[14.5px]",
              isActive
                ? "bg-(--surface-card) font-bold text-(--text-heading) shadow-(--shadow-xs)"
                : "font-semibold text-(--text-muted) hover:text-(--text-heading)",
            )}
          >
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- SegTabs ----- */

/**
 * Static, presentational pill segmented control for the Figma preview screens.
 * The live, interactive version is {@link SegmentedTabs}.
 */
export function SegTabs({
  tabs,
  active,
  className,
}: {
  tabs: string[];
  active: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1.5 rounded-(--radius-pill) bg-(--surface-warm) p-1.5",
        className,
      )}
    >
      {tabs.map((tab) => (
        <span
          key={tab}
          className={cn(
            "flex flex-1 items-center justify-center rounded-(--radius-pill) px-3 py-2 text-[15px] transition-colors",
            tab === active
              ? "bg-(--surface-card) font-bold text-(--text-heading) shadow-(--shadow-xs)"
              : "font-semibold text-(--text-muted)",
          )}
        >
          {tab}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ SectionHeading -- */

/**
 * A section title. `tone="accent"` tints it teal — the soft-clinical surfaces
 * lead with a coloured heading rather than near-black ink. Renders `h2` by
 * default; pass `as` for the right level in context.
 */
export function SectionHeading({
  tone = "heading",
  as: Tag = "h2",
  className,
  children,
  ...props
}: ComponentProps<"h2"> & {
  tone?: "heading" | "accent";
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <Tag
      className={cn(
        "text-[16px] font-bold tracking-[-0.01em]",
        tone === "accent"
          ? "text-(--status-available-fg)"
          : "text-(--text-heading)",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* --------------------------------------------------------------- SeeAllLink -- */

/**
 * The one "see all" affordance — label plus a small circular arrow button. One
 * spelling replaces four (`HomePanel`, `PatientHome`, `PatientHomeView`,
 * `DoctorList` each had their own). The invariant they shared was
 * `font-semibold text-(--text-heading) hover:text-(--text-link-hover)`.
 */
export function SeeAllLink({
  href,
  label = "View all",
  className,
}: {
  href: ComponentProps<typeof Link>["href"];
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-(--text-heading) transition-colors hover:text-(--text-link-hover)",
        focusRing,
        className,
      )}
    >
      {label}
      <span className="flex size-6 items-center justify-center rounded-(--radius-pill) bg-(--surface-warm) transition-colors group-hover:bg-(--surface-accent-soft)">
        <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

/* --------------------------------------------------------------- MetricStat -- */

/**
 * The reference's big-value / small-unit / small-label stat, as used in the
 * profile identity card and the doctor's "today" rail. Renders "Not set" when
 * `value` is undefined so an unknown never reads as a real zero.
 */
export function MetricStat({
  label,
  value,
  unit,
  icon,
  className,
}: {
  label: string;
  value?: string | number;
  unit?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const hasValue = value !== undefined && value !== "";
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="flex items-center gap-1 text-[11px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
        {icon}
        {label}
      </span>
      {hasValue ? (
        <span className="flex items-baseline gap-1 text-[18px] font-bold text-(--text-heading)">
          <span className="truncate">{value}</span>
          {unit ? (
            <span className="text-[12px] font-semibold text-(--text-muted)">
              {unit}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="text-[15px] font-semibold text-(--text-subtle)">
          Not set
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- AccentRow -- */

type AccentTone = "teal" | "navy" | "gold" | "violet" | "danger" | "neutral";

const accentBarByTone: Record<AccentTone, string> = {
  teal: "bg-(--status-available-fg)",
  navy: "bg-(--status-pilot-fg)",
  gold: "bg-(--status-soon-fg)",
  violet: "bg-(--widget-care-border)",
  danger: "bg-(--danger-fg)",
  neutral: "bg-(--gray-fg)",
};

/**
 * A list row marked by a coloured bar on its leading edge — the reference's
 * "examinations" row. `tone` maps to the existing status palette; nothing here
 * invents a severity. When `href` is set the whole row is a link with the
 * standard card hover.
 */
export function AccentRow({
  tone = "neutral",
  title,
  meta,
  trailing,
  href,
  className,
}: {
  tone?: AccentTone;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  href?: ComponentProps<typeof Link>["href"];
  className?: string;
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-0 w-1 rounded-(--radius-pill)",
          accentBarByTone[tone],
        )}
      />
      <span className="min-w-0 flex-1 pl-3">
        <span className="block truncate text-[14px] font-bold text-(--text-heading)">
          {title}
        </span>
        {meta ? (
          <span className="mt-0.5 block truncate text-[12.5px] text-(--text-muted)">
            {meta}
          </span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </>
  );

  const base =
    "relative flex items-center gap-2 rounded-(--radius-widget) border border-(--border-subtle) bg-(--surface-card) px-3 py-2.5";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "hover:border-(--border-strong)",
          cardHoverClass,
          focusRing,
          className,
        )}
      >
        {inner}
      </Link>
    );
  }
  return <div className={cn(base, className)}>{inner}</div>;
}

/** Brand wordmark used on the sign-in / verify screens. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-[-0.01em]", className)}>
      <span className="text-(--text-heading)">Bayan</span>
      <span className="text-(--action-primary)">Health</span>
    </span>
  );
}
