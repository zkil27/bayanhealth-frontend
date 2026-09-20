import Image from "next/image";
interface AppLogoProps {
  width: number;
  height: number;
  type: "withText" | "logoOnly";
  className?: string;
}

const logoMap = {
  withText: "/BayanHealthLogoWithText2.svg",
  logoOnly: "/BayanHealthLogo.svg",
};

/**
 * The mark, sized by width with its aspect ratio preserved.
 *
 * The size is applied as an inline style, not a class. It used to be
 * ``className={cn(`h-auto w-[${width}px]`)}`` — a class assembled at runtime,
 * which Tailwind v4's scanner reads source text to find and therefore never
 * emitted, so the width silently did nothing. Paired with `height={0}` on
 * `next/image` that left the logo's box unreliable; the nav rails were the most
 * visible casualty. `AppLogoInHeader` below never had the bug because its
 * classes are static.
 *
 * `height` only feeds `next/image`'s intrinsic ratio, and one caller passes `0`
 * for it, so it falls back to `width`; the rendered height is always `auto` off
 * the SVG's own ratio.
 */
export function AppLogo({
  width,
  height,
  type = "logoOnly",
  className,
}: AppLogoProps) {
  const logoType = logoMap[type];
  return (
    <Image
      src={logoType}
      alt=""
      width={width}
      height={height || width}
      style={{ width, height: "auto" }}
      className={className}
      unoptimized
    />
  );
}

export function AppLogoInHeader() {
  return (
    <>
      <Image
        src={logoMap["logoOnly"]}
        alt=""
        width={40}
        height={40}
        className="block h-10 w-auto sm:hidden"
        priority
        unoptimized
      />
      <Image
        src={logoMap["withText"]}
        alt=""
        width={120}
        height={40}
        className="hidden h-10 w-auto sm:block"
        priority
        unoptimized
      />
    </>
  );
}
