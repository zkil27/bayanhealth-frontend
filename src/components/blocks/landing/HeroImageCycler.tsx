"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The hero visual: a stack of photographs that crossfades between them.
 *
 * All images are mounted and stacked; only opacity changes, so the swap is a
 * GPU-cheap fade with no layout shift. The cycle stops for
 * `prefers-reduced-motion` and settles on the first image. The active image
 * carries `alt`; the rest are `aria-hidden` so assistive tech sees one picture.
 */
export interface HeroImageCyclerProps {
  images: readonly string[];
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Time each image is held, in ms. */
  intervalMs?: number;
  children?: React.ReactNode;
}

export function HeroImageCycler({
  images,
  alt,
  className,
  sizes,
  priority,
  intervalMs = 4500,
  children,
}: HeroImageCyclerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  return (
    <div
      data-slot="hero-image-cycler"
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] bg-(--surface-brand-soft)",
        className,
      )}
    >
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === index ? alt : ""}
          aria-hidden={i === index ? undefined : true}
          fill
          priority={priority && i === 0}
          sizes={sizes ?? "(min-width: 1024px) 50vw, 100vw"}
          className={cn(
            "object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {children}
    </div>
  );
}
