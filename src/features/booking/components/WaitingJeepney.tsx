"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

export type Scene = "day" | "night";

/** Resolves the scene from the active theme: dark mode -> night, light mode -> day. */
export function sceneForTheme(resolvedTheme?: string): Scene {
  return resolvedTheme === "dark" ? "night" : "day";
}

/** @deprecated Kept for backwards compatibility; scene is now derived from theme. */
export function sceneForNow(): Scene {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Whether to start the animation loop automatically.
 * When prefers-reduced-motion is enabled, data saver is on, or the user is on 2G,
 * a crisp still poster is rendered instead of motion.
 */
function shouldAutoplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  return true;
}

/**
 * Decorative waiting-room illustration: a paper-cut jeepney riding through a barangay,
 * shown while an on-demand request waits for a doctor to accept it.
 *
 * Designed as a seamless ambient loop (GIF-like behavior with 24-bit TrueColor video fidelity):
 * - Unpausable & non-interactive: no pause buttons, no tap-to-pause handlers.
 * - Theme-aware: dynamically reflects active theme (dark mode = night scene, light mode = day scene).
 * - Full 16:9 native aspect ratio: preserves uncropped composition and pixel sharpness.
 * - Self-hosted from `/public/video`, high-bitrate H.264 faststart without audio, cross-faded loop seam.
 * - Reduced motion safe: renders a still WebP poster if prefers-reduced-motion is requested.
 */
export function WaitingJeepney({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scene: Scene = mounted ? sceneForTheme(resolvedTheme) : "day";
  const autoPlay = mounted ? shouldAutoplay() : false;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;
    video.play().catch(() => {
      // Autoplay rejection (e.g. iOS low power mode) is handled silently
    });
  }, [scene, autoPlay]);

  return (
    <div
      data-slot="waiting-jeepney"
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-[14px] border border-(--border-subtle) bg-(--surface-warm-soft)",
        className,
      )}
    >
      {mounted ? (
        autoPlay ? (
          <video
            ref={videoRef}
            key={scene}
            aria-hidden="true"
            tabIndex={-1}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            controls={false}
            poster={`/video/jeepney-${scene}-poster.webp`}
            className="pointer-events-none select-none absolute inset-0 size-full object-cover object-center"
          >
            <source src={`/video/jeepney-${scene}.mp4`} type="video/mp4" />
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/video/jeepney-${scene}-poster.webp`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 size-full object-cover object-center"
          />
        )
      ) : null}
    </div>
  );
}
