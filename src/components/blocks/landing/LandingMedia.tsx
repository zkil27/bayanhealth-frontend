import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * A photograph slot on the landing page.
 *
 * The design places three photographs here — a lola and her apo on a video
 * call, a family at home, a health worker at a community session. None of them
 * exist in this repository, and none of the placeholder images that do exist
 * (`authPlaceholderImage.jpeg`, `medicinePlaceholder.jpg`, ...) depict any of
 * those things.
 *
 * So rather than dress an unrelated stock photo up as BayanHealth's own
 * photography, an empty slot renders as a branded panel: it holds the exact
 * space and aspect ratio the real photograph will occupy, reads as deliberate
 * rather than broken, and keeps the layout honest until the shoot lands. Pass
 * `src` once a real asset is in `public/` and the panel is replaced.
 *
 * `alt` is required either way. It is written for the intended photograph, so
 * the accessible description does not have to be revisited when the file
 * arrives.
 */
export function LandingMedia({
  src,
  alt,
  className,
  imageClassName,
  priority,
  sizes,
  children,
}: {
  /** Path under `public/`. Absent renders the branded placeholder panel. */
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
  /** Overlaid content, e.g. the hero's availability badge. */
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="landing-media"
      data-placeholder={src ? undefined : "true"}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] bg-(--surface-brand-soft)",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes ?? "(min-width: 1024px) 50vw, 100vw"}
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        /*
          Decorative stand-in. `role="img"` with the intended alt text keeps the
          slot describable to assistive technology, so the page reads the same
          before and after the photograph is dropped in.
        */
        <div
          role="img"
          aria-label={alt}
          className="absolute inset-0 bg-gradient-to-br from-(--surface-brand-soft) via-(--surface-accent-soft) to-(--surface-sunken)"
        >
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_30%_25%,var(--teal-200),transparent_55%),radial-gradient(circle_at_75%_70%,var(--navy-200),transparent_50%)]" />
        </div>
      )}
      {children}
    </div>
  );
}
