import Image from "next/image";

import { cn } from "@/lib/utils";

import { ILLUSTRATIONS, type IllustrationName } from "./registry";

/** Max display width in px. Assets are exported at roughly 2x these. */
const SIZE_PX = { xs: 64, sm: 96, md: 144, lg: 224 } as const;

export type IllustrationSize = keyof typeof SIZE_PX;

interface IllustrationProps {
  name: IllustrationName;
  size?: IllustrationSize;
  className?: string;
  priority?: boolean;
}

/**
 * Decorative brand illustration for empty, success and waiting states.
 *
 * Always `alt=""` and `aria-hidden`: the surrounding heading carries the
 * meaning. The art is navy line work, so in dark mode it sits on a soft cream
 * plate; assets drawn for a dark surface (`onDark`) skip the plate.
 */
export function Illustration({
  name,
  size = "md",
  className,
  priority,
}: IllustrationProps) {
  const asset = ILLUSTRATIONS[name];
  const maxWidth = SIZE_PX[size];

  return (
    <Image
      src={`/illustrations/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={asset.width}
      height={asset.height}
      sizes={`${maxWidth}px`}
      priority={priority}
      draggable={false}
      style={{ width: "100%", maxWidth, height: "auto" }}
      className={cn(
        "pointer-events-none mx-auto select-none",
        !asset.onDark && "dark:rounded-3xl dark:bg-(--cream-100) dark:p-2",
        className,
      )}
    />
  );
}
