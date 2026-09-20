import { CARE_TRACKS_CONTENT, type CareTrack } from "./content";

/**
 * "Care for Filipino families, always within reach" — the three ways in.
 *
 * A row of three cards under the audience split. The tracks are named things,
 * not calls to action, so the cards carry no buttons of their own — the page's
 * one prompt to act sits below the stories that follow. General Consultation is
 * the default path the whole page argues for, so its card is the highlighted
 * one and wears the DEFAULT pill.
 */
export function CareTracksSection({ tracks }: { tracks: CareTrack[] }) {
  return (
    <section
      id="care-tracks"
      aria-labelledby="care-tracks-heading"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 lg:px-8 lg:py-20"
    >
      <div className="flex max-w-2xl flex-col gap-2">
        <h2
          id="care-tracks-heading"
          className="font-display text-3xl font-bold text-balance text-(--text-heading) md:text-4xl"
        >
          {CARE_TRACKS_CONTENT.heading}
        </h2>
        <p className="text-[15px] leading-relaxed text-(--text-muted)">
          {CARE_TRACKS_CONTENT.subheading}
        </p>
      </div>

      <ul className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
        {tracks.map((track) => (
          <li
            key={track.id}
            data-slot="care-track"
            data-default={track.isDefault ? "true" : undefined}
            className={`flex h-full flex-col gap-3 rounded-(--radius-card) border p-6 shadow-(--shadow-card) ${
              track.isDefault
                ? "border-(--border-brand) bg-(--surface-brand-soft)"
                : "border-(--border-subtle) bg-(--surface-card)"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`flex size-10 shrink-0 items-center justify-center rounded-(--radius-md) ${
                  track.isDefault
                    ? "bg-(--surface-brand) text-(--text-on-brand)"
                    : track.id === "specialist-referral"
                      ? "bg-(--danger-fg) text-(--surface-card)"
                      : "bg-(--highlight) text-(--text-heading)"
                }`}
              >
                <track.icon className="size-5" />
              </span>
              <h3 className="font-display text-lg font-bold text-(--text-heading)">
                {track.title}
              </h3>
              {track.isDefault && (
                <span className="ml-auto rounded-(--radius-pill) bg-(--surface-accent-soft) px-2.5 py-1 text-[11px] font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
                  Default
                </span>
              )}
            </div>
            <p className="text-[15px] leading-relaxed text-(--text-muted)">
              {track.description}
            </p>
            <p className="mt-auto text-[13px] leading-relaxed text-(--text-subtle)">
              {track.note}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
